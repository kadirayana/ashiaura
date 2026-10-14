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
