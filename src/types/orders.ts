import type { CartItemKind } from '@/lib/pricing'

// Stored as JSON after the __CART_METADATA__: marker in product_requests.request_details.
// Orders placed before pricing existed lack kind/unit_price/line_total/gift_testers.
export interface CartOrderItem {
    product_id: string
    kind?: CartItemKind
    name: string
    quantity: number
    bottle_size_ml?: number | null
    unit_cost?: number | null
    unit_price?: number
    line_total?: number
}

export interface CartOrderMeta {
    type: 'cart_order'
    total_bottles: number
    total_testers?: number
    total_price?: number
    address_or_notes?: string
    items: CartOrderItem[]
    gift_testers?: string[]
}
