"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface StickyCTAProps {
    stock: number
    price: number
    productName: string
}

export function StickyCTA({ stock, price, productName }: StickyCTAProps) {
    const [isVisible, setIsVisible] = useState(false)

    // Show CTA after scrolling a bit (optional, or always show)
    useEffect(() => {
        const handleScroll = () => {
            setIsVisible(window.scrollY > 100)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const hasStock = stock > 0

    // Format price
    const formattedPrice = new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
    }).format(price)


    const handleOrder = () => {
        if (!hasStock) return;
        const message = `Merhaba, ${productName} (${formattedPrice}) sipariş vermek istiyorum.`
        window.open(`https://wa.me/905369433943?text=${encodeURIComponent(message)}`, '_blank')
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 md:hidden z-50 bg-slate-950/80 backdrop-blur-lg border-t border-slate-800 pb-safe">
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <p className="text-xs text-slate-400">Toplam Tutar</p>
                    <p className="text-lg font-bold text-white">{formattedPrice}</p>
                </div>
                <button
                    onClick={handleOrder}
                    disabled={!hasStock}
                    className={cn(
                        "flex-1 py-3 px-6 rounded-xl font-bold text-white transition-all transform active:scale-95 shadow-lg",
                        hasStock
                            ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-green-900/20"
                            : "bg-slate-700 cursor-not-allowed text-slate-400"
                    )}
                >
                    {hasStock ? "Sipariş Ver" : "Stokta Yok"}
                </button>
            </div>
        </div>
    )
}
