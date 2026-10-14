import { Cormorant_Garamond, Courier_Prime } from "next/font/google"
import { CartProvider } from "@/context/CartContext"
import { PricingProvider } from "@/context/PricingContext"
import { CartDrawer } from "@/components/cart/CartDrawer"
import { createClient } from "@/lib/supabase/server"
import { getBaseName, type PriceMap } from "@/lib/pricing"
import { productTitle } from "@/lib/catalog"
import type { ScentOption } from "@/context/PricingContext"
import { isShopierCheckoutEnabled } from "@/lib/shopier"

const cormorant = Cormorant_Garamond({
    subsets: ["latin", "latin-ext"],
    weight: ["400", "500", "600"],
    style: ["normal", "italic"],
    variable: "--font-cormorant",
})

const courierPrime = Courier_Prime({
    subsets: ["latin", "latin-ext"],
    weight: ["400", "700"],
    variable: "--font-courier-prime",
})

/** Testers are only offered for scents that are on the shelf */
async function loadInStockNames(): Promise<Array<{ name: string; ashi_name?: string | null }>> {
    const supabase = await createClient()
    const { data, error } = await supabase.from('products').select('name, ashi_name').gt('stock', 0)
    if (!error) return data || []
    // ashi_name arrives with supabase/ashi-names.sql; until then fall back to the stored names
    const { data: fallback } = await supabase.from('products').select('name').gt('stock', 0)
    return fallback || []
}

async function loadPricing(): Promise<{ prices: PriceMap; scents: ScentOption[] }> {
    const supabase = await createClient()
    const [{ data: priceRows, error: priceErr }, productRows] = await Promise.all([
        supabase.from('size_prices').select('size_ml, price'),
        loadInStockNames(),
    ])
    if (priceErr) console.error('size_prices could not be loaded:', priceErr.message)

    const prices: PriceMap = {}
    for (const row of priceRows || []) prices[row.size_ml] = Number(row.price)

    // One option per scent, labelled with its Ashi name
    const byScent = new Map<string, ScentOption>()
    for (const p of productRows) {
        const value = getBaseName(p.name)
        if (value && !byScent.has(value)) byScent.set(value, { value, label: productTitle(p) })
    }
    const scents = [...byScent.values()].sort((a, b) => a.label.localeCompare(b.label, 'tr'))

    return { prices, scents }
}

export default async function StorefrontLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { prices, scents } = await loadPricing()

    return (
        <PricingProvider prices={prices} scents={scents} onlinePayment={isShopierCheckoutEnabled()}>
            <CartProvider>
                <div className={`storefront ${cormorant.variable} ${courierPrime.variable} font-storefront bg-paper text-ink min-h-screen`}>
                    {children}
                    <CartDrawer />
                </div>
            </CartProvider>
        </PricingProvider>
    )
}
