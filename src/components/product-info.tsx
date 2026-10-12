'use client'

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { MessageCircle, ShoppingBag } from "lucide-react"
import { slugify, genderLabel, inspiredByLabel } from "@/lib/utils"
import type { Product } from "@/types/database"
import { useCart } from "@/context/CartContext"

export interface NoteData {
    top: string[]
    middle: string[]
    base: string[]
}

export interface SimilarProduct {
    id: string
    name: string
    house?: string | null
    rating?: number | null
}

interface ProductInfoProps {
    name: string
    description: string | null
    stock: number
    gender: string | null
    bottleSizeMl: number | null
    notes?: NoteData
    dbNotes?: string | null
    variants?: Product[]
    similar?: SimilarProduct[]
}

export function ProductInfo({
    name,
    description,
    stock,
    gender,
    bottleSizeMl,
    notes,
    dbNotes,
    variants,
    similar,
}: ProductInfoProps) {
    const { addToCart } = useCart()
    const searchParams = useSearchParams()
    const catalogQuery = searchParams.toString()
    const withCatalogQuery = (href: string) => `${href}${catalogQuery ? `?${catalogQuery}` : ''}`
    const inspiredByText = inspiredByLabel(name)

    const currentVariant = variants?.find(v => v.name === name) || {
        id: name,
        name,
        bottle_size_ml: bottleSizeMl,
        stock,
        gender: gender as any,
    }

    const totalStock = variants && variants.length > 1
        ? variants.reduce((sum, v) => sum + v.stock, 0)
        : stock

    const handleAddToCart = () => {
        addToCart(currentVariant)
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="font-bold text-3xl md:text-4xl text-ink leading-tight">{inspiredByText}</h1>

                <div className="grid grid-cols-3 border border-ink mt-6">
                    <div className="p-3 border-r border-ink">
                        <div className="font-storefront-mono text-[9px] text-sand tracking-wide">PROFİL</div>
                        <div className="font-semibold text-sm mt-1">{genderLabel(gender)}</div>
                    </div>
                    <div className="p-3 border-r border-ink">
                        <div className="font-storefront-mono text-[9px] text-sand tracking-wide">HACİM</div>
                        <div className="font-semibold text-sm mt-1">{bottleSizeMl ? `${bottleSizeMl} ml` : '—'}</div>
                    </div>
                    <div className="p-3">
                        <div className="font-storefront-mono text-[9px] text-sand tracking-wide">STOK</div>
                        <div className={`font-semibold text-sm mt-1 ${totalStock > 0 ? 'text-moss' : 'text-rust'}`}>
                            {totalStock > 0 ? `Son ${totalStock} adet` : 'Tükendi'}
                        </div>
                    </div>
                </div>

                {variants && variants.length > 1 && (() => {
                    const sizeMap = new Map<number, (typeof variants)[0]>()
                    for (const v of variants) {
                        const size = v.bottle_size_ml ?? parseInt(v.name.match(/(\d+)\s*ml/i)?.[1] || '0')
                        const existing = sizeMap.get(size)
                        if (!existing || v.stock > existing.stock) sizeMap.set(size, v)
                    }
                    const uniqueVariants = Array.from(sizeMap.entries()).sort(([a], [b]) => a - b).map(([, v]) => v)

                    return (
                        <div className="mt-4 flex flex-wrap gap-2">
                            {uniqueVariants.map((variant) => {
                                const isSelected = variant.name === name
                                const inStock = variant.stock > 0
                                const sizeLabel = variant.bottle_size_ml
                                    ? `${variant.bottle_size_ml}ml`
                                    : (variant.name.match(/(\d+ml)/i)?.[1] || variant.name)
                                return (
                                    <Link
                                        key={variant.id}
                                        href={withCatalogQuery(`/products/${slugify(variant.name)}`)}
                                        className={`font-storefront-mono text-xs font-semibold px-3 py-1.5 border ${isSelected
                                            ? 'bg-ink text-paper border-ink'
                                            : inStock
                                                ? 'border-moss text-moss hover:bg-moss hover:text-paper'
                                                : 'border-hairline text-sand line-through'
                                            }`}
                                    >
                                        {sizeLabel}
                                    </Link>
                                )
                            })}
                        </div>
                    )
                })()}
            </div>

            <p className="text-ink/80 leading-relaxed whitespace-pre-line">
                {description || "Bu eserin hikayesi yakında eklenecektir."}
            </p>

            {(notes || dbNotes) && (
                <div>
                    <p className="font-storefront-mono text-xs text-rust tracking-wide mb-3">NOTA PİRAMİDİ</p>
                    {notes ? (
                        <div className="space-y-1">
                            {([
                                ['ÜST', notes.top],
                                ['KALP', notes.middle],
                                ['DİP', notes.base],
                            ] as const).map(([layer, tags]) => (
                                <div key={layer} className="grid grid-cols-[70px_1fr] gap-4 items-baseline py-2.5 border-b border-dashed border-hairline">
                                    <span className="font-storefront-mono text-[10px] text-sand tracking-wide">{layer}</span>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map((tag) => (
                                            <span key={tag} className="font-storefront-mono text-xs border border-ink rounded-full px-2.5 py-0.5">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sand text-sm whitespace-pre-line">{dbNotes}</p>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={stock <= 0}
                    className="flex-1 flex items-center justify-center gap-2.5 bg-rust hover:bg-rust/90 text-paper font-storefront-mono font-semibold px-6 py-4 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                    <ShoppingBag className="w-5 h-5" />
                    {stock > 0 ? 'SEPETE EKLE' : 'STOKTA TÜKENDİ'}
                </button>

                <a
                    href={`https://wa.me/905369433943?text=${encodeURIComponent(`Merhaba, ${inspiredByText} hakkında bilgi almak istiyorum.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 border border-ink bg-paper text-ink font-storefront-mono font-semibold px-6 py-4 hover:bg-ink hover:text-paper transition-colors"
                >
                    <MessageCircle className="w-5 h-5" />
                    WHATSAPP
                </a>
            </div>

            {similar && similar.length > 0 && (
                <div className="pt-6 border-t border-ink">
                    <p className="font-storefront-mono text-xs text-rust tracking-wide mb-4">BENZER KAYITLAR</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {similar.map((s) => (
                            <Link
                                key={s.id}
                                href={withCatalogQuery(`/products/${slugify(s.name)}`)}
                                className="border border-ink px-4 py-3 flex justify-between items-center hover:bg-black/[0.03] transition-colors"
                            >
                                <div>
                                    <div className="font-semibold text-sm text-ink">{s.name}</div>
                                    {s.house && <div className="font-storefront-mono text-xs text-sand">{s.house}</div>}
                                </div>
                                <span className="font-storefront-mono text-xs">→</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
