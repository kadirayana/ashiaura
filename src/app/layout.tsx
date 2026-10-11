import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { siteConfig } from "@/data/siteConfig";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Ashi | Koku, Görünmeyen Auranızdır — Niş Parfüm Evi",
    template: "%s | Ashi Parfüm",
  },
  description: siteConfig.description,
  keywords: [
    "Ashi",
    "Ashi Parfüm",
    "Ashi Aura",
    "niş parfüm",
    "extrait de parfum",
    "erkek parfüm",
    "kadın parfüm",
    "unisex parfüm",
    "lüks parfüm",
    "kalıcı parfüm",
    "Shopier parfüm",
  ],
  authors: [{ name: "Ashi Perfumes" }],
  creator: "Ashi",
  publisher: "Ashi Aura",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: "Ashi | Koku, Görünmeyen Auranızdır",
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: "Ashi Aura",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: "/hero-bg.png",
        width: 1200,
        height: 630,
        alt: "Ashi Aura Niş Parfüm Koleksiyonu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ashi | Niş Parfüm Evi",
    description: siteConfig.description,
    images: ["/hero-bg.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Global Schema.org JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Ashi Parfüm",
    alternateName: "Ashi Aura",
    url: siteConfig.url,
    logo: `${siteConfig.url}/icon.png`,
    description: siteConfig.description,
    sameAs: [
      siteConfig.social.instagram,
      siteConfig.shopierStoreUrl,
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: siteConfig.contact.phone,
      contactType: "customer service",
      availableLanguage: "Turkish",
    },
  };

  return (
    <html lang="tr" className="scroll-smooth dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${playfair.variable} ${jakarta.variable} font-sans-clean antialiased min-h-screen flex flex-col bg-[#09090b] text-[#fafafa] selection:bg-[#c5a880]/30 selection:text-[#fafafa]`}
      >
        {/* Üst Bilgilendirme Şeridi */}
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 text-center py-2 px-4 text-xs tracking-wider uppercase border-b border-white/5 text-zinc-400">
          <span>✨ Shopier Güvencesiyle 3D Secure Ödeme &middot; Türkiye Geneli Ücretsiz Kargo</span>
        </div>

        <Navbar />
        
        <main className="flex-1">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
