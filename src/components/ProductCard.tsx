"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product, SERIES_INFO } from "@/data/products";
import { formatPrice } from "@/lib/utils";
import { ShoppingBag, ArrowUpRight } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  // Varsayılan olarak ilk varyant (50ml) seçili
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(0);
  const currentVariant = product.variants[selectedSizeIndex] || product.variants[0];
  const seriesInfo = SERIES_INFO[product.series];

  return (
    <div className="group relative flex flex-col bg-zinc-950 border border-white/5 hover:border-[#c5a880]/40 transition-all duration-300">
      {/* Görsel ve Rozet Alanı */}
      <Link href={`/products/${product.slug}`} className="relative aspect-[4/5] overflow-hidden bg-zinc-900/60 block">
        {/* Seri Rozeti */}
        <div className="absolute top-3 left-3 z-10">
          <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 border font-medium ${seriesInfo.bgBadge}`}>
            {seriesInfo.shortLabel}
          </span>
        </div>

        {/* Özel Rozet (Çok Satan / İmza Koku) */}
        {product.badge && (
          <div className="absolute top-3 right-3 z-10">
            <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 bg-[#c5a880] text-zinc-950 font-bold">
              {product.badge}
            </span>
          </div>
        )}

        {/* Şişe Görseli */}
        <div className="relative w-full h-full p-8 flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain p-6"
            priority={product.featured}
          />
        </div>

        {/* Hoverda İnce Işık Efekti */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>

      {/* İçerik ve Detay Alanı */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Seri Başlığı ve İsim */}
          <div className="text-[11px] uppercase tracking-widest text-[#c5a880] mb-1">
            {product.subtitle}
          </div>
          <Link href={`/products/${product.slug}`}>
            <h3 className="font-editorial text-xl sm:text-2xl text-zinc-100 hover:text-[#c5a880] transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>
          <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
            {product.tagline}
          </p>

          {/* Öne Çıkan Notalar */}
          <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
            {product.notes.top.slice(0, 2).concat(product.notes.heart.slice(0, 1)).map((n) => (
              <span key={n} className="text-[10px] px-2 py-0.5 bg-white/5 text-zinc-300 border border-white/5">
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* Alt Kısım: Boyut Seçici, Fiyat ve Shopier Satın Al Butonu */}
        <div className="mt-5 pt-4 border-t border-white/5">
          {/* Hacim Seçici (50ml / 100ml) */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400">Hacim:</span>
            <div className="flex gap-1.5">
              {product.variants.map((v, idx) => (
                <button
                  key={v.size}
                  type="button"
                  onClick={() => setSelectedSizeIndex(idx)}
                  className={`text-xs px-2.5 py-1 tracking-wider uppercase transition-all ${
                    selectedSizeIndex === idx
                      ? "bg-[#c5a880] text-zinc-950 font-bold"
                      : "bg-white/5 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  {v.size}
                </button>
              ))}
            </div>
          </div>

          {/* Fiyat ve Buton */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-zinc-400">Shopier Fiyatı</span>
              <span className="font-editorial text-lg text-zinc-100 font-semibold">
                {formatPrice(currentVariant.price)}
              </span>
            </div>

            {/* Shopier Direkt Satın Al Butonu */}
            <a
              href={currentVariant.shopierUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider bg-white/10 hover:bg-[#c5a880] hover:text-zinc-950 text-zinc-100 transition-colors"
              title={`${product.name} (${currentVariant.size}) Shopier üzerinden satın al`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Satın Al</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
