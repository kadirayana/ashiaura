"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { slugify, genderLabel, inspiredByLabel } from '@/lib/utils'
import type { Product, Recipe } from '@/types/database'
import { useCart } from '@/context/CartContext'
import { usePricing } from '@/context/PricingContext'
import { bottlePrice, testerPrice, formatPrice, getBaseName, getSizeMl } from '@/lib/pricing'
import { BottleIllustration } from '@/components/storefront-ui/bottle-illustration'

type ProductWithRecipe = Product & {
    recipe: Recipe | null
}

interface ProductCardProps {
    product: ProductWithRecipe
    variants?: ProductWithRecipe[]  // Other size variants in the same family
}

function firstNotes(value: string | null, max = 3): string | null {
    const notes = value?.split(',').map(s => s.trim()).filter(Boolean) || []
    return notes.length ? notes.slice(0, max).join(', ').toLocaleLowerCase('tr') : null
}

export function ProductCard({ product, variants }: ProductCardProps) {
    const [showHandmade, setShowHandmade] = useState(false)
    const searchParams = useSearchParams()
    const { addToCart } = useCart()
    const { prices, onlinePayment } = usePricing()
    const hasHandmadeImage = !!product.hover_image_url

    const displayName = getBaseName(product.name) || product.name
    const totalStock = variants && variants.length > 1
        ? variants.reduce((sum, v) => sum + v.stock, 0)
        : product.stock
    const family = variants && variants.length > 1
        ? [...variants].sort((a, b) => getSizeMl(a) - getSizeMl(b))
        : [product]
    const sizes = [...new Set(family.map(getSizeMl).filter(Boolean))]

    const familyPrices = family
        .map(v => bottlePrice(prices, v))
        .filter((p): p is number => p !== null)
    const minPrice = familyPrices.length ? Math.min(...familyPrices) : null
    const hasPriceRange = new Set(familyPrices).size > 1
    // The card may represent a sold-out size while other sizes are in stock
    const addTarget = product.stock > 0 ? product : family.find(v => v.stock > 0)
    const tester = testerPrice(prices)
    const canAdd = !!addTarget && (bottlePrice(prices, addTarget) !== null || !onlinePayment)

    const notes = [
        ['ÜST', firstNotes(product.top_notes)],
        ['ORTA', firstNotes(product.middle_notes)],
        ['ALT', firstNotes(product.base_notes)],
    ].filter((row): row is [string, string] => !!row[1])

    const catalogQuery = searchParams.toString()
    const productHref = `/products/${slugify(product.name)}${catalogQuery ? `?${catalogQuery}` : ''}`

    return (
        <article className="group h-full flex flex-col">
            <Link
                href={productHref}
                className="block relative aspect-[4/3] overflow-hidden bg-linen"
                onMouseEnter={() => hasHandmadeImage && setShowHandmade(true)}
                onMouseLeave={() => setShowHandmade(false)}
            >
                {product.image_url ? (
                    <>
                        <Image
                            src={product.image_url}
                            alt={inspiredByLabel(displayName)}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className={`object-contain p-4 pb-12 transition-all duration-700 group-hover:scale-[1.03] ${showHandmade ? 'opacity-0' : 'opacity-100'}`}
                        />
                        {product.hover_image_url && (
                            <Image
                                src={product.hover_image_url}
                                alt={`${inspiredByLabel(displayName)} el yapımı`}
                                fill
                                unoptimized={product.hover_image_url.startsWith('data:')}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className={`object-contain p-4 pb-12 transition-opacity duration-700 ${showHandmade ? 'opacity-100' : 'opacity-0'}`}
                            />
                        )}
                    </>
                ) : (
                    <BottleIllustration
                        name={displayName}
                        caption={sizes.length ? `${sizes[0]} ML · EDP` : 'EAU DE PARFUM'}
                        className="w-full h-full block transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                )}

                {totalStock > 0 && totalStock <= 3 && (
                    <span className="absolute top-3 left-3 font-storefront-mono text-[11px] tracking-[0.14em] bg-ink text-paper px-2.5 py-1">
                        SON {totalStock}
                    </span>
                )}
            </Link>

            <Link
                href={productHref}
                className="relative -mt-10 mx-4 sm:mx-5 flex flex-col gap-2.5 bg-label border border-label-line px-5 pt-5 pb-4 font-storefront-mono text-xs leading-relaxed text-ink"
            >
                <span className="flex items-end justify-between gap-3">
                    <Image src="/brand/logo-ink.svg" alt="" width={46} height={26} unoptimized className="h-[26px] w-auto" />
                    {product.gender && (
                        <span className="text-[11px] tracking-[0.2em] text-sand uppercase">{genderLabel(product.gender)}</span>
                    )}
                </span>
                <span lang="en" className="border-t border-ink pt-3 text-[17px] font-bold tracking-[0.08em] uppercase leading-snug">
                    {displayName}
                </span>
                <span className="font-storefront italic text-[17px] text-umber leading-snug">
                    {inspiredByLabel(displayName)}
                </span>
                {notes.length > 0 && (
                    <span className="grid grid-cols-[46px_1fr] gap-x-2 gap-y-0.5 text-umber">
                        {notes.map(([layer, text]) => (
                            <span key={layer} className="contents">
                                <span className="text-tan-ink">{layer}</span>
                                <span className="truncate">{text}</span>
                            </span>
                        ))}
                    </span>
                )}
                <span className="border-t border-ink pt-2.5 flex justify-between gap-3 text-[11px] tracking-[0.1em]">
                    <span>{sizes.length ? `${sizes.join(' · ')} ML` : 'EAU DE PARFUM'}</span>
                    {product.batch_number && <span className="truncate">LOT {product.batch_number}</span>}
                </span>
            </Link>

            <div className="flex flex-wrap items-center gap-2.5 px-4 sm:px-5 pt-5 mt-auto">
                <span className="flex-1 min-w-[90px] font-storefront text-2xl font-medium">
                    {minPrice !== null ? (
                        <>
                            {formatPrice(minPrice)}
                            {hasPriceRange && <span className="font-storefront-mono text-[11px] text-sand">&apos;den</span>}
                        </>
                    ) : (
                        <span className="font-storefront-mono text-[11px] tracking-[0.1em] text-sand">FİYAT İÇİN SORUN</span>
                    )}
                </span>
                {tester !== null && addTarget && (
                    <button
                        type="button"
                        onClick={() => addToCart({ ...product, name: displayName }, 1, 'tester')}
                        className="h-11 px-3.5 border border-ink font-storefront-mono text-[11px] tracking-[0.14em] hover:bg-ink hover:text-paper transition-colors cursor-pointer"
                    >
                        TESTER {formatPrice(tester)}
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => addTarget && addToCart(addTarget)}
                    disabled={!canAdd}
                    className="h-11 px-4 bg-ink text-paper font-storefront-mono text-[11px] tracking-[0.14em] hover:bg-tan-ink transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {addTarget ? 'SEPETE EKLE' : 'TÜKENDİ'}
                </button>
            </div>
        </article>
    )
}
