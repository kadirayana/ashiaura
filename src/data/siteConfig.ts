export interface SiteConfig {
  brandName: string;
  tagline: string;
  description: string;
  url: string;
  shopierStoreUrl: string;
  contact: {
    phone: string;
    email: string;
    whatsapp: string;
    address: string;
    city: string;
  };
  social: {
    instagram: string;
  };
}

export const siteConfig: SiteConfig = {
  brandName: "Ashi",
  tagline: "Koku, Görünmeyen Auranızdır",
  description: "Ashi Aura — El yapımı, yüksek esans oranına sahip niş parfümler. Erkek, Kadın ve Unisex serileriyle İzmir'de tasarlandı. Güvenli alışveriş Shopier üzerinden.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://ashiaura.com",
  
  // [BURAYI DOLDUR: Shopier genel mağaza linkiniz]
  shopierStoreUrl: process.env.NEXT_PUBLIC_SHOPIER_STORE_URL || "https://www.shopier.com/ashiaura",
  
  contact: {
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "+90 536 943 39 43",
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "info@ashiaura.com",
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "905369433943",
    address: "Alsancak, Konak",
    city: "İzmir, Türkiye",
  },
  
  social: {
    // [BURAYI DOLDUR: Instagram kullanıcı adınız]
    instagram: "https://instagram.com/ashiaura",
  },
};
