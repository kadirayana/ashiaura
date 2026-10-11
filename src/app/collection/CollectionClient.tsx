"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Product, SeriesType, SERIES_INFO } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { siteConfig } from "@/data/siteConfig";
import { ShoppingBag, Filter, Sparkles } from "lucide-react";

interface CollectionClientProps {
  initialProducts: Product[];
}

export function CollectionClient({ initialProducts }: CollectionClientProps) {
  const searchParams = useSearchParams();
  const initialSeries = searchParams.get("series") as SeriesType | null;

  const [selectedSeries, setSelectedSeries] = useState<string>(initialSeries || "all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      // Seri filtresi
      if (selectedSeries !== "all" && product.series !== selectedSeries) {
        return false;
      }
      // Arama filtresi (isim, notalar, açıklama)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = product.name.toLowerCase().includes(q);
        const matchNotes = [
          ...product.notes.top,
          ...product.notes.heart,
          ...product.notes.base,
        ].some((n) => n.toLowerCase().includes(q));
        const matchDesc = product.description.toLowerCase().includes(q);
        return matchName || matchNotes || matchDesc;
      }
      return true;
    });
  }, [initialProducts, selectedSeries, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      {/* Başlık ve Açıklama */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#c5a880]/30 bg-[#c5a880]/5 text-[#c5a880] text-xs font-semibold uppercase tracking-[0.2em]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>EDİTORYAL NİŞ PARFÜMLER</span>
        </div>
        <h1 className="font-editorial text-4xl sm:text-6xl text-zinc-100">
          Ashi Koleksiyonu
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 font-light max-w-xl mx-auto leading-relaxed">
          Her biri en az %28 esans konsantrasyonuyla hazırlanan, el yapımı 50ml ve 100ml parfüm serisi. Beğendiğiniz ürünü Shopier üzerinden güvenle sipariş edebilirsiniz.
        </p>
      </div>

      {/* Filtre ve Arama Çubuğu */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 glass-panel border border-white/5">
        {/* Seri Sekmeleri */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setSelectedSeries("all")}
            className={`px-4 py-2 text-xs uppercase tracking-wider transition-all ${
              selectedSeries === "all"
                ? "bg-[#c5a880] text-zinc-950 font-bold"
                : "bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
          >
            Tüm Parfümler ({initialProducts.length})
          </button>

          {(Object.keys(SERIES_INFO) as SeriesType[]).map((seriesKey) => {
            const count = initialProducts.filter((p) => p.series === seriesKey).length;
            const info = SERIES_INFO[seriesKey];
            return (
              <button
                key={seriesKey}
                type="button"
                onClick={() => setSelectedSeries(seriesKey)}
                className={`px-4 py-2 text-xs uppercase tracking-wider transition-all ${
                  selectedSeries === seriesKey
                    ? "bg-[#c5a880] text-zinc-950 font-bold"
                    : "bg-white/5 text-zinc-300 hover:bg-white/10"
                }`}
              >
                {info.shortLabel} ({count})
              </button>
            );
          })}
        </div>

        {/* Nota veya İsim Arama */}
        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Koku notası veya isim ara... (ör. Gül, Deri, Misk)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-zinc-900 border border-white/10 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-[#c5a880] transition-colors"
          />
        </div>
      </div>

      {/* Ürün Listesi Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 space-y-4 border border-dashed border-white/10">
          <p className="text-zinc-400 text-sm">Aradığınız kriterlere uygun parfüm bulunamadı.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedSeries("all");
              setSearchQuery("");
            }}
            className="px-4 py-2 bg-white/10 text-xs uppercase font-semibold text-zinc-200 hover:bg-white/20 transition-colors"
          >
            Filtreleri Temizle
          </button>
        </div>
      )}

      {/* Shopier Mağaza Banner */}
      <div className="p-8 sm:p-12 glass-panel-gold border border-[#c5a880]/30 text-center space-y-4">
        <h3 className="font-editorial text-2xl sm:text-3xl text-zinc-100">
          Tüm Ürünleri Doğrudan Shopier&apos;de Görün
        </h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          Shopier vitrinimiz üzerinden indirimleri ve stok durumunu canlı takip edebilir, sepetinizi oluşturabilirsiniz.
        </p>
        <div className="pt-2">
          <a
            href={siteConfig.shopierStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#c5a880] hover:bg-[#dfc8a8] text-zinc-950 text-xs uppercase font-bold tracking-wider transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Shopier Mağazamızı Ziyaret Et</span>
          </a>
        </div>
      </div>
    </div>
  );
}
