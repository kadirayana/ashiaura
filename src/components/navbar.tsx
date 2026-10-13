"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X } from "lucide-react"
import { useCart } from "@/context/CartContext"

const LINKS = [
    { href: "/products", label: "KOLEKSİYON" },
    { href: "/#tester", label: "TESTER" },
    { href: "/#hikaye", label: "HİKAYEMİZ" },
    { href: "/#istek", label: "ÖZEL İSTEK" },
]

export function Navbar() {
    const [isOpen, setIsOpen] = React.useState(false)
    const { setIsOpen: setCartOpen, totalCount } = useCart()

    return (
        <header className="sticky top-0 z-40">
            <div className="bg-ink text-paper font-storefront-mono text-[11px] sm:text-xs tracking-[0.18em] px-4 py-2.5 flex flex-wrap justify-center gap-x-7 gap-y-1 text-center">
                <span>HER 50 ML ŞİŞEYE 3 ML TESTER HEDİYE</span>
                <span className="hidden sm:inline text-tan" aria-hidden="true">·</span>
                <span className="hidden sm:inline">SHOPIER İLE GÜVENLİ ÖDEME</span>
            </div>

            <nav aria-label="Ana menü" className="bg-paper/95 backdrop-blur-sm border-b border-hairline">
                <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-12 h-[72px] flex items-center justify-between gap-6">
                    <Link href="/" aria-label="Ashi Aura ana sayfa" className="flex items-center">
                        <Image src="/brand/logo-ink.svg" alt="Ashi Aura" width={90} height={50} unoptimized priority className="h-[46px] w-auto" />
                    </Link>

                    <div className="hidden md:flex items-center gap-10 font-storefront-mono text-[13px] tracking-[0.2em]">
                        {LINKS.map(link => (
                            <Link key={link.href} href={link.href} className="hover:text-tan-ink transition-colors">
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setCartOpen(true)}
                            className="h-11 flex items-center gap-2.5 pl-3 pr-1 font-storefront-mono text-[13px] tracking-[0.2em] hover:text-tan-ink transition-colors cursor-pointer"
                            aria-label={`Sepet, ${totalCount} ürün`}
                        >
                            SEPET
                            <span className="min-w-6 h-6 px-1.5 rounded-full bg-ink text-paper text-[11px] tracking-normal flex items-center justify-center">
                                {totalCount}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(!isOpen)}
                            className="md:hidden w-11 h-11 flex items-center justify-center"
                            aria-label={isOpen ? "Menüyü kapat" : "Menüyü aç"}
                            aria-expanded={isOpen}
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {isOpen && (
                    <div className="md:hidden border-t border-hairline font-storefront-mono text-sm tracking-[0.2em] px-4 py-3 flex flex-col">
                        {LINKS.map(link => (
                            <Link key={link.href} href={link.href} className="py-3 border-b border-hairline last:border-0" onClick={() => setIsOpen(false)}>
                                {link.label}
                            </Link>
                        ))}
                    </div>
                )}
            </nav>
        </header>
    )
}
