import Link from "next/link";
import Image from "next/image";
import { getAllProducts, getFeaturedProducts, SERIES_INFO } from "@/data/products";
import { siteConfig } from "@/data/siteConfig";
import { ProductCard } from "@/components/ProductCard";
import { ArrowRight, ShoppingBag, Sparkles, ShieldCheck, Flame, Droplets, Compass } from "lucide-react";

export default function HomePage() {
  const featured = getFeaturedProducts();
  const allProducts = getAllProducts();

  return (
    <div className="relative overflow-hidden">
      {/* Arka Plan Atmosferik Işıklar */}
      <div className="glow-spot top-[-100px] left-1/2 -translate-x-1/2" />
      <div className="glow-spot bottom-[30%] right-[-100px]" />

      {/* ========================================================
          1. HERO BÖLÜMÜ
      ======================================================== */}
      <section className="relative min-h-[90vh] flex items-center justify-center border-b border-white/5 px-4 sm:px-6 lg:px-8 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(197,168,128,0.15),rgba(255,255,255,0))]" />

        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#c5a880]/30 bg-[#c5a880]/5 text-[#c5a880] text-xs font-semibold uppercase tracking-[0.25em]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NİŞ PARFÜM KOLEKSİYONU &middot; İZMİR</span>
          </div>

          <h1 className="font-editorial text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-zinc-100 leading-[1.05]">
            Koku, görünmeyen <br />
            <span className="italic text-gold-gradient font-normal">auranızdır.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-zinc-300 leading-relaxed font-light">
            Ashi; yüksek konsantrasyonlu saf yağlar, zanaatkar şişeler ve üç özgün seriyle (Erkek, Kadın, Unisex) duyuları yeniden tanımlar. Resmi satışlar güvenli Shopier altyapısıyla sunulmaktadır.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/collection"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-zinc-100 hover:bg-[#c5a880] text-zinc-950 font-semibold text-xs uppercase tracking-widest transition-all"
            >
              <span>Koleksiyonu Keşfet</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href={siteConfig.shopierStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/15 hover:border-[#c5a880] bg-white/5 hover:bg-white/10 text-zinc-100 font-semibold text-xs uppercase tracking-widest transition-all"
            >
              <ShoppingBag className="w-4 h-4 text-[#c5a880]" />
              <span>Shopier Mağazası</span>
            </a>
          </div>

          {/* Hızlı İstatistikler */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto border-t border-white/5 text-center">
            <div>
              <div className="font-editorial text-2xl text-zinc-100">%30+</div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 mt-1">Extrait Oranı</div>
            </div>
            <div>
              <div className="font-editorial text-2xl text-zinc-100">14+ Saat</div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 mt-1">Kalıcılık</div>
            </div>
            <div>
              <div className="font-editorial text-2xl text-zinc-100">3 Seri</div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 mt-1">Erkek / Kadın / Unisex</div>
            </div>
            <div>
              <div className="font-editorial text-2xl text-zinc-100">3D Secure</div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 mt-1">Shopier Güvencesi</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. ÜÇ SERİ VİTRİNİ (Erkek, Kadın, Unisex)
      ======================================================== */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-white/5">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-[#c5a880]">KÜRATÖRLÜ KARAKTERLER</p>
          <h2 className="font-editorial text-3xl sm:text-5xl text-zinc-100">Üç Seri, Üç Ayrı Ruh</h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            Her seri, koku piramidinden şişe tasarımına kadar kendi özgün karakterine göre tasarlandı.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Erkek Serisi Kartı (Koyu, Mat) */}
          <Link
            href="/collection?series=men"
            className="group relative p-8 bg-zinc-950 border border-zinc-800 hover:border-[#c5a880] transition-all flex flex-col justify-between min-h-[380px]"
          >
            <div>
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-6">
                <Flame className="w-5 h-5 text-[#c5a880]" />
              </div>
              <div className="text-xs uppercase tracking-widest text-[#c5a880] mb-2">01 &middot; ERKEK SERİSİ</div>
              <h3 className="font-editorial text-2xl text-zinc-100 group-hover:text-[#c5a880] transition-colors">
                Koyu, Mat & Maskülen
              </h3>
              <p className="text-xs text-zinc-400 mt-4 leading-relaxed">
                İsli odunlar, derin tütün, kuru deri ve tütsü akorları. Karanlık ve net bir karizma sunan Extrait formüller.
              </p>
            </div>
            <div className="pt-8 flex items-center gap-2 text-xs uppercase font-semibold tracking-wider text-zinc-300 group-hover:text-[#c5a880]">
              <span>Erkek Parfümlerini İncele</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Kadın Serisi Kartı (Pastel, İpeksi, Serif) */}
          <Link
            href="/collection?series=women"
            className="group relative p-8 bg-[#131110] border border-[#302824] hover:border-[#c5a880] transition-all flex flex-col justify-between min-h-[380px]"
          >
            <div>
              <div className="w-10 h-10 rounded-full bg-[#201b17] border border-[#40352f] flex items-center justify-center text-[#dfc8a8] mb-6">
                <Droplets className="w-5 h-5 text-[#dfc8a8]" />
              </div>
              <div className="text-xs uppercase tracking-widest text-[#dfc8a8] mb-2">02 &middot; KADIN SERİSİ</div>
              <h3 className="font-editorial text-2xl text-zinc-100 group-hover:text-[#dfc8a8] transition-colors">
                Pastel, İpeksi & Zarif
              </h3>
              <p className="text-xs text-zinc-400 mt-4 leading-relaxed">
                Taze gül yaprakları, şampanya ışıltısı ve sıcak kehribar notaları. Cilde ipek gibi oturan sofistike kadınsı silüet.
              </p>
            </div>
            <div className="pt-8 flex items-center gap-2 text-xs uppercase font-semibold tracking-wider text-zinc-300 group-hover:text-[#dfc8a8]">
              <span>Kadın Parfümlerini İncele</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Unisex Serisi Kartı (Şeffaf, Asimetrik, Mineral) */}
          <Link
            href="/collection?series=unisex"
            className="group relative p-8 bg-zinc-950 border border-zinc-800 hover:border-zinc-400 transition-all flex flex-col justify-between min-h-[380px]"
          >
            <div>
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-300 mb-6">
                <Compass className="w-5 h-5 text-zinc-200" />
              </div>
              <div className="text-xs uppercase tracking-widest text-zinc-400 mb-2">03 &middot; UNISEX SERİSİ</div>
              <h3 className="font-editorial text-2xl text-zinc-100 group-hover:text-zinc-200 transition-colors">
                Şeffaf & Asimetrik Mineral
              </h3>
              <p className="text-xs text-zinc-400 mt-4 leading-relaxed">
                Deniz tuzu kristalleri, beyaz çay ve saf misk. Cinsiyetsiz, heykelsi ve modern minimalizmin kokusal manifestosu.
              </p>
            </div>
            <div className="pt-8 flex items-center gap-2 text-xs uppercase font-semibold tracking-wider text-zinc-300 group-hover:text-white">
              <span>Unisex Parfümleri İncele</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* ========================================================
          3. ÖNE ÇIKAN PARFÜMLER (Featured)
      ======================================================== */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-white/5">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#c5a880] mb-2">İCONIC SELECTION</p>
            <h2 className="font-editorial text-3xl sm:text-5xl text-zinc-100">Öne Çıkan Parfümler</h2>
          </div>
          <Link
            href="/collection"
            className="inline-flex items-center gap-2 text-xs uppercase font-semibold tracking-wider text-[#c5a880] hover:text-[#dfc8a8] transition-colors"
          >
            <span>Tüm 6 Parfümü Gör</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ========================================================
          4. KOKU MİMARİSİ (Piramit Anlatımı)
      ======================================================== */}
      <section className="py-24 bg-zinc-950 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-[0.25em] text-[#c5a880]">FORMÜLASYON ZANAATI</span>
              <h2 className="font-editorial text-3xl sm:text-5xl text-zinc-100 leading-tight">
                Bir Parfümün Zaman İçindeki Yolculuğu
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-light">
                Ashi parfümleri monolitik değildir; teninizle temas ettiği ilk andan itibaren katman katman açılır. Yüksek esans oranı sayesinde üst, kalp ve dip notalar arasındaki geçişler pürüzsüz ve derindir.
              </p>

              <div className="space-y-4 pt-4">
                <div className="p-4 border-l-2 border-[#c5a880] bg-white/[0.02]">
                  <h4 className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">1. Üst Notalar (Açılış)</h4>
                  <p className="text-xs text-zinc-400 mt-1">İlk sıktığınız anda yayılan, ferah ve tazeleyici ilk izlenim (15-30 dakika).</p>
                </div>
                <div className="p-4 border-l-2 border-[#c5a880]/60 bg-white/[0.02]">
                  <h4 className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">2. Kalp Notaları (Karakter)</h4>
                  <p className="text-xs text-zinc-400 mt-1">Parfümün gerçek ruhu ve derinliği; tende 2 ila 6 saat boyunca hakim kalan özler.</p>
                </div>
                <div className="p-4 border-l-2 border-[#c5a880]/30 bg-white/[0.02]">
                  <h4 className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">3. Dip Notalar (İmza Temel)</h4>
                  <p className="text-xs text-zinc-400 mt-1">Akşam saatlerinde cildinizde ve kumaşlarda 14+ saat boyunca kalan asil odunlar ve amber.</p>
                </div>
              </div>
            </div>

            {/* Görsel / Bilgi Kutusu */}
            <div className="relative p-8 sm:p-12 glass-panel-gold space-y-8">
              <div className="font-editorial text-2xl text-zinc-100">
                &ldquo;Koku bir süs eşyası değil, kişinin mekanda bıraktığı görünmeyen aurasıdır.&rdquo;
              </div>
              <div className="space-y-3 border-t border-white/10 pt-6 text-xs text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Üretim Yeri:</span>
                  <span className="font-medium text-zinc-200">İzmir / Türkiye</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Esans Kaynakları:</span>
                  <span className="font-medium text-zinc-200">Grasse, Isparta, Calabria</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Hacim Seçenekleri:</span>
                  <span className="font-medium text-zinc-200">50ml & 100ml</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Ödeme & Gönderim:</span>
                  <span className="font-medium text-[#c5a880]">Shopier (3D Secure)</span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={siteConfig.shopierStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-[#dfc8a8] to-[#c5a880] text-zinc-950 text-xs font-semibold uppercase tracking-wider"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Shopier Mağazasını Aç</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. SHOPIER GÜVENLİK VE SİPARİŞ ADIMLARI
      ======================================================== */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12 space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-[#c5a880]">GÜVENLİ VE HIZLI ALIŞVERİŞ</p>
          <h2 className="font-editorial text-2xl sm:text-4xl text-zinc-100">Nasıl Satın Alırım?</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="p-6 bg-white/[0.02] border border-white/5 space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#c5a880]/10 text-[#c5a880] flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h4 className="text-sm font-semibold text-zinc-100">Parfümünü ve Boyutunu Seç</h4>
            <p className="text-xs text-zinc-400">
              50ml veya 100ml seçeneklerinden dilediğinizi belirleyin, &ldquo;Satın Al&rdquo; butonuna tıklayın.
            </p>
          </div>

          <div className="p-6 bg-white/[0.02] border border-white/5 space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#c5a880]/10 text-[#c5a880] flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h4 className="text-sm font-semibold text-zinc-100">Shopier&apos;de Güvenle Öde</h4>
            <p className="text-xs text-zinc-400">
              Otomatik açılan Shopier sayfasında kart veya havale ile 3D Secure güvencesiyle ödemenizi tamamlayın.
            </p>
          </div>

          <div className="p-6 bg-white/[0.02] border border-white/5 space-y-3">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#c5a880]/10 text-[#c5a880] flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h4 className="text-sm font-semibold text-zinc-100">Aynı Gün Sigortalı Kargo</h4>
            <p className="text-xs text-zinc-400">
              Siparişiniz özel korumalı Ashi hediye kutusunda hazırlanır, takip numarası SMS ile iletilir.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
