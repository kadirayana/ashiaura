import { Cormorant_Garamond, Courier_Prime } from "next/font/google"
import { CartProvider } from "@/context/CartContext"
import { PricingProvider } from "@/context/PricingContext"
import { CartDrawer } from "@/components/cart/CartDrawer"
import { createClient } from "@/lib/supabase/server"
import { getBaseName, type PriceMap } from "@/lib/pricing"
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

async function loadPricing(): Promise<{ prices: PriceMap; scents: string[] }> {
    const supabase = await createClient()
    const [{ data: priceRows, error: priceErr }, { data: productRows }] = await Promise.all([
        supabase.from('size_prices').select('size_ml, price'),
        supabase.from('products').select('name'),
    ])
    if (priceErr) console.error('size_prices could not be loaded:', priceErr.message)

    const prices: PriceMap = {}
    for (const row of priceRows || []) prices[row.size_ml] = Number(row.price)

    const scents = [...new Set((productRows || []).map(p => getBaseName(p.name)).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'tr'))

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
