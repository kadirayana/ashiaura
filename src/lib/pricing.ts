// Storefront pricing rules — shared by client components and server actions.

/** size_prices row that holds the tester price */
export const TESTER_SIZE_ML = 3
/** Every bottle of this size earns one free tester */
export const GIFT_ELIGIBLE_SIZE_ML = 50

/** size_ml -> price (TRY) */
export type PriceMap = Record<number, number>

export type CartItemKind = 'bottle' | 'tester'

export function getBaseName(name: string): string {
    return name.replace(/\s*\d+\s*ml\s*/gi, '').trim()
}

export function getSizeMl(p: { name: string; bottle_size_ml?: number | null }): number {
    if (p.bottle_size_ml) return p.bottle_size_ml
    const match = p.name.match(/(\d+)\s*ml/i)
    return match ? parseInt(match[1]) : 0
}

export function bottlePrice(prices: PriceMap, p: { name: string; bottle_size_ml?: number | null }): number | null {
    const size = getSizeMl(p)
    if (!size || size === TESTER_SIZE_ML) return null
    return prices[size] ?? null
}

export function testerPrice(prices: PriceMap): number | null {
    return prices[TESTER_SIZE_ML] ?? null
}

export function giftTesterCount(items: Array<{ kind?: CartItemKind; bottle_size_ml?: number | null; name: string; quantity: number }>): number {
    return items
        .filter(i => (i.kind ?? 'bottle') === 'bottle' && getSizeMl(i) === GIFT_ELIGIBLE_SIZE_ML)
        .reduce((sum, i) => sum + i.quantity, 0)
}

export function formatPrice(value: number): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value)
}
