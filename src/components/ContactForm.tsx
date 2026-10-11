"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="p-8 bg-zinc-950 border border-[#c5a880]/30 text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-[#c5a880] mx-auto" />
        <h4 className="font-editorial text-2xl text-zinc-100">Mesajınız Alındı</h4>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
          Talebiniz koku danışmanımıza iletildi. En geç birkaç saat içinde e-posta veya telefon yoluyla sizinle iletişime geçeceğiz.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="text-xs text-[#c5a880] underline hover:text-white pt-2"
        >
          Yeni bir mesaj gönder
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 bg-zinc-950 border border-white/5 space-y-6">
      <h3 className="font-editorial text-2xl text-zinc-100">Bize Mesaj Gönderin</h3>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name" className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
            Adınız Soyadınız
          </label>
          <input
            id="name"
            required
            type="text"
            placeholder="Örn: Kadir Ayana"
            className="w-full px-3.5 py-2.5 text-xs bg-zinc-900 border border-white/10 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#c5a880]"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
            E-Posta Adresiniz
          </label>
          <input
            id="email"
            required
            type="email"
            placeholder="ornek@alanadi.com"
            className="w-full px-3.5 py-2.5 text-xs bg-zinc-900 border border-white/10 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#c5a880]"
          />
        </div>

        <div>
          <label htmlFor="subject" className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
            Konu
          </label>
          <select
            id="subject"
            className="w-full px-3.5 py-2.5 text-xs bg-zinc-900 border border-white/10 text-zinc-200 focus:outline-none focus:border-[#c5a880]"
          >
            <option>Parfüm Tavsiyesi & Koku Analizi</option>
            <option>Shopier Sipariş Durumu</option>
            <option>Kurumsal / Toptan İşbirliği</option>
            <option>Diğer</option>
          </select>
        </div>

        <div>
          <label htmlFor="message" className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1">
            Mesajınız
          </label>
          <textarea
            id="message"
            required
            rows={4}
            placeholder="Sorunuzu veya talebinizi buraya yazabilirsiniz..."
            className="w-full px-3.5 py-2.5 text-xs bg-zinc-900 border border-white/10 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-[#c5a880]"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-[#c5a880] hover:bg-[#dfc8a8] text-zinc-950 font-bold text-xs uppercase tracking-wider transition-colors"
        >
          Mesajı İlet
        </button>
      </form>
    </div>
  );
}
