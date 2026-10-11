import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google"
import { CartProvider } from "@/context/CartContext"
import { CartDrawer } from "@/components/cart/CartDrawer"

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["400", "500", "700"],
    variable: "--font-space-grotesk",
})

const plexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    variable: "--font-plex-mono",
})

export default function StorefrontLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <CartProvider>
            <div className={`${spaceGrotesk.variable} ${plexMono.variable} font-storefront bg-paper text-ink min-h-screen`}>
                {children}
                <CartDrawer />
            </div>
        </CartProvider>
    )
}
