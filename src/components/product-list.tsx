"use client"

import { useState, useMemo, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ProductCard } from '@/components/product-card'
import type { Product, Recipe } from '@/types/database'
import { Search, X } from 'lucide-react'
import { LedgerRow } from '@/components/storefront-ui/ledger-row'
import { slugify } from '@/lib/utils'
import { pickRepresentative, matchesSearch, productTitle, inspiredLine } from '@/lib/catalog'
import { GenderBird } from '@/components/storefront-ui/gender-bird'

type ProductWithRecipe = Product & {
    recipe: Recipe | null
}

interface ProductListProps {
    initialProducts: ProductWithRecipe[]
}

type GenderFilter = 'all' | 'men' | 'women' | 'unisex' | 'kolonya' | 'lowstock'

function getGenderFilter(value: string | null): GenderFilter {
    return value === 'men' || value === 'women' || value === 'unisex' ||
        value === 'kolonya' || value === 'lowstock'
        ? value
        : 'all'
}

function getBaseName(name: string) {
    return name.replace(/\s*\d+\s*ml\s*/gi, '').trim()
}

interface ProductGroup {
    baseName: string
    representative: ProductWithRecipe  // The "best" product to show as the card
    variants: ProductWithRecipe[]
}

function totalGroupStock(group: ProductGroup): number {
    return group.variants.reduce((sum, v) => sum + v.stock, 0)
}

export function ProductList(props: ProductListProps) {
    const searchParams = useSearchParams()

    return <ProductListContent key={searchParams.toString()} {...props} />
}

function ProductListContent({ initialProducts }: ProductListProps) {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '')
    const [genderFilter, setGenderFilter] = useState<GenderFilter>(() => getGenderFilter(searchParams.get('gender')))
    const [view, setView] = useState<'list' | 'card'>(() => searchParams.get('view') === 'list' ? 'list' : 'card')
    const catalogQuery = searchParams.toString()

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (searchQuery.trim()) params.set('q', searchQuery.trim())
        else params.delete('q')
        if (genderFilter !== 'all') params.set('gender', genderFilter)
        else params.delete('gender')
        if (view === 'card') params.set('view', view)
        else params.delete('view')

        const nextQuery = params.toString()
        const currentQuery = searchParams.toString()
        if (nextQuery !== currentQuery) {
            router.replace(`${pathname}${nextQuery ? `?${nextQuery}` : ''}`, { scroll: false })
        }
    }, [genderFilter, pathname, router, searchParams, searchQuery, view])

    // Group products into families by recipe_id or base name
    const groupedProducts = useMemo(() => {
        let products = [...initialProducts]

        // 1. Filter by search
        // Finds a scent by its Ashi name or by the original perfume it is inspired by
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim()
            products = products.filter(product =>
                matchesSearch(product, searchQuery) ||
                product.recipe?.description?.toLowerCase().includes(query) ||
                product.notes?.toLowerCase().includes(query)
            )
        }

        // 2. Filter by gender
        if (genderFilter !== 'all') {
            products = genderFilter === 'lowstock'
                ? products.filter(product => product.stock > 0 && product.stock <= 2)
                : products.filter(product => product.gender === genderFilter)
        }

        // 3. Group by base name (always — different sizes may have different recipe_ids)
        const groups = new Map<string, ProductGroup>()

        for (const product of products) {
            const groupKey = getBaseName(product.name)

            if (groups.has(groupKey)) {
                groups.get(groupKey)!.variants.push(product)
            } else {
                groups.set(groupKey, {
                    baseName: getBaseName(product.name),
                    representative: product,
                    variants: [product],
                })
            }
        }

        // 4. Represent each family by a row that can be bought (and borrow a photo if it has none)
        for (const group of groups.values()) {
            group.representative = pickRepresentative(group.variants)
        }

        // 5. Filter out groups where all variants have 0 stock
        // (We fetch all variants for image/metadata cascade but only show in-stock groups)
        const activeGroups = Array.from(groups.values()).filter(g =>
            g.variants.some(v => v.stock > 0)
        )

        // 6. Sort groups by rating (highest first)
        const sortedGroups = activeGroups.sort((a, b) => {
            const scoreA = Math.max(...a.variants.map(v => v.fragrantica_score || 0))
            const scoreB = Math.max(...b.variants.map(v => v.fragrantica_score || 0))
            return scoreB - scoreA
        })

        return sortedGroups
    }, [initialProducts, searchQuery, genderFilter])

    const clearFilters = () => {
        setSearchQuery('')
        setGenderFilter('all')
    }

    const totalProducts = groupedProducts.reduce((sum, g) => sum + g.variants.length, 0)

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between border-b border-ink pb-4">
                <div className="flex flex-wrap items-center gap-2 font-storefront-mono text-[11px] tracking-[0.16em]">
                    {([
                        { label: 'TÜMÜ', value: 'all' as const },
                        { label: 'ERKEK', value: 'men' as const },
                        { label: 'KADIN', value: 'women' as const },
                        { label: 'UNISEX', value: 'unisex' as const },
                        { label: 'KOLONYA', value: 'kolonya' as const },
                        { label: 'SON ADETLER', value: 'lowstock' as const },
                    ]).map((opt) => {
                        const active = genderFilter === opt.value
                        const isLow = opt.value === 'lowstock'
                        return (
                            <button
                                key={opt.value}
                                onClick={() => setGenderFilter(opt.value)}
                                className={`h-10 px-4 flex items-center gap-2 border transition-colors cursor-pointer ${active
                                        ? 'bg-ink text-label border-ink'
                                        : isLow
                                            ? 'text-rust border-rust border-dashed'
                                            : 'text-ink border-label-line hover:border-ink'
                                    }`}
                            >
                                {/* Cream chip keeps the bird visible on the dark active state */}
                                {(opt.value === 'men' || opt.value === 'women' || opt.value === 'unisex') && (
                                    <span className="bg-label rounded-sm px-0.5 py-px flex">
                                        <GenderBird gender={opt.value} className="h-5 w-auto" />
                                    </span>
                                )}
                                {opt.label}
                            </button>
                        )
                    })}
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-sand" />
                        <input
                            type="text"
                            placeholder="Koku ya da parfüm adı ara…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-6 pr-6 py-2 bg-transparent border-0 border-b border-ink text-ink placeholder-sand/60 focus:outline-none text-lg"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-0 top-1/2 -translate-y-1/2 text-sand hover:text-ink">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1 font-storefront-mono text-[11px]">
                        <span className="text-sand mr-1">GÖRÜNÜM:</span>
                        <button
                            onClick={() => setView('list')}
                            className={`px-3 py-1.5 border ${view === 'list' ? 'bg-ink text-paper border-ink' : 'border-ink text-ink'}`}
                        >
                            LİSTE
                        </button>
                        <button
                            onClick={() => setView('card')}
                            className={`px-3 py-1.5 border ${view === 'card' ? 'bg-ink text-paper border-ink' : 'border-ink text-ink'}`}
                        >
                            KART
                        </button>
                    </div>
                </div>
            </div>

            {groupedProducts.length > 0 ? (
                view === 'list' ? (
                    <div>
                        {groupedProducts.map((group) => {
                            const p = group.representative
                            const size = p.bottle_size_ml || p.recipe?.bottle_size_ml
                            const stock = totalGroupStock(group)
                            return (
                                <LedgerRow
                                    key={p.id}
                                    no={p.id.slice(0, 3).toUpperCase()}
                                    name={productTitle(p)}
                                    subtitle={inspiredLine(p)}
                                    nameLang={p.ashi_name ? 'tr' : 'en'}
                                    gender={p.gender}
                                    volumeLabel={size ? `${size} ml` : undefined}
                                    rating={p.fragrantica_score}
                                    href={`/products/${slugify(p.name)}${catalogQuery ? `?${catalogQuery}` : ''}`}
                                    stockLabel={stock > 5 ? 'STOKTA' : `SON ${stock}`}
                                    stockTone={stock > 5 ? 'moss' : 'rust'}
                                />
                            )
                        })}
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-x-8 gap-y-16">
                        {groupedProducts.map((group) => (
                            <div key={group.representative.id} className="h-full">
                                <ProductCard
                                    product={group.representative}
                                    variants={group.variants.length > 1 ? group.variants : undefined}
                                />
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div className="text-center py-24 border border-dashed border-hairline flex flex-col items-center justify-center">
                    <Search className="w-10 h-10 text-sand mb-4" />
                    <h3 className="text-lg font-semibold text-ink mb-2">
                        Aradığınız kriterlere uygun parfüm bulunamadı
                    </h3>
                    <p className="text-sand mb-6 max-w-md mx-auto text-sm">
                        Farklı anahtar kelimeler deneyebilir veya filtreleri temizleyerek tüm koleksiyonumuza göz atabilirsiniz.
                    </p>
                    <button
                        onClick={clearFilters}
                        className="px-6 py-2.5 border border-ink font-storefront-mono text-xs font-semibold hover:bg-ink hover:text-paper transition-all"
                    >
                        FİLTRELERİ TEMİZLE
                    </button>
                </div>
            )}

            <div className="text-center font-storefront-mono text-xs text-sand">
                {groupedProducts.length} ürün ailesi ({totalProducts} varyant) gösteriliyor
            </div>
        </div>
    )
}
