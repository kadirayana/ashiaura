export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProductList } from '@/components/product-list'
import { getBaseName } from '@/lib/pricing'
import type { Product, Recipe } from '@/types/database'

type ProductWithRecipe = Product & {
    recipe: Recipe | null
}

export const revalidate = 60

export default async function ProductsPage() {
    const supabase = await createClient()

    const { data: products, error } = await supabase
        .from('products')
        .select('*, recipe:recipes(*)')
        .order('fragrantica_score', { ascending: false })

    if (error) {
        console.error("Error fetching products:", error)
    }

    const allProducts: ProductWithRecipe[] = (products || []).map(product => ({
        ...product,
        recipe: Array.isArray(product.recipe) ? product.recipe[0] || null : product.recipe,
    }))

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-grow px-6 lg:px-12 py-12 md:py-16">
                <div className="max-w-[1320px] mx-auto">
                    <div className="flex flex-wrap justify-between items-end gap-4 mb-10">
                        <div className="flex flex-col gap-4">
                            <p className="font-storefront-mono text-xs tracking-[0.14em] text-sand"><Link href="/" className="hover:text-ink transition-colors">ANA SAYFA</Link> / <span className="text-ink">KOLEKSİYON</span></p>
                            <h1 className="italic font-normal text-5xl md:text-[68px] leading-none text-ink">Koleksiyon</h1>
                        </div>
                        <p className="font-storefront-mono text-xs tracking-[0.14em] text-sand">
                            RAFTA <span className="text-ink">{new Set(allProducts.filter(p => p.stock > 0).map(p => getBaseName(p.name))).size} KOKU</span>
                        </p>
                    </div>

                    <ProductList initialProducts={allProducts} />
                </div>
            </main>

            <Footer />
        </div>
    )
}
