import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/data/siteConfig";
import { Sparkles, ArrowRight, ShieldCheck, Gem, Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Hikayemiz & Felsefemiz",
  description: "Ashi Aura niş parfüm evinin doğuşu. İzmir Körfezi'nden ilham alan el yapımı Extrait de Parfum zanaatı.",
  alternates: {
    canonical: "https://ashiaura.com/about",
  },
};

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-20">
      {/* Başlık Alanı */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#c5a880]/30 bg-[#c5a880]/5 text-[#c5a880] text-xs font-semibold uppercase tracking-[0.2em]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ZANAAT VE VİZYON</span>
        </div>
        <h1 className="font-editorial text-4xl sm:text-6xl text-zinc-100">
          Görünmeyen Bir Varlık: Ashi Aura
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 font-light max-w-2xl mx-auto leading-relaxed">
          Koku, hafızanın en saf anahtarıdır. Kelimelerin bittiği yerde başlayan bir kimlik ve duruş manifestosudur.
        </p>
      </div>

      {/* Manifest & Hikaye Bölümü */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6 text-xs sm:text-sm text-zinc-300 font-light leading-relaxed">
          <p>
            <strong className="text-zinc-100 font-semibold">Ashi</strong>, seri üretimin tekdüze aromalarına bir başkaldırı olarak İzmir’de doğdu. Parfümün yalnızca bir koku değil, kişinin bulunduğu mekana bıraktığı görünmeyen bir aura olduğuna inanıyoruz.
          </p>
          <p>
            Formülasyonlarımızda sentetik kolaycılık yerine, dünyanın en seçkin bölgelerinden temin edilen doğal esansları kullanıyoruz: Grasse’ın nadir gülleri, İtalya’nın güneşli narenciyeleri ve kadim Uzak Doğu sandal ağaçları.
          </p>
          <p>
            Her bir şişe, standart ticari parfümlerdeki %10-15’lik oranların aksine, <strong className="text-[#c5a880] font-semibold">%30 ve üzeri Extrait de Parfum</strong> konsantrasyonunda elle doldurulur ve dinlendirilir.
          </p>
        </div>

        <div className="p-8 sm:p-10 glass-panel-gold space-y-6 border border-[#c5a880]/30">
          <div className="font-editorial text-2xl text-zinc-100">Temel İlkelerimiz</div>
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <Gem className="w-4 h-4 text-[#c5a880] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-200 block">Saf Esans Zenginliği</span>
                <span className="text-zinc-400">Su katılarak seyreltilmemiş, derin ve katmanlı extrait yoğunluğu.</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Compass className="w-4 h-4 text-[#c5a880] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-200 block">3 Karakter Serisi</span>
                <span className="text-zinc-400">Erkek (Koyu/Mat), Kadın (Pastel/Zarif) ve Unisex (Şeffaf/Mineral).</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-[#c5a880] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-200 block">Güvenli Shopier Deneyimi</span>
                <span className="text-zinc-400">Resmi ödemeler ve teslimat adımları Shopier güvencesiyle yürütülür.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Şişeleme & Tasarım Felsefesi */}
      <div className="p-10 bg-zinc-950 border border-white/5 space-y-6 text-center">
        <h3 className="font-editorial text-2xl sm:text-3xl text-zinc-100">
          Heykelsi Şişe ve Minimalist Estetik
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Şişelerimiz sadece kokuyu koruyan bir kap değil, mekanınızda gururla sergileyeceğiniz bir sanat nesnesidir. Ağır tabanlı cam, özel mat kaplamalar ve asimetrik silüetler bu felsefenin bir yansımasıdır.
        </p>
        <div className="pt-4">
          <Link
            href="/collection"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#c5a880] hover:bg-[#dfc8a8] text-zinc-950 text-xs uppercase font-bold tracking-wider transition-colors"
          >
            <span>Koleksiyonu İnceleyin</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
