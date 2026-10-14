import { getBaseName } from '@/lib/pricing'

// A scent can exist as several product rows (sizes, or a sold-out duplicate of the
// same size). These helpers pick the row the storefront should show and sell.

interface CatalogRow {
    stock: number
    image_url: string | null
    hover_image_url?: string | null
    fragrantica_score?: number | null
}

/**
 * Best row to represent a scent family: in stock first, then with a photo, then
 * best rated. If it has no photo, it borrows one from another row of the family.
 */
export function pickRepresentative<T extends CatalogRow>(variants: T[]): T {
    const rank = (v: T) => (v.stock > 0 ? 2 : 0) + (v.image_url ? 1 : 0)
    const best = variants.reduce((a, b) =>
        rank(b) > rank(a) || (rank(b) === rank(a) && (b.fragrantica_score || 0) > (a.fragrantica_score || 0)) ? b : a
    )
    if (best.image_url) return best
    const withImage = variants.find(v => v.image_url)
    return withImage
        ? { ...best, image_url: withImage.image_url, hover_image_url: withImage.hover_image_url ?? best.hover_image_url }
        : best
}

interface NamedRow {
    name: string
    ashi_name?: string | null
    is_inspired?: boolean
}

/** Name shown in the storefront: the Ashi name, or the stored name until one is set */
export function productTitle(p: NamedRow): string {
    return p.ashi_name?.trim() || getBaseName(p.name)
}

/** "<original> parfümünden esinlenildi", or null for Ashi's own scents */
export function inspiredLine(p: NamedRow): string | null {
    if (p.is_inspired === false) return null
    return `${getBaseName(p.name)} parfümünden esinlenildi`
}

/** Lowercase without accents or dotted/dotless i differences: "Althaïr" ~ "althair", "İris" ~ "iris" */
function searchKey(s: string): string {
    return s.toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Search matches both the Ashi name and the original perfume name */
export function matchesSearch(p: NamedRow, query: string): boolean {
    const q = searchKey(query.trim())
    return [p.name, p.ashi_name ?? ''].some(s => searchKey(s).includes(q))
}
