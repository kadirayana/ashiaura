export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProductHero } from '@/components/product-hero'
import { ProductInfo, type NoteData } from '@/components/product-info'
import Link from 'next/link'
import { slugify } from '@/lib/utils'
import { productTitle, inspiredLine } from '@/lib/catalog'
import type { Metadata } from 'next'
import { getSizeMl } from '@/lib/pricing'
import type { Product, Recipe } from '@/types/database'

interface ProductPageProps {
    params: Promise<{
        slug: string
    }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

type ProductWithRecipe = Product & { recipe: Recipe | null }

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

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
    const { slug } = await params
    const supabase = await createClient()
    let { data } = await supabase.from('products').select('name, ashi_name, is_inspired')
    if (!data) ({ data } = await supabase.from('products').select('name'))
    const rows = (data || []) as Array<{ name: string; ashi_name?: string | null; is_inspired?: boolean }>
    const found = rows.find(p => slugify(p.name) === slug)
    if (!found) return {}

    const family = rows.filter(p => getBaseName(p.name) === getBaseName(found.name))
    const named = { ...found, ashi_name: found.ashi_name || family.find(p => p.ashi_name)?.ashi_name }
    const title = productTitle(named)
    const inspired = inspiredLine(named)
    return {
        title: inspired ? `${title} — ${getBaseName(found.name)} esintisi | Ashi Aura` : `${title} | Ashi Aura`,
        description: inspired
            ? `${title}: ${inspired}. İzmir'de küçük partilerle, elle üretilen parfüm.`
            : `${title}: İzmir'de küçük partilerle, elle üretilen Ashi Aura kokusu.`,
    }
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
    const { slug } = await params
    const catalogParams = await searchParams
    const supabase = await createClient()

    const { data: products, error } = await supabase
        .from('products')
        .select('*, recipe:recipes(*)')

    if (error || !products) {
        notFound()
    }

    const normalizedProducts: ProductWithRecipe[] = products.map(product => ({
        ...product,
        recipe: Array.isArray(product.recipe) ? product.recipe[0] || null : product.recipe,
    }))

    let found = normalizedProducts.find(p => slugify(p.name) === slug)
    if (!found) {
        found = normalizedProducts.find(p => p.id.toString() === slug)
    }
    if (!found) {
        found = normalizedProducts.find(p => p.name === slug)
    }
    if (!found) {
        notFound()
    }
    const requested = found
    const backParams = new URLSearchParams()
    for (const [key, value] of Object.entries(catalogParams)) {
        if (typeof value === 'string') backParams.set(key, value)
        else if (Array.isArray(value)) value.forEach(item => backParams.append(key, item))
    }
    const backQuery = backParams.toString()

    const baseName = getBaseName(requested.name)
    const variants = normalizedProducts.filter(p => getBaseName(p.name) === baseName)

    // Some scents have a sold-out duplicate row of the same size; sell the row that has stock
    const product = requested.stock > 0
        ? requested
        : variants.find(v => v.stock > 0 && getSizeMl(v) === getSizeMl(requested)) ?? requested

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

    const similar = [...new Map(
        normalizedProducts
            .filter(p => getBaseName(p.name) !== baseName && product.gender !== null && p.gender === product.gender && p.stock > 0)
            .map(p => [getBaseName(p.name), p] as const)
    ).values()].slice(0, 3)

    // Any row of the family may carry the Ashi name
    const named = { ...product, ashi_name: product.ashi_name || variants.find(v => v.ashi_name)?.ashi_name }
    const title = productTitle(named)
    const inspired = inspiredLine(named)
    const titleLang = named.ashi_name ? 'tr' : 'en'

    const backHref = `/products${backQuery ? `?${backQuery}` : ''}`
    const sizeMl = product.bottle_size_ml || primaryVariant.bottle_size_ml
    const description = displayProduct.description || displayProduct.recipe?.description

    return (
        <div className="min-h-screen">
            <Navbar />

            <main className="max-w-[1320px] mx-auto px-6 lg:px-12 pt-7 pb-24 flex flex-col gap-24">
                <div className="flex flex-col gap-7">
                    <nav aria-label="Sayfa yolu" className="font-storefront-mono text-xs tracking-[0.14em] text-sand flex flex-wrap gap-2.5">
                        <Link href="/" className="hover:text-ink">ANA SAYFA</Link>
                        <span aria-hidden="true">/</span>
                        <Link href={backHref} className="hover:text-ink">KOLEKSİYON</Link>
                        <span aria-hidden="true">/</span>
                        <span lang={titleLang} className="text-ink uppercase">{title}</span>
                    </nav>

                    <div className="flex flex-wrap items-start gap-12 lg:gap-16">
                        <div className="flex-[1_1_520px] min-w-0">
                            <ProductHero
                                image={displayImage}
                                hoverImage={displayHoverImage}
                                name={title}
                                caption={sizeMl ? `${sizeMl} ML · EDP` : 'EAU DE PARFUM'}
                                stockLabel={totalStock > 0 && totalStock <= 3 ? `SON ${totalStock} ADET` : undefined}
                            />
                        </div>
                        <div className="flex-[1_1_420px] min-w-0">
                            <ProductInfo
                                productId={product.id}
                                name={title}
                                inspired={inspired}
                                nameLang={titleLang}
                                stock={product.stock}
                                gender={product.gender}
                                bottleSizeMl={sizeMl}
                                notes={notes}
                                dbNotes={displayProduct.notes || primaryVariant.notes}
                                variants={variants}
                                batchNumber={product.batch_number}
                                rating={product.fragrantica_score}
                            />
                        </div>
                    </div>
                </div>

                <section className="flex flex-wrap gap-x-16 gap-y-6 border-t border-hairline pt-16">
                    <p className="flex-[1_1_240px] font-storefront-mono text-xs tracking-[0.3em] text-tan-ink">KOKUNUN HİKAYESİ</p>
                    <p className="flex-[2_1_520px] min-w-0 italic text-[28px] md:text-[34px] leading-snug whitespace-pre-line">
                        {description || 'El yapımı, küçük partilerle hazırlanan bir koku. Her şişe tek tek tartılır, formüle edilir ve deftere işlenir.'}
                    </p>
                </section>

                {similar.length > 0 && (
                    <section className="flex flex-col gap-8">
                        <div className="flex flex-wrap justify-between items-baseline gap-3">
                            <h2 className="italic font-normal text-5xl">Benzer kokular</h2>
                            <Link href={backHref} className="font-storefront-mono text-xs tracking-[0.2em] border-b border-ink pb-1 hover:text-tan-ink hover:border-tan-ink">
                                TÜMÜNÜ GÖR →
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-ink">
                            {similar.map(s => (
                                <Link
                                    key={s.id}
                                    href={`/products/${slugify(s.name)}${backQuery ? `?${backQuery}` : ''}`}
                                    className="py-6 sm:px-6 sm:first:pl-0 border-b sm:border-b-0 sm:border-l sm:first:border-l-0 border-hairline flex justify-between items-baseline gap-4 hover:text-tan-ink"
                                >
                                    <span className="flex flex-col gap-1">
                                        <span lang={s.ashi_name ? 'tr' : 'en'} className="font-storefront-mono text-[15px] font-bold tracking-[0.08em] uppercase">{productTitle(s)}</span>
                                        {inspiredLine(s) && <span className="italic text-lg text-umber">{inspiredLine(s)}</span>}
                                    </span>
                                    <span className="font-storefront-mono text-xs">→</span>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>
            <Footer />
        </div>
    )
}
