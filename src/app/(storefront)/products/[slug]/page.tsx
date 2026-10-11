export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProductHero } from '@/components/product-hero'
import { ProductInfo, type NoteData, type SimilarProduct } from '@/components/product-info'
import { slugify } from '@/lib/utils'
import type { Product } from '@/types/database'

interface ProductPageProps {
    params: Promise<{
        slug: string
    }>
}

type ProductWithRecipe = Product & { recipe?: { description?: string | null } }

function parseNotes(product: ProductWithRecipe): NoteData | undefined {
    const top = product.top_notes?.split(',').map(s => s.trim()).filter(Boolean) || []
    const middle = product.middle_notes?.split(',').map(s => s.trim()).filter(Boolean) || []
    const base = product.base_notes?.split(',').map(s => s.trim()).filter(Boolean) || []

    if (top.length === 0 && middle.length === 0 && base.length === 0) {
        return undefined
    }

    return { top, middle, base }
}

function getBaseName(name: string) {
    return name.replace(/\s*\d+\s*ml\s*/gi, '').trim();
}

export default async function ProductPage({ params }: ProductPageProps) {
    const { slug } = await params
    const supabase = await createClient()

    const { data: products, error } = await supabase
        .from('products')
        .select('*, recipe:recipes(*)')

    if (error || !products) {
        notFound()
    }

    let product = products.find(p => slugify(p.name) === slug)
    if (!product) {
        product = products.find(p => p.id.toString() === slug)
    }
    if (!product) {
        product = products.find(p => p.name === slug)
    }
    if (!product) {
        notFound()
    }

    const baseName = getBaseName(product.name)
    const variants: ProductWithRecipe[] = products.filter(p => getBaseName(p.name) === baseName)

    const primaryVariant = variants.length > 1
        ? variants.reduce((best, v) => {
            const score = (v.description ? 2 : 0) + (v.top_notes ? 1 : 0) + (v.middle_notes ? 1 : 0) + (v.base_notes ? 1 : 0) + (v.image_url ? 1 : 0)
            const bestScore = (best.description ? 2 : 0) + (best.top_notes ? 1 : 0) + (best.middle_notes ? 1 : 0) + (best.base_notes ? 1 : 0) + (best.image_url ? 1 : 0)
            return score > bestScore ? v : best
        }, variants[0])
        : product

    const displayProduct = {
        ...product,
        description: product.description || primaryVariant.description,
        top_notes: product.top_notes || primaryVariant.top_notes,
        middle_notes: product.middle_notes || primaryVariant.middle_notes,
        base_notes: product.base_notes || primaryVariant.base_notes,
    }
    const displayImage = product.image_url || primaryVariant.image_url || ''
    const displayHoverImage = product.hover_image_url || primaryVariant.hover_image_url || undefined

    const notes = parseNotes(displayProduct)
    const totalStock = variants.reduce((sum, v) => sum + v.stock, 0)

    const similar: SimilarProduct[] = [...new Map(
        products
            .filter(p => getBaseName(p.name) !== baseName && product.gender !== null && p.gender === product.gender && p.stock > 0)
            .map(p => [getBaseName(p.name), p] as const)
    ).values()]
        .slice(0, 3)
        .map(p => ({ id: p.id, name: p.name, house: p.recipe?.name, rating: p.fragrantica_score }))

    return (
        <div className="min-h-screen">
            <Navbar />

            <main>
                <ProductHero
                    image={displayImage}
                    hoverImage={displayHoverImage}
                    name={product.name}
                    stockLabel={totalStock > 0 && totalStock <= 3 ? `SON ${totalStock} ADET` : undefined}
                />

                <div className="px-4 md:px-14 max-w-4xl mx-auto py-10 md:py-14">
                    <ProductInfo
                        name={getBaseName(product.name)}
                        description={displayProduct.description || displayProduct.recipe?.description || "Özel üretim el yapımı ve yüksek kalıcılıkta parfüm. Orijinaline en yakın formülasyon."}
                        stock={product.stock}
                        gender={product.gender}
                        bottleSizeMl={product.bottle_size_ml || primaryVariant.bottle_size_ml}
                        notes={notes}
                        dbNotes={displayProduct.notes || primaryVariant.notes}
                        variants={variants}
                        similar={similar}
                    />
                </div>
            </main>
            <Footer />
        </div>
    )
}
