import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth-guard'
import { createAdminClient } from '@/lib/supabase/admin'

const approveSchema = z.object({
    requestId: z.string().uuid('Geçersiz sipariş.'),
})

/**
 * Dashboard "approve" for a web order: records the sales through
 * process_web_order (FIFO stock deduction, customer, status) — the same path the
 * Shopier webhook uses, so an order is never deducted twice.
 */
export async function POST(request: NextRequest) {
    const auth = await requireAdmin()
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const parsed = approveSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Geçersiz istek.' }, { status: 400 })
    }

    const { data: salesRecorded, error } = await createAdminClient().rpc('process_web_order', {
        p_request_id: parsed.data.requestId,
        p_paid: true,
    })

    if (error) {
        console.error('Order approval failed:', error.message)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ salesRecorded })
}
