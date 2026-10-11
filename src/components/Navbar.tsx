"use client";

import { useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/data/siteConfig";
import { ShoppingBag, Menu, X, ArrowUpRight } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/collection", label: "Tüm Koleksiyon" },
    { href: "/collection?series=men", label: "Erkek" },
    { href: "/collection?series=women", label: "Kadın" },
    { href: "/collection?series=unisex", label: "Unisex" },
    { href: "/about", label: "Hikayemiz" },
    { href: "/contact", label: "İletişim" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Mobil Menü Butonu */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-zinc-300 hover:text-white transition-colors"
              aria-label="Menüyü aç/kapat"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Logo */}
          <div className="flex-1 lg:flex-none text-center lg:text-left">
            <Link href="/" className="inline-block group">
              <span className="font-editorial text-2xl sm:text-3xl tracking-[0.3em] uppercase text-zinc-100 group-hover:text-[#c5a880] transition-colors">
                ASHI
              </span>
              <span className="block text-[9px] uppercase tracking-[0.45em] text-zinc-400 font-sans-clean mt-0.5">
                A U R A
              </span>
            </Link>
          </div>

          {/* Masaüstü Navigasyon */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium tracking-wide text-zinc-300 hover:text-[#c5a880] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Sağ Eylem: Shopier Mağaza Butonu */}
          <div className="flex items-center space-x-4">
            <a
              href={siteConfig.shopierStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-950 bg-gradient-to-r from-[#dfc8a8] to-[#c5a880] hover:from-[#c5a880] hover:to-[#9e7f56] rounded-none transition-all shadow-sm hover:shadow-[0_0_20px_rgba(197,168,128,0.3)]"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Shopier Mağaza</span>
              <span className="sm:hidden">Mağaza</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      {/* Mobil Açılır Menü */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/5 bg-[#09090b]/95 backdrop-blur-xl px-6 py-8 space-y-4 animate-in slide-in-from-top duration-300">
          <div className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium tracking-wider text-zinc-200 hover:text-[#c5a880] py-2 border-b border-white/5 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium tracking-wider text-zinc-200 hover:text-[#c5a880] py-2 border-b border-white/5 transition-colors"
            >
              Sıkça Sorulan Sorular
            </Link>
          </div>

          <div className="pt-4">
            <a
              href={siteConfig.shopierStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 text-xs uppercase font-semibold tracking-wider bg-gradient-to-r from-[#dfc8a8] to-[#c5a880] text-zinc-950"
            >
              <ShoppingBag className="w-4 h-4" />
              Shopier Mağazasını Aç (Güvenli Ödeme)
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
