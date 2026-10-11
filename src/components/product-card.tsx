"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { slugify, genderLabel, inspiredByLabel } from '@/lib/utils'
import type { Product, Recipe } from '@/types/database'
import { ShoppingBag } from 'lucide-react'
import { useCart } from '@/context/CartContext'

type ProductWithRecipe = Product & {
    recipe: Recipe | null
}

interface ProductCardProps {
    product: ProductWithRecipe
    variants?: ProductWithRecipe[]  // Other size variants in the same family
}

function getBaseName(name: string) {
    return name.replace(/\s*\d+\s*ml\s*/gi, '').trim()
}

function getSizeMl(p: ProductWithRecipe): number {
    if (p.bottle_size_ml) return p.bottle_size_ml
    const match = p.name.match(/(\d+)\s*ml/i)
    return match ? parseInt(match[1]) : 0
}

export function ProductCard({ product, variants }: ProductCardProps) {
    const [showHandmade, setShowHandmade] = useState(false)
    const { addToCart } = useCart()
    const hasHandmadeImage = !!product.hover_image_url

    const displayName = getBaseName(product.name) || product.name
    const inspiredByText = inspiredByLabel(displayName)
    const totalStock = variants && variants.length > 1
        ? variants.reduce((sum, v) => sum + v.stock, 0)
        : product.stock
    const allSizes = variants && variants.length > 1
        ? [...variants].sort((a, b) => getSizeMl(a) - getSizeMl(b))
        : null

    return (
        <Link
            href={`/products/${slugify(product.name)}`}
            className="group h-full flex flex-col bg-paper border border-ink hover:border-rust transition-colors duration-300"
        >
            <div
                className="aspect-square relative overflow-hidden bg-[repeating-linear-gradient(45deg,#eceadf_0_9px,#e3e0d2_9px_18px)] border-b border-ink"
                onMouseEnter={() => hasHandmadeImage && setShowHandmade(true)}
                onMouseLeave={() => setShowHandmade(false)}
            >
                {product.hover_image_url && (
                    <Image
                        src={product.hover_image_url}
                        alt={inspiredByText}
                        fill
                        unoptimized={product.hover_image_url.startsWith('data:')}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className={`object-contain p-4 transition-all duration-500 absolute inset-0 z-10 ${showHandmade ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                            }`}
                    />
                )}
                {product.image_url ? (
                    <Image
                        src={product.image_url}
                        alt={inspiredByText}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className={`object-contain p-4 transition-all duration-500 ${showHandmade && hasHandmadeImage ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                            }`}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-storefront-mono text-xs text-sand border border-dashed border-sand px-3 py-2 bg-paper">
                            [ foto ]
                        </span>
                    </div>
                )}

                {product.gender && (
                    <div className="absolute top-3 left-3 z-10 font-storefront-mono text-[10px] border border-ink rounded-full px-2.5 py-1 bg-paper">
                        {genderLabel(product.gender)}
                    </div>
                )}

                <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 items-end">
                    {product.fragrantica_score && (
                        <div className="font-storefront-mono text-[11px] font-semibold bg-paper border border-ink px-1.5 py-0.5">
                            ★ {Number(product.fragrantica_score).toFixed(2)}
                        </div>
                    )}
                    <span
                        className={`font-storefront-mono text-[10px] font-semibold px-2 py-0.5 border ${totalStock > 5 ? 'text-moss border-moss' : 'text-rust border-rust'
                            }`}
                    >
                        {totalStock > 5 ? 'STOKTA' : `SON ${totalStock}`}
                    </span>
                </div>
            </div>

            <div className="p-5 flex flex-col flex-1">
                <h3 className="font-semibold text-lg text-ink mb-1">{inspiredByText}</h3>

                {allSizes && allSizes.length > 1 ? (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {allSizes.map((v) => {
                            const size = getSizeMl(v)
                            return (
                                <span
                                    key={v.id}
                                    className={`font-storefront-mono text-[10px] px-2 py-0.5 border rounded-full ${v.stock > 0 ? 'border-ink text-ink' : 'border-hairline text-sand'
                                        }`}
                                >
                                    {size > 0 ? `${size}ml` : '?'}
                                </span>
                            )
                        })}
                    </div>
                ) : (
                    (product.bottle_size_ml || (product.recipe && product.recipe.bottle_size_ml)) && (
                        <p className="font-storefront-mono text-xs text-sand mb-3">
                            {product.bottle_size_ml || product.recipe?.bottle_size_ml}ml
                        </p>
                    )
                )}

                {product.fragrantica_url && (
                    <div className="mb-3">
                        <button
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                window.open(product.fragrantica_url || '', '_blank')
                            }}
                            className="font-storefront-mono text-[11px] text-sand hover:text-rust underline bg-transparent border-none p-0 cursor-pointer"
                        >
                            Fragrantica&apos;da İncele
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-dashed border-hairline">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            addToCart(product)
                        }}
                        disabled={totalStock <= 0}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-ink text-paper py-2 px-3 hover:bg-rust transition-colors font-storefront-mono text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{totalStock > 0 ? 'SEPETE EKLE' : 'TÜKENDİ'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.open(`https://wa.me/905369433943?text=Merhaba, ${inspiredByText} hakkında bilgi almak istiyorum.`, '_blank')
                        }}
                        title="WhatsApp ile Sor"
                        className="w-8 h-8 flex items-center justify-center border border-ink hover:bg-ink hover:text-paper transition-colors cursor-pointer shrink-0"
                    >
                        <svg className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </Link>
    )
}
