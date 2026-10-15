import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteListing, verifyShopierSignature, type ShopierOrder } from '@/lib/shopier'

// Shopier expects 200 within 5 seconds and retries otherwise, so every
// non-authentication outcome (including "not ours") answers 200.
export async function POST(request: NextRequest) {
    const rawBody = await request.text()
    // Trimmed: a pasted env value can carry a stray newline or space
    const token = (process.env.SHOPIER_WEBHOOK_TOKEN || '').trim()
    if (!token) {
        // 503 so Shopier keeps retrying until the deployment is configured
        console.error('Shopier webhook: SHOPIER_WEBHOOK_TOKEN is not set')
        return NextResponse.json({ error: 'webhook token not configured' }, { status: 503 })
    }

    if (!verifyShopierSignature(rawBody, request.headers.get('shopier-signature'), token)) {
        console.warn('Shopier webhook: invalid signature')
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }

    const event = request.headers.get('shopier-event')
    if (event !== 'order.created') {
        return NextResponse.json({ ok: true, ignored: event })
    }

    let order: ShopierOrder
    try {
        order = JSON.parse(rawBody)
    } catch {
        return NextResponse.json({ error: 'invalid json' }, { status: 400 })
    }

    if (order.paymentStatus !== 'paid') {
        return NextResponse.json({ ok: true, ignored: 'unpaid' })
    }

    const productIds = (order.lineItems || []).map(i => i.productId).filter(Boolean)
    if (productIds.length === 0) {
        return NextResponse.json({ ok: true, ignored: 'no line items' })
    }

    const admin = createAdminClient()
    const { data: webOrder, error } = await admin
        .from('product_requests')
        .select('id, total_price, payment_status, shopier_product_id')
        .in('shopier_product_id', productIds)
        .limit(1)
        .maybeSingle()

    if (error) {
        console.error('Shopier webhook lookup error:', error)
        // Non-200 so Shopier retries once the database is reachable again
        return NextResponse.json({ error: 'lookup failed' }, { status: 500 })
    }

    // A regular Shopier store sale, not a web checkout
    if (!webOrder) {
        return NextResponse.json({ ok: true, ignored: 'not a web order' })
    }

    // Retried delivery
    if (webOrder.payment_status === 'paid' || webOrder.payment_status === 'review') {
        return NextResponse.json({ ok: true, duplicate: true })
    }

    const paidTotal = Number(order.totals?.total)
    const expected = Number(webOrder.total_price)
    const amountOk = Number.isFinite(paidTotal) && paidTotal + 0.01 >= expected

    const { error: updateErr } = await admin
        .from('product_requests')
        .update({
            payment_status: amountOk ? 'paid' : 'review',
            shopier_order_id: order.id,
            paid_at: new Date().toISOString(),
            shipping_info: { ...(order.shippingInfo || {}), note: order.note || '' },
        })
        .eq('id', webOrder.id)

    if (updateErr) {
        console.error('Shopier webhook update error:', updateErr)
        return NextResponse.json({ error: 'update failed' }, { status: 500 })
    }

    if (!amountOk) {
        console.warn(`Shopier webhook: order ${order.id} paid ${paidTotal}, expected ${expected}`)
    } else {
        // Paid in full: record the sales and deduct stock right away. If it fails
        // (e.g. a bottle sold out meanwhile) the order stays pending as "Ödendi"
        // for the workshop to approve by hand.
        const { error: processErr } = await admin.rpc('process_web_order', {
            p_request_id: webOrder.id,
            p_paid: true,
        })
        if (processErr) console.error('Shopier webhook: sales could not be recorded:', processErr.message)
    }

    // The one-off listing has done its job; failure here only leaves a sold-out listing behind
    if (webOrder.shopier_product_id) {
        await deleteListing(webOrder.shopier_product_id).catch(err =>
            console.error('Shopier listing cleanup failed:', err)
        )
    }

    return NextResponse.json({ ok: true })
}
