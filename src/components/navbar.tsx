"use client"

import * as React from "react"
import Link from "next/link"
import { Menu, X, ShoppingBag } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { ThemeLogo } from "./theme-logo"
import { useCart } from "@/context/CartContext"

export function Navbar() {
    const [isOpen, setIsOpen] = React.useState(false)
    const { setIsOpen: setCartOpen, totalCount } = useCart()

    const handleRequestClick = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsOpen(false)
        const popupBtn = document.querySelector('#request-popup button') as HTMLButtonElement
        if (popupBtn) popupBtn.click()
    }

    return (
        <nav className="sticky top-0 z-50 bg-paper/95 backdrop-blur-sm border-b border-ink">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center gap-2.5">
                        <ThemeLogo className="h-8 w-auto object-contain" priority />
                        <span className="font-storefront-mono text-[11px] tracking-[0.18em] text-rust font-semibold hidden sm:inline">
                            AURA
                        </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-6 font-storefront-mono text-xs tracking-wide">
                        <Link href="/products" className="text-sand hover:text-ink transition-colors">
                            ÜRÜNLER
                        </Link>
                        <button onClick={handleRequestClick} className="text-sand hover:text-ink transition-colors cursor-pointer">
                            İSTEKLERİNİZ
                        </button>
                        <Link href="/#about" className="text-sand hover:text-ink transition-colors">
                            HAKKIMIZDA
                        </Link>
                        <Link href="/#contact" className="text-sand hover:text-ink transition-colors">
                            İLETİŞİM
                        </Link>
                        <button
                            onClick={handleRequestClick}
                            className="text-sand hover:text-ink transition-colors cursor-pointer"
                        >
                            TALEP OLUŞTUR →
                        </button>

                        {/* Cart Button */}
                        <button
                            type="button"
                            onClick={() => setCartOpen(true)}
                            className="flex items-center gap-2 bg-ink text-paper px-3.5 py-2 hover:bg-rust transition-colors cursor-pointer rounded-sm"
                            aria-label="Sepetim"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            <span>SEPET ({totalCount})</span>
                        </button>

                        <ThemeToggle />
                    </div>

                    <div className="md:hidden flex items-center gap-2">
                        {/* Mobile Cart Button */}
                        <button
                            type="button"
                            onClick={() => setCartOpen(true)}
                            className="relative flex items-center justify-center p-2 text-ink hover:text-rust transition-colors"
                            aria-label="Sepetim"
                        >
                            <ShoppingBag className="w-5 h-5" />
                            {totalCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-rust text-paper text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                    {totalCount}
                                </span>
                            )}
                        </button>
                        <ThemeToggle />
                        <button onClick={() => setIsOpen(!isOpen)} className="text-ink p-2" aria-label="Menü">
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="md:hidden bg-paper border-b border-ink font-storefront-mono text-sm tracking-wide">
                    <div className="px-4 pt-2 pb-4 space-y-2">
                        <Link href="/products" className="block px-3 py-2 text-sand hover:text-ink" onClick={() => setIsOpen(false)}>
                            ÜRÜNLER
                        </Link>
                        <button onClick={handleRequestClick} className="block w-full text-left px-3 py-2 text-sand hover:text-ink">
                            İSTEKLERİNİZ
                        </button>
                        <Link href="/#about" className="block px-3 py-2 text-sand hover:text-ink" onClick={() => setIsOpen(false)}>
                            HAKKIMIZDA
                        </Link>
                        <Link href="/#contact" className="block px-3 py-2 text-sand hover:text-ink" onClick={() => setIsOpen(false)}>
                            İLETİŞİM
                        </Link>
                        <button
                            type="button"
                            onClick={() => { setIsOpen(false); setCartOpen(true); }}
                            className="w-full flex items-center justify-center gap-2 bg-ink text-paper px-4 py-2.5 hover:bg-rust transition-colors font-semibold"
                        >
                            <ShoppingBag className="w-4 h-4" />
                            SEPETİMİ GÖRÜNTÜLE ({totalCount})
                        </button>
                    </div>
                </div>
            )}
        </nav>
    )
}
