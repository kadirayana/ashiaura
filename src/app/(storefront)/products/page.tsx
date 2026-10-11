export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProductList } from '@/components/product-list'

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

    const allProducts = products || []

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-grow px-4 md:px-14 py-10 md:py-14">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-end mb-8 pb-6 border-b border-ink">
                        <div>
                            <p className="font-storefront-mono text-xs text-sand mb-3"><Link href="/" className="hover:text-ink transition-colors">ANA SAYFA</Link> / <span className="text-ink">KOLEKSİYON</span></p>
                            <h1 className="font-bold text-4xl md:text-5xl text-ink">Tam Envanter</h1>
                        </div>
                        <p className="font-storefront-mono text-xs text-sand text-right">
                            TOPLAM <span className="text-rust font-semibold">{allProducts.length} KAYIT</span>
                        </p>
                    </div>

                    <ProductList initialProducts={allProducts} />
                </div>
            </main>

            <Footer />
        </div>
    )
}
