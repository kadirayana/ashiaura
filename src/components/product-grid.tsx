'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProductCard } from './product-card'
import type { Product, Recipe } from '@/types/database'
import { getPaginatedProducts } from '@/app/actions'
import { Button } from './ui/button'
import { Input } from './ui/input' // Assuming you have an Input component or will use standard input

type ProductWithRecipe = Product & {
    recipe: Recipe | null
}

interface ProductGridProps {
    initialProducts: ProductWithRecipe[]
    initialHasMore: boolean
}

export function ProductGrid({ initialProducts, initialHasMore }: ProductGridProps) {
    const [products, setProducts] = useState(initialProducts)
    const [hasMore, setHasMore] = useState(initialHasMore)
    const [page, setPage] = useState(2)
    const [loading, setLoading] = useState(false)

    // Search & Sort State
    const [search, setSearch] = useState('')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [sortBy, setSortBy] = useState<'name' | 'fragrantica_score'>('name')
    const [gender, setGender] = useState<string>('all')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    // Handle sort by change - set appropriate default order
    const handleSortByChange = (newSortBy: 'name' | 'fragrantica_score') => {
        setSortBy(newSortBy)
        // Default to desc for score (highest first), asc for name (A-Z)
        setSortOrder(newSortBy === 'fragrantica_score' ? 'desc' : 'asc')
    }

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
        }, 500) // 500ms delay

        return () => clearTimeout(timer)
    }, [search])

    // Fetch data when filters change (search or sort)
    // We use useCallback to stable reference this function
    const fetchFilteredProducts = useCallback(async () => {
        setLoading(true)
        // Reset to page 1 for new filter
        const res = await getPaginatedProducts(1, 12, debouncedSearch, sortOrder, gender, sortBy)

        setProducts(res.products || [])
        setHasMore(res.hasMore)
        setPage(2) // Next page will be 2
        setLoading(false)
    }, [debouncedSearch, sortOrder, gender, sortBy])

    // Trigger fetch when debounced search or sort order changes
    // We skip the initial render if initialProducts matches default state, 
    // but since we want search/sort to override, we should run this effect 
    // whenever they change from default or user interaction.
    useEffect(() => {
        // Only fetch if we are not in the exact initial state (empty search, asc sort) 
        // OR if we want to ensure client-side state is sync.
        // However, simplest way is to fetch whenever these dependencies change.
        // To avoid double fetch on mount, we can check if search is empty and sort is asc (initial props state)
        // But user might want to search immediately.

        // Slight optimization: If search is empty and sort is ASC, we are technically in "initial" state
        // but the initialProducts passed from server might be stale if we navigated back/forth.
        // Let's just fetch to be safe and responsive.
        // Actually, to prevent overriding initial server props on first mount:
        // We can rely on the fact that debouncedSearch starts at '' and sort at 'asc'.
        // We only need to fetch if these change from defaults OR if we want to support 'reset'.

        // Better approach: Only run this effect if search or sort is DIFFERENT from initial? 
        // No, easier logic:
        // If it's the very first render, we might not want to refetch what server just sent.
        // But handling that lifecycle complexity is prone to bugs.
        // Let's allow one client-side fetch if simple, OR add a ref to track mount.

        // For now, let's just run it. The user interaction will trigger updates.
        // Wait, on mount debouncedSearch is '' and sort is 'asc'.
        // If we run this, we fetch page 1 again. It's a small redundancy but ensures clean state.
        // To avoid the flash, we can use a ref to skip first render.

        // Let's skipping first render logic for simplicity in this iteration:
        if (search === '' && sortOrder === 'asc' && sortBy === 'name' && gender === 'all' && products === initialProducts) return

        fetchFilteredProducts()
    }, [debouncedSearch, sortOrder, sortBy, gender, fetchFilteredProducts])


    async function loadMore() {
        if (loading || !hasMore) return

        setLoading(true)
        const res = await getPaginatedProducts(page, 12, debouncedSearch, sortOrder, gender, sortBy)

        if (res.products && res.products.length > 0) {
            setProducts(prev => [...prev, ...res.products])
            setHasMore(res.hasMore)
            setPage(prev => prev + 1)
        } else {
            setHasMore(false)
        }

        setLoading(false)
    }

    return (
        <div>
            {/* Search & Sort Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between bg-slate-900/50 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
                <div className="relative w-full md:max-w-md">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Parfüm ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-800 border-none rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                    />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    {['all', 'men', 'women', 'unisex', 'kolonya'].map((g) => (
                        <Button
                            key={g}
                            variant={gender === g ? 'default' : 'outline'}
                            onClick={() => setGender(g)}
                            className={`rounded-full capitalize ${gender === g
                                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                : 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            {g === 'all' ? 'Tümü' : g === 'men' ? 'Erkek' : g === 'women' ? 'Kadın' : g === 'kolonya' ? 'Kolonya' : 'Unisex'}
                        </Button>
                    ))}
                </div>

                {/* Sort Controls */}
                <div className="flex items-center gap-2">
                    {/* Sort By Selector */}
                    <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                        <button
                            onClick={() => handleSortByChange('name')}
                            className={`px-3 py-2 text-sm font-medium transition-colors ${sortBy === 'name'
                                ? 'bg-purple-600 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            İsim
                        </button>
                        <button
                            onClick={() => handleSortByChange('fragrantica_score')}
                            className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1 ${sortBy === 'fragrantica_score'
                                ? 'bg-purple-600 text-white'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            <span>★</span>
                            <span>Puan</span>
                        </button>
                    </div>

                    {/* Sort Order */}
                    <Button
                        variant="ghost"
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl px-3 py-2"
                    >
                        <span className="bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 text-purple-400 font-bold min-w-[4.5rem] text-center text-sm">
                            {sortBy === 'name'
                                ? (sortOrder === 'asc' ? 'A → Z' : 'Z → A')
                                : (sortOrder === 'desc' ? '★ Yüksek' : '★ Düşük')
                            }
                        </span>
                        <svg
                            className={`w-4 h-4 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M8 14l4-4 4 4" />
                        </svg>
                    </Button>
                </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>

            {products.length === 0 && !loading && (
                <div className="text-center py-20 text-slate-500">
                    <p className="text-xl">Aradığınız kriterlere uygun ürün bulunamadı.</p>
                </div>
            )}

            {hasMore && (
                <div className="mt-16 text-center">
                    <Button
                        onClick={loadMore}
                        disabled={loading}
                        variant="outline"
                        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:text-white px-8 py-6 text-lg rounded-full backdrop-blur-sm"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                Yükleniyor...
                            </span>
                        ) : (
                            'Daha Fazla Göster'
                        )}
                    </Button>
                </div>
            )}
        </div>
    )
}
