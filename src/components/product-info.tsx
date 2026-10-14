'use client'

import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Gift } from "lucide-react"
import { slugify, genderLabel } from "@/lib/utils"
import type { Product } from "@/types/database"
import { useCart } from "@/context/CartContext"
import { usePricing } from "@/context/PricingContext"
import { bottlePrice, testerPrice, formatPrice, getSizeMl, giftTestersFor } from "@/lib/pricing"

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
    productId: string
    /** Storefront (Ashi) name */
    name: string
    /** "<original> parfümünden esinlenildi", null for Ashi's own scents */
    inspired?: string | null
    /** Ashi names are Turkish; original names are uppercased with English rules */
    nameLang?: 'tr' | 'en'
    stock: number
    gender: string | null
    bottleSizeMl: number | null
    notes?: NoteData
    dbNotes?: string | null
    variants?: Product[]
    batchNumber?: string | null
    rating?: number | null
}

export function ProductInfo({
    productId,
    name,
    inspired,
    nameLang = 'en',
    stock,
    gender,
    bottleSizeMl,
    notes,
    dbNotes,
    variants,
    batchNumber,
    rating,
}: ProductInfoProps) {
    const { addToCart } = useCart()
    const { prices, onlinePayment } = usePricing()
    const searchParams = useSearchParams()
    const catalogQuery = searchParams.toString()
    const withCatalogQuery = (href: string) => `${href}${catalogQuery ? `?${catalogQuery}` : ''}`

    const currentVariant = variants?.find(v => v.id === productId) || {
        id: productId,
        name,
        bottle_size_ml: bottleSizeMl,
        stock,
        gender: gender as Product['gender'],
    }

    const price = bottlePrice(prices, currentVariant)
    const tester = testerPrice(prices)
    const size = getSizeMl(currentVariant)
    const giftTesters = giftTestersFor(currentVariant)
    const canAdd = stock > 0 && (price !== null || !onlinePayment)
    const familyInStock = stock > 0 || !!variants?.some(v => v.stock > 0)

    // One pill per size; if two products share a size, link the one with more stock
    const sizeOptions = (() => {
        if (!variants || variants.length < 2) return []
        const bySize = new Map<number, Product>()
        for (const v of variants) {
            const s = getSizeMl(v)
            const existing = bySize.get(s)
            if (!existing || v.id === productId || (existing.id !== productId && v.stock > existing.stock)) bySize.set(s, v)
        }
        return [...bySize.entries()].sort(([a], [b]) => a - b)
    })()

    const noteRows: Array<[string, string]> = notes
        ? ([['ÜST', notes.top], ['ORTA', notes.middle], ['ALT', notes.base]] as const)
            .filter(([, list]) => list.length > 0)
            .map(([layer, list]) => [layer, list.join(', ').toLocaleLowerCase('tr')])
        : []

    return (
        <div className="flex flex-col gap-8">
            {/* Label */}
            <div className="bg-label border border-label-line px-7 sm:px-8 pt-7 pb-6 flex flex-col gap-4 font-storefront-mono text-[13px] leading-relaxed">
                <span className="flex items-end justify-between gap-3">
                    <Image src="/brand/logo-ink.svg" alt="Ashi Aura" width={60} height={34} unoptimized className="h-[34px] w-auto" />
                    {gender && <span className="text-[11px] tracking-[0.2em] text-sand uppercase">{genderLabel(gender)}</span>}
                </span>
                <h1 lang={nameLang} className="border-t border-ink pt-4 font-storefront-mono text-2xl sm:text-3xl font-bold leading-tight tracking-[0.06em] uppercase">
                    {name}
                </h1>
                {inspired && <span className="font-storefront italic text-[22px] leading-snug text-umber">{inspired}</span>}
                {noteRows.length > 0 ? (
                    <div className="grid grid-cols-[56px_1fr] gap-x-3 gap-y-1.5 text-umber">
                        {noteRows.map(([layer, text]) => (
                            <span key={layer} className="contents">
                                <span className="text-tan-ink">{layer}</span>
                                <span>{text}</span>
                            </span>
                        ))}
                    </div>
                ) : dbNotes ? (
                    <p className="text-umber whitespace-pre-line">{dbNotes}</p>
                ) : null}
                <span className="border-t border-ink pt-3 flex flex-wrap justify-between gap-2 text-xs tracking-[0.12em]">
                    <span>{size ? `${size} ML · ` : ''}EAU DE PARFUM</span>
                    {batchNumber && <span>LOT {batchNumber}</span>}
                </span>
            </div>

            {/* Price */}
            <div className="flex flex-wrap items-baseline justify-between gap-4">
                <span className="font-storefront text-[44px] font-medium leading-none">
                    {price !== null ? formatPrice(price) : (
                        <span className="font-storefront-mono text-sm tracking-[0.14em] text-sand">FİYAT İÇİN SORUN</span>
                    )}
                </span>
                {rating != null && (
                    <span className="font-storefront-mono text-xs tracking-[0.1em] text-sand">★ {Number(rating).toFixed(2)} FRAGRANTICA</span>
                )}
            </div>

            {/* Size */}
            {sizeOptions.length > 1 && (
                <div className="flex flex-col gap-3">
                    <span className="font-storefront-mono text-[11px] tracking-[0.24em] text-sand">HACİM</span>
                    <div className="flex self-start border border-ink" role="group" aria-label="Hacim seçimi">
                        {sizeOptions.map(([ml, variant], i) => {
                            const selected = variant.id === productId
                            return (
                                <Link
                                    key={variant.id}
                                    href={withCatalogQuery(`/products/${slugify(variant.name)}`)}
                                    aria-current={selected ? 'page' : undefined}
                                    className={`min-w-[100px] h-12 px-5 flex items-center justify-center font-storefront-mono text-[13px] tracking-[0.18em] ${i > 0 ? 'border-l border-ink' : ''} ${selected
                                        ? 'bg-ink text-label'
                                        : variant.stock > 0 ? 'hover:bg-linen' : 'text-sand line-through'
                                        }`}
                                >
                                    {ml ? `${ml} ML` : variant.name}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}

            {giftTesters > 0 && (
                <div className="flex items-center gap-3 bg-linen px-5 py-3.5 text-lg leading-snug">
                    <Gift className="w-5 h-5 text-tan-ink shrink-0" strokeWidth={1.5} />
                    <span>Bu şişeyle <em>{giftTesters === 1 ? '3 ml tester' : `${giftTesters} adet 3 ml tester`} hediye.</em> {giftTesters === 1 ? 'Kokusunu' : 'Kokularını'} sepette seçersin.</span>
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
                <button
                    type="button"
                    onClick={() => addToCart(currentVariant)}
                    disabled={!canAdd}
                    className="h-14 bg-ink text-label font-storefront-mono text-sm tracking-[0.22em] hover:bg-tan-ink transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {stock > 0 ? 'SEPETE EKLE' : 'STOKTA TÜKENDİ'}
                </button>
                {tester !== null && familyInStock && (
                    <button
                        type="button"
                        onClick={() => addToCart(currentVariant, 1, 'tester')}
                        className="h-14 border border-ink font-storefront-mono text-sm tracking-[0.22em] hover:bg-ink hover:text-label transition-colors cursor-pointer"
                    >
                        3 ML TESTER İLE DENE · {formatPrice(tester)}
                    </button>
                )}
                {stock > 0 && stock <= 3 && (
                    <span className="font-storefront-mono text-xs tracking-[0.1em] text-rust">BU BOYUTTAN SON {stock} ADET</span>
                )}
            </div>

            {/* Details */}
            <div className="flex flex-col border-t border-ink text-lg">
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-4 border-b border-hairline">
                    <span className="font-storefront-mono text-xs tracking-[0.2em] pt-1">ÖDEME</span>
                    <span className="text-umber">Kredi ve banka kartı · Shopier</span>
                </div>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-4 border-b border-hairline">
                    <span className="font-storefront-mono text-xs tracking-[0.2em] pt-1">SORU</span>
                    <a
                        href={`https://wa.me/905369433943?text=${encodeURIComponent(`Merhaba, ${name} hakkında bilgi almak istiyorum.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-umber underline underline-offset-4 hover:text-tan-ink"
                    >
                        WhatsApp&apos;tan yaz
                    </a>
                </div>
            </div>
        </div>
    )
}
