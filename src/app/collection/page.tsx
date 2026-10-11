import { Suspense } from "react";
import type { Metadata } from "next";
import { getAllProducts } from "@/data/products";
import { CollectionClient } from "./CollectionClient";

export const metadata: Metadata = {
  title: "Koleksiyon — Erkek, Kadın & Unisex Niş Parfümler",
  description: "Ashi Aura parfüm koleksiyonu. 50ml ve 100ml Extrait de Parfum formülleri. Güvenli Shopier siparişi ile kapınızda.",
  alternates: {
    canonical: "https://ashiaura.com/collection",
  },
};

export default function CollectionPage() {
  const products = getAllProducts();

  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-xs uppercase tracking-widest text-[#c5a880] animate-pulse">
          Koleksiyon Yükleniyor...
        </div>
      </div>
    }>
      <CollectionClient initialProducts={products} />
    </Suspense>
  );
}
