"use client";

import { useState } from "react";
import { Product } from "@/data/products";
import { formatPrice } from "@/lib/utils";
import { ShoppingBag, ArrowUpRight, ShieldCheck, Truck, RefreshCw } from "lucide-react";

interface ProductDetailPurchaseProps {
  product: Product;
}

export function ProductDetailPurchase({ product }: ProductDetailPurchaseProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const currentVariant = product.variants[selectedIdx] || product.variants[0];

  return (
    <div className="space-y-6 pt-4 border-t border-white/10">
      {/* Boyut Seçimi */}
      <div>
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-zinc-400 mb-3">
          <span>Şişe Hacmi Seçin:</span>
          <span className="text-[#c5a880] font-semibold">{currentVariant.size}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {product.variants.map((v, idx) => (
            <button
              key={v.size}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={`p-3.5 text-left border transition-all ${
                selectedIdx === idx
                  ? "border-[#c5a880] bg-[#c5a880]/10 text-zinc-100"
                  : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{v.size}</span>
                <span className="text-xs text-[#c5a880]">{formatPrice(v.price)}</span>
              </div>
              <span className="text-[10px] text-zinc-500 block mt-1">
                {v.size === "50ml" ? "Günlük & Taşınabilir Lüks" : "İmza Boyut & Uzun Kullanım"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Fiyat Gösterimi ve Satın Al CTA */}
      <div className="space-y-3 pt-2">
        <div className="flex items-baseline gap-3">
          <span className="font-editorial text-3xl sm:text-4xl text-zinc-100 font-bold">
            {formatPrice(currentVariant.price)}
          </span>
          <span className="text-xs text-zinc-500 uppercase tracking-wider">
            (KDV & Kargo Dahil)
          </span>
        </div>

        {/* Ana Shopier Satın Al Butonu */}
        <a
          href={currentVariant.shopierUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-[#dfc8a8] via-[#c5a880] to-[#9e7f56] hover:brightness-110 text-zinc-950 font-bold text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#c5a880]/10 transition-all"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Shopier ile Güvenli Satın Al ({currentVariant.size})</span>
          <ArrowUpRight className="w-4 h-4 opacity-70" />
        </a>

        <p className="text-[11px] text-zinc-500 text-center">
          🔒 Ödeme işlemi Shopier güvenli ödeme sayfasında 256-bit SSL şifrelemeyle tamamlanır.
        </p>
      </div>

      {/* Hızlı Güvence Kutuları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/5 text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-[#c5a880] shrink-0" />
          <span>Ücretsiz Hızlı Kargo</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#c5a880] shrink-0" />
          <span>%100 Orijinal Extrait</span>
        </div>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-[#c5a880] shrink-0" />
          <span>Hasarsız Teslimat Garantisi</span>
        </div>
      </div>
    </div>
  );
}
