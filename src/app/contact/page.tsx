import type { Metadata } from "next";
import { siteConfig } from "@/data/siteConfig";
import { ContactForm } from "@/components/ContactForm";
import { Phone, Mail, MapPin, Sparkles, MessageCircle, ArrowUpRight } from "lucide-react";

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

export const metadata: Metadata = {
  title: "İletişim & Stüdyo",
  description: "Ashi Aura ile iletişime geçin. Parfüm danışmanlığı, Shopier sipariş desteği ve WhatsApp hattı.",
  alternates: {
    canonical: "https://ashiaura.com/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-16">
      {/* Başlık */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#c5a880]/30 bg-[#c5a880]/5 text-[#c5a880] text-xs font-semibold uppercase tracking-[0.2em]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>BİZE ULAŞIN</span>
        </div>
        <h1 className="font-editorial text-4xl sm:text-6xl text-zinc-100">
          Ashi İletişim & Danışmanlık
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 font-light max-w-lg mx-auto">
          Teninize en uygun parfümü seçmek, özel siparişleriniz veya Shopier alışverişleriniz için bizimle dilediğiniz zaman temas kurabilirsiniz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Sol: İletişim Bilgileri ve WhatsApp */}
        <div className="space-y-8">
          <div className="p-8 glass-panel-gold border border-[#c5a880]/30 space-y-6">
            <h3 className="font-editorial text-2xl text-zinc-100">Hızlı İletişim Kanalları</h3>

            <div className="space-y-4 text-xs text-zinc-300">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[#c5a880] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-zinc-100 block">Stüdyo:</span>
                  <span>{siteConfig.contact.address}, {siteConfig.contact.city}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-[#c5a880] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-zinc-100 block">Telefon:</span>
                  <a href={`tel:${siteConfig.contact.phone}`} className="hover:text-[#c5a880] transition-colors">
                    {siteConfig.contact.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#c5a880] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-zinc-100 block">E-Posta:</span>
                  <a href={`mailto:${siteConfig.contact.email}`} className="hover:text-[#c5a880] transition-colors">
                    {siteConfig.contact.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <InstagramIcon className="w-4 h-4 text-[#c5a880] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-zinc-100 block">Instagram:</span>
                  <a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-[#c5a880] transition-colors">
                    @ashiaura
                  </a>
                </div>
              </div>
            </div>

            {/* WhatsApp Doğrudan Butonu */}
            <div className="pt-2">
              <a
                href={`https://wa.me/${siteConfig.contact.whatsapp}?text=Merhaba,%20Ashi%20Aura%20parf%C3%BCmleri%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp Danışma Hattı</span>
                <ArrowUpRight className="w-4 h-4 opacity-70" />
              </a>
            </div>
          </div>
        </div>

        {/* Sağ: Mesaj Formu */}
        <ContactForm />
      </div>
    </div>
  );
}
