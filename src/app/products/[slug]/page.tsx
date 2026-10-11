import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllProducts, getProductBySlug, SERIES_INFO } from "@/data/products";
import { siteConfig } from "@/data/siteConfig";
import { NotesPyramid } from "@/components/NotesPyramid";
import { ProductDetailPurchase } from "@/components/ProductDetailPurchase";
import { ProductCard } from "@/components/ProductCard";
import { ArrowLeft, Sparkles, Clock, Wind, Award } from "lucide-react";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const products = getAllProducts();
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return {
      title: "Parfüm Bulunamadı",
    };
  }

  return {
    title: `${product.name} — ${product.subtitle}`,
    description: product.description,
    alternates: {
      canonical: `https://ashiaura.com/products/${product.slug}`,
    },
    openGraph: {
      title: `${product.name} | Ashi Niş Parfüm`,
      description: product.description,
      url: `https://ashiaura.com/products/${product.slug}`,
      images: [
        {
          url: product.image,
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const seriesInfo = SERIES_INFO[product.series];
  const allProducts = getAllProducts();
  const relatedProducts = allProducts.filter((p) => p.slug !== product.slug).slice(0, 3);

  // Schema.org Product JSON-LD
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: `${siteConfig.url}${product.image}`,
    description: product.description,
    brand: {
      "@type": "Brand",
      name: "Ashi",
    },
    offers: product.variants.map((variant) => ({
      "@type": "Offer",
      priceCurrency: "TRY",
      price: variant.price,
      availability: variant.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: variant.shopierUrl,
    })),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      {/* Geri Dönüş Linki */}
      <div>
        <Link
          href="/collection"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 hover:text-[#c5a880] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Koleksiyona Geri Dön</span>
        </Link>
      </div>

      {/* Ana Ürün Grid (Görsel + Bilgiler) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Sol Kolon: Büyük Görsel Galerisi */}
        <div className="space-y-4 sticky top-28">
          <div className="relative aspect-square w-full bg-zinc-950 border border-white/10 p-10 flex items-center justify-center overflow-hidden">
            {/* Seri Rozeti */}
            <div className="absolute top-4 left-4 z-10">
              <span className={`text-xs uppercase tracking-wider px-3 py-1 border font-medium ${seriesInfo.bgBadge}`}>
                {seriesInfo.label}
              </span>
            </div>

            {product.badge && (
              <div className="absolute top-4 right-4 z-10">
                <span className="text-xs uppercase tracking-wider px-3 py-1 bg-[#c5a880] text-zinc-950 font-bold">
                  {product.badge}
                </span>
              </div>
            )}

            <div className="relative w-full h-full">
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-8 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                priority
              />
            </div>
          </div>

          <div className="p-4 bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs text-zinc-400">
            <span>Özel Zanaatkar Şişe Tasarımı</span>
            <span className="text-[#c5a880] font-mono">İZMİR ATÖLYE SERİSİ</span>
          </div>
        </div>

        {/* Sağ Kolon: Editoryal Detaylar & Shopier Satın Alım */}
        <div className="space-y-8">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-[#c5a880] mb-2">
              {product.subtitle}
            </div>
            <h1 className="font-editorial text-4xl sm:text-5xl md:text-6xl text-zinc-100">
              {product.name}
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 italic font-editorial mt-3 font-light">
              &ldquo;{product.tagline}&rdquo;
            </p>
          </div>

          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-light">
            {product.description}
          </p>

          {/* Performans & Konsantrasyon Kartları */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white/[0.02] border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[#c5a880]">
                <Award className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wider text-[10px]">Yoğunluk</span>
              </div>
              <div className="text-xs font-semibold text-zinc-200">{product.concentration}</div>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[#c5a880]">
                <Clock className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wider text-[10px]">Kalıcılık</span>
              </div>
              <div className="text-xs font-semibold text-zinc-200">{product.longevity}</div>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/5 space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-xs text-[#c5a880]">
                <Wind className="w-3.5 h-3.5" />
                <span className="uppercase tracking-wider text-[10px]">Yayılım</span>
              </div>
              <div className="text-xs font-semibold text-zinc-200">{product.sillage}</div>
            </div>
          </div>

          {/* Boyut Seçici ve Shopier Satın Al Bölümü */}
          <ProductDetailPurchase product={product} />

          {/* Koku Piramidi (Üst, Kalp, Dip Notalar) */}
          <div className="pt-6 border-t border-white/10 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#c5a880]" />
              <h3 className="font-editorial text-xl text-zinc-100">Koku Notaları Piramidi</h3>
            </div>
            <NotesPyramid notes={product.notes} />
          </div>

          {/* Parfüm Hikayesi */}
          <div className="p-6 glass-panel border border-white/5 space-y-3">
            <h4 className="text-xs uppercase tracking-widest text-[#c5a880]">Parfümör Hikayesi</h4>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-light">
              {product.story}
            </p>
          </div>
        </div>
      </div>

      {/* Benzer / Önerilen Parfümler */}
      <div className="pt-16 border-t border-white/10 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="font-editorial text-2xl sm:text-3xl text-zinc-100">Diğer Karakterleri Keşfedin</h2>
          <Link href="/collection" className="text-xs uppercase tracking-wider text-[#c5a880] hover:underline">
            Tüm Koleksiyon →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {relatedProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
