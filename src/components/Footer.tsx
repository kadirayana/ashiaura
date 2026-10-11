import Link from "next/link";
import { siteConfig } from "@/data/siteConfig";
import { ShieldCheck, Truck, Sparkles, ArrowUpRight, Phone } from "lucide-react";

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-white/5 text-zinc-400">
      {/* Güven ve Avantajlar Rozetleri */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#c5a880]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-zinc-100 text-sm font-semibold tracking-wide">Shopier & 3D Secure</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Tüm ödemeler Shopier altyapısında 256-bit SSL şifrelemeyle güvendedir.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#c5a880]">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-zinc-100 text-sm font-semibold tracking-wide">%30+ Extrait de Parfum</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  En yüksek esans konsantrasyonuyla 14 saate varan olağanüstü kalıcılık.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#c5a880]">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-zinc-100 text-sm font-semibold tracking-wide">Ücretsiz Sigortalı Kargo</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Tüm Türkiye siparişlerinde özel lüks kutusunda ücretsiz ve hızlı gönderim.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ana Footer Bağlantıları */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Logo & Manifesto */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-block group">
              <span className="font-editorial text-2xl tracking-[0.3em] uppercase text-zinc-100 group-hover:text-[#c5a880] transition-colors">
                ASHI
              </span>
              <span className="block text-[9px] uppercase tracking-[0.45em] text-zinc-400 font-sans-clean mt-0.5">
                A U R A
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-zinc-400 max-w-sm">
              Koku, görünmeyen auranızdır. İzmir’de el işçiliğiyle hazırlanan Ashi parfümleri; yüksek esans oranı, saf yağlar ve editoryal tasarım felsefesiyle üretilir.
            </p>
            <div className="pt-2 flex items-center gap-4 text-zinc-300">
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 hover:text-[#c5a880] transition-colors"
                aria-label="Instagram"
              >
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${siteConfig.contact.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 hover:text-[#c5a880] transition-colors"
                aria-label="WhatsApp"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Koleksiyon */}
          <div className="space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-widest text-zinc-200">Koleksiyon</h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/collection" className="hover:text-zinc-100 transition-colors">
                  Tüm Parfümler
                </Link>
              </li>
              <li>
                <Link href="/collection?series=men" className="hover:text-zinc-100 transition-colors">
                  Erkek Serisi (Koyu, Mat)
                </Link>
              </li>
              <li>
                <Link href="/collection?series=women" className="hover:text-zinc-100 transition-colors">
                  Kadın Serisi (Pastel, İpeksi)
                </Link>
              </li>
              <li>
                <Link href="/collection?series=unisex" className="hover:text-zinc-100 transition-colors">
                  Unisex Serisi (Şeffaf, Asimetrik)
                </Link>
              </li>
            </ul>
          </div>

          {/* Kurumsal & Destek */}
          <div className="space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-widest text-zinc-200">Kurumsal</h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/about" className="hover:text-zinc-100 transition-colors">
                  Hikayemiz & Felsefe
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-zinc-100 transition-colors">
                  İletişim & Lokasyon
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-zinc-100 transition-colors">
                  Sıkça Sorulan Sorular
                </Link>
              </li>
              <li>
                <a
                  href={`https://wa.me/${siteConfig.contact.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-zinc-100 inline-flex items-center gap-1 transition-colors"
                >
                  WhatsApp Sipariş Hattı <ArrowUpRight className="w-3 h-3 opacity-60" />
                </a>
              </li>
            </ul>
          </div>

          {/* Güvenli Alışveriş */}
          <div className="space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-widest text-zinc-200">Shopier Mağaza</h5>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Resmi satışlarımız Shopier güvencesiyle yürütülmektedir. Kredi kartı, banka kartı ve havale/EFT ile anında satın alabilirsiniz.
            </p>
            <div className="pt-2">
              <a
                href={siteConfig.shopierStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#c5a880] hover:text-[#dfc8a8] font-medium tracking-wide"
              >
                Shopier Vitrinine Git <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Alt Telif Çizgisi */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <p>© {new Date().getFullYear()} Ashi Aura (ashiaura.com). Tüm hakları saklıdır.</p>
          <p className="flex items-center gap-3">
            <span>Domain: ashiaura.com</span>
            <span>•</span>
            <span>Altyapı: Vercel & Shopier</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
