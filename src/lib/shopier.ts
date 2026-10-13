import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import { siteConfig } from '@/data/siteConfig'

// Shopier REST API (https://developer.shopier.com). Shopier has no "checkout for a
// custom cart" endpoint, so each web order becomes a one-off custom listing priced at
// the cart total; the customer pays on that listing and order.created tells us.

const API_BASE = 'https://api.shopier.com/v1'

export function isShopierCheckoutEnabled(): boolean {
    return process.env.SHOPIER_CHECKOUT_ENABLED === 'true' && !!process.env.SHOPIER_PAT
}

async function shopierFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = process.env.SHOPIER_PAT
    if (!token) throw new Error('SHOPIER_PAT is not set')

    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...init.headers,
        },
        cache: 'no-store',
    })

    const text = await res.text()
    if (!res.ok) {
        throw new Error(`Shopier ${init.method || 'GET'} ${path} failed: ${res.status} ${text.slice(0, 300)}`)
    }
    return (text ? JSON.parse(text) : null) as T
}

export interface ShopierProduct {
    id: string
    url: string
}

export async function createOrderListing(params: {
    orderCode: string
    total: number
    summary: string
}): Promise<ShopierProduct> {
    const imageUrl = process.env.SHOPIER_ORDER_IMAGE_URL || `${siteConfig.url}/logo.png`
    return shopierFetch<ShopierProduct>('/products', {
        method: 'POST',
        body: JSON.stringify({
            title: `${siteConfig.name} Sipariş ${params.orderCode}`,
            description: params.summary,
            type: 'physical',
            media: [{ type: 'image', url: imageUrl, placement: 1 }],
            priceData: { currency: 'TRY', price: params.total.toFixed(2) },
            stockQuantity: 1,
            shippingPayer: 'sellerPays',
            customListing: true,
        }),
    })
}

export async function deleteListing(productId: string): Promise<void> {
    await shopierFetch(`/products/${encodeURIComponent(productId)}`, { method: 'DELETE' })
}

/** Subset of the Order model we rely on */
export interface ShopierOrder {
    id: string
    paymentStatus: 'paid' | 'unpaid'
    totals: { total: string }
    shippingInfo?: Record<string, string>
    note?: string
    lineItems: Array<{ productId: string; quantity: number; total: string }>
}

/**
 * Shopier-Signature = hex HMAC-SHA256 of the JSON payload, keyed with the webhook
 * token returned when the subscription was created. Shopier's own Node sample signs
 * JSON.stringify(body), so accept either the raw body or its re-serialized form.
 */
export function verifyShopierSignature(rawBody: string, signature: string | null, token: string): boolean {
    if (!signature || !token) return false

    const candidates = [rawBody]
    try {
        candidates.push(JSON.stringify(JSON.parse(rawBody)))
    } catch {
        return false
    }

    const given = Buffer.from(signature.trim().toLowerCase(), 'utf8')
    return candidates.some(payload => {
        const expected = Buffer.from(createHmac('sha256', token).update(payload, 'utf8').digest('hex'), 'utf8')
        return expected.length === given.length && timingSafeEqual(expected, given)
    })
}
