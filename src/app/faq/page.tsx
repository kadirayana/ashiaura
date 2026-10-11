import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/data/siteConfig";
import { Sparkles, HelpCircle, ShoppingBag, ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular (SSS)",
  description: "Ashi Aura parfümleri hakkında merak edilenler: Shopier ödeme güvenliği, kalıcılık, kargo ve hacim seçenekleri.",
  alternates: {
    canonical: "https://ashiaura.com/faq",
  },
};

export default function FAQPage() {
  const faqs = [
    {
      q: "Siparişlerimi nasıl veriyorum? Shopier ödeme güvenli midir?",
      a: "Tüm siparişlerimiz Türkiye'nin lider güvenli ödeme platformu Shopier üzerinden alınır. Sitemizdeki 'Satın Al' butonlarına tıkladığınızda doğrudan o ürünün Shopier sayfasına yönlendirilirsiniz. Kredi kartı, banka kartı veya havale seçenekleriyle 256-Bit SSL ve 3D Secure korumasıyla ödemenizi güvenle gerçekleştirebilirsiniz.",
    },
    {
      q: "Parfümlerinizin esans oranı ve kalıcılığı nedir?",
      a: "Ashi parfümleri 'Extrait de Parfum' formülasyonundadır. Standart parfümlerdeki (EDT %8-12, EDP %15-20) oranların aksine parfümlerimiz %28 ile %32 arasında saf parfüm özü içerir. Bu sayede ten kimyasına bağlı olarak 12 ila 16 saat arasında güçlü ve pürüzsüz bir kalıcılık sunar.",
    },
    {
      q: "50ml ve 100ml seçenekleri arasında fark var mıdır?",
      a: "İçerik, nota dengesi ve esans konsantrasyonu her iki boyutta da tamamen aynıdır. 50ml şişelerimiz taşınabilir ve pratik bir zarafet sunarken, 100ml şişelerimiz imza kokusunu her gün doya doya kullanmak isteyenler için avantajlı fiyatlandırmaya sahiptir.",
    },
    {
      q: "Kargo ücreti var mı? Teslimat kaç günde gerçekleşir?",
      a: "Tüm Türkiye geneline gönderimler ÜCRETSİZDİR. Hafta içi saat 15:00'e kadar verilen siparişler aynı gün özenle hazırlanarak sigortalı kargoya teslim edilir. Bölgenize bağlı olarak 1-3 iş günü içinde adresinize ulaşır.",
    },
    {
      q: "Üç seri (Erkek, Kadın, Unisex) arasındaki fark nedir?",
      a: "Erkek Serimiz koyu, mat ve derin odunsu-deri akorlarına sahiptir. Kadın Serimiz pastel, zarif ve çiçeksi-şampanya esintileri taşır. Unisex Serimiz ise cinsiyet tanımlarının ötesinde, deniz tuzu, beyaz çay ve saf mineral misklerle dengelenmiş heykelsi bir arılıktadır.",
    },
    {
      q: "Parfümü nasıl saklamalıyım?",
      a: "Doğal esansların kalitesini uzun yıllar korumak için parfümlerinizi doğrudan güneş ışığından, aşırı nemden ve ani sıcaklık değişimlerinden uzak, oda sıcaklığında saklamanızı öneririz.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-16">
      {/* Başlık */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#c5a880]/30 bg-[#c5a880]/5 text-[#c5a880] text-xs font-semibold uppercase tracking-[0.2em]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>REHBER VE DESTEK</span>
        </div>
        <h1 className="font-editorial text-4xl sm:text-6xl text-zinc-100">
          Sıkça Sorulan Sorular
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 font-light max-w-lg mx-auto">
          Ashi Aura parfümleri, Shopier sipariş akışı ve kargo süreçleri hakkında tüm merak ettikleriniz.
        </p>
      </div>

      {/* Soru Listesi */}
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="p-6 bg-zinc-950 border border-white/5 hover:border-[#c5a880]/30 transition-colors space-y-3"
          >
            <div className="flex items-start gap-3">
              <HelpCircle className="w-4 h-4 text-[#c5a880] shrink-0 mt-0.5" />
              <h3 className="text-sm sm:text-base font-semibold text-zinc-100">
                {faq.q}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 pl-7 leading-relaxed font-light">
              {faq.a}
            </p>
          </div>
        ))}
      </div>

      {/* Yardım & Shopier CTA */}
      <div className="p-8 sm:p-10 glass-panel-gold text-center space-y-4 border border-[#c5a880]/30">
        <h3 className="font-editorial text-2xl text-zinc-100">Başka Bir Sorunuz mu Var?</h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          WhatsApp danışma hattımız üzerinden anında bilgi alabilir veya Shopier vitrinimizden siparişinizi oluşturabilirsiniz.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/contact"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-zinc-100 text-xs uppercase font-semibold tracking-wider transition-colors"
          >
            İletişime Geç
          </Link>
          <a
            href={siteConfig.shopierStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#c5a880] hover:bg-[#dfc8a8] text-zinc-950 text-xs uppercase font-bold tracking-wider transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Shopier Mağazasına Git</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
