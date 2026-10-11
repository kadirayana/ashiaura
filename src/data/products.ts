export type SeriesType = 'men' | 'women' | 'unisex';

export interface ProductVariant {
  size: '50ml' | '100ml';
  price: number;
  originalPrice?: number;
  // [BURAYI DOLDUR: Her varyant için özel Shopier linki]
  shopierUrl: string;
  inStock: boolean;
}

export interface OlfactoryNotes {
  top: string[];    // Üst Notalar (İlk 15-30 dakika duyulan açılış)
  heart: string[];  // Kalp Notaları (Parfümün ana karakteri, 2-6 saat)
  base: string[];   // Dip Notalar (Ciltte en uzun süre kalan kalıcı temel)
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  series: SeriesType;
  subtitle: string;
  tagline: string;
  description: string;
  story: string;
  concentration: string;
  longevity: string;
  sillage: string;
  season: string;
  notes: OlfactoryNotes;
  variants: ProductVariant[];
  image: string;
  badge?: string;
  featured?: boolean;
}

export const SERIES_INFO = {
  men: {
    label: 'Erkek Serisi',
    shortLabel: 'Erkek',
    tagline: 'Koyu, Mat & Maskülen Silüet',
    description: 'Derin odunsu tonlar, fırçalanmış deri ve tütsü notalarıyla tasarlanan güçlü ve karizmatik kompozisyonlar.',
    accentColor: '#1A1A1E',
    borderColor: '#34343B',
    textColor: '#E5E5EB',
    bgBadge: 'bg-zinc-900 text-zinc-100 border-zinc-700',
  },
  women: {
    label: 'Kadın Serisi',
    shortLabel: 'Kadın',
    tagline: 'Pastel, Zarif & İpeksi Dokunuş',
    description: 'Nadir çiçek özleri, sıcak amber ve kremsi vanilya nüanslarıyla işlenmiş lüks ve editoryal kokular.',
    accentColor: '#F6F0EA',
    borderColor: '#E2D5C8',
    textColor: '#2E221B',
    bgBadge: 'bg-[#F6EFEA] text-[#694833] border-[#E8D9CD]',
  },
  unisex: {
    label: 'Unisex Serisi',
    shortLabel: 'Unisex',
    tagline: 'Şeffaf, Asimetrik & Çağdaş Aura',
    description: 'Cinsiyet sınırlarını aşan, mineral esintiler ve beyaz misk ile dengelenmiş heykelsi ve saf formüller.',
    accentColor: '#F5F5F7',
    borderColor: '#D8D8DF',
    textColor: '#19191D',
    bgBadge: 'bg-zinc-100 text-zinc-800 border-zinc-300',
  },
} as const;

export const products: Product[] = [
  // ==========================================
  // ERKEK SERİSİ (Koyu, Mat, Maskülen)
  // ==========================================
  {
    id: 'ashi-noir-ebene',
    slug: 'noir-ebene',
    name: 'Noir Ébène',
    series: 'men',
    subtitle: 'Extrait de Parfum — 01',
    tagline: 'Gecenin derinliğinde parlayan tütsü ve abanoz ağacı',
    description: 'İsli guaiac ağacı, olibanum tütsüsü ve kakule açılışıyla başlayan Noir Ébène; karanlık, sofistike ve ödünsüz bir silüet çizer.',
    story: 'İzmir Körfezi’nin rüzgarlı gece serinliğinden ilham alan Noir Ébène, el işçiliğiyle damıtılmış koyu esansların kusursuz dengesidir.',
    concentration: 'Extrait de Parfum (%32 Esans)',
    longevity: '14+ Saat',
    sillage: 'Güçlü & İz Bırakan',
    season: 'Sonbahar / Kış / Akşam',
    notes: {
      top: ['Kakule', 'Siyah Biber', 'Bergamot'],
      heart: ['Tütsü (Olibanum)', 'Guaiac Ağacı', 'Deri'],
      base: ['Abanoz Ağacı', 'Ambergris', 'Paçuli'],
    },
    variants: [
      {
        size: '50ml',
        price: 1850,
        // [BURAYI DOLDUR: 50ml Shopier linkini buraya yapıştırın]
        shopierUrl: 'https://www.shopier.com/ashiaura?product=noir-ebene-50ml',
        inStock: true,
      },
      {
        size: '100ml',
        price: 2750,
        // [BURAYI DOLDUR: 100ml Shopier linkini buraya yapıştırın]
        shopierUrl: 'https://www.shopier.com/ashiaura?product=noir-ebene-100ml',
        inStock: true,
      },
    ],
    // [BURAYI DOLDUR: Ürün görsel yolu]
    image: '/images/products/cube.png',
    badge: 'Çok Satan',
    featured: true,
  },
  {
    id: 'ashi-vetiver-cuir',
    slug: 'vetiver-cuir',
    name: 'Vétiver Cuir',
    series: 'men',
    subtitle: 'Extrait de Parfum — 02',
    tagline: 'Toprağın köklerinden yükselen kuru vetiver ve süet',
    description: 'Kavrulmuş kahve çekirdekleri, vetiver kökleri ve İtalyan süetinin modern bir füzyonu. Klasik erkeksi kodların çağdaş yorumu.',
    story: 'Zanaatkar bir deri atölyesinin kokusuyla ıslak orman toprağının asil birlikteliği.',
    concentration: 'Extrait de Parfum (%30 Esans)',
    longevity: '12+ Saat',
    sillage: 'Orta - Güçlü',
    season: 'Dört Mevsim',
    notes: {
      top: ['Greyfurt', 'Pembe Biber', 'Ardıç'],
      heart: ['Haiti Vetiveri', 'Sedir Ağacı', 'Kavrulmuş Kahve'],
      base: ['Süet Deri', 'Meşe Yosunu', 'Kuru Misk'],
    },
    variants: [
      {
        size: '50ml',
        price: 1750,
        // [BURAYI DOLDUR: 50ml Shopier linkini buraya yapıştırın]
        shopierUrl: 'https://www.shopier.com/ashiaura?product=vetiver-cuir-50ml',
        inStock: true,
      },
      {
        size: '100ml',
        price: 2600,
        // [BURAYI DOLDUR: 100ml Shopier linkini buraya yapıştırın]
        shopierUrl: 'https://www.shopier.com/ashiaura?product=vetiver-cuir-100ml',
        inStock: true,
      },
    ],
    image: '/images/products/mira.png',
    featured: false,
  },

  // ==========================================
  // KADIN SERİSİ (Pastel, Zarif, Serif)
  // ==========================================
  {
    id: 'ashi-rose-soie',
    slug: 'rose-soie',
    name: 'Rose de Soie',
    series: 'women',
    subtitle: 'Extrait de Parfum — 03',
    tagline: 'İpeksi Isparta gülü, şampanya köpüğü ve pudramsı kaşmir',
    description: 'Sabah çiğiyle toplanmış taze taç yapraklar, beyaz şeftali ve sıcak sandal ağacının sarmaladığı editoryal bir zarafet.',
    story: 'Fransız parfümeri geleneği ile Anadolu’nun kadim gül hasadının buluştuğu zamansız bir başyapıt.',
    concentration: 'Extrait de Parfum (%28 Esans)',
    longevity: '12+ Saat',
    sillage: 'Zarif & Kalıcı',
    season: 'İlkbahar / Yaz / Gündüz-Gece',
    notes: {
      top: ['Şampanya Akoru', 'Beyaz Şeftali', 'Mandalina'],
      heart: ['Isparta Gülü', 'Şakayık', 'Manolya'],
      base: ['Kaşmir Ağacı', 'Beyaz Misk', 'Madagaskar Vanilyası'],
    },
    variants: [
      {
        size: '50ml',
        price: 1850,
        // [BURAYI DOLDUR: 50ml Shopier linkini buraya yapıştırın]
        shopierUrl: 'https://www.shopier.com/ashiaura?product=rose-soie-50ml',
        inStock: true,
      },
      {
        size: '100ml',
        price: 2750,
        // [BURAYI DOLDUR: 100ml Shopier linkini buraya yapıştırın]
        shopierUrl: 'https://www.shopier.com/ashiaura?product=rose-soie-100ml',
        inStock: true,
      },
    ],
    image: '/images/products/solar.png',
    badge: 'İmza Koku',
    featured: true,
  },
  {
    id: 'ashi-ambre-celeste',
    slug: 'ambre-celeste',
    name: 'Ambre Céleste',
    series: 'women',
    subtitle: 'Extrait de Parfum — 04',
    tagline: 'Sıcak altın amber, tonka fasulyesi ve tütsülenmiş vanilya',
    description: 'Tenin sıcaklığıyla aktive olan kremsi bal ve amber notaları, etrafınızda hipnotize edici bir lüks aurası yaratır.',
    story: 'Gün batımının gökyüzünde bıraktığı altın ışıltıları cildinize mühürleyen sıcak ve büyüleyici bir koku.',
    concentration: 'Extrait de Parfum (%30 Esans)',
    longevity: '14+ Saat',
    sillage: 'Yüksek & Çekici',
    season: 'Sonbahar / Kış',
    notes: {
      top: ['Acı Badem', 'Tarçın Kabuğu', 'Sarı Frezya'],
      heart: ['Altın Amber', 'Bal Şurubu', 'Güneş Çiçeği'],
      base: ['Tonka Fasulyesi', 'Benzoin', 'Bourbon Vanilyası'],
    },
    variants: [
      {
        size: '50ml',
        price: 1800,
        // [BURAYI DOLDUR: 50ml Shopier linkini buraya yapıştırın]
        shopierUrl: 'https://www.shopier.com/ashiaura?product=ambre-celeste-50ml',
        inStock: true,
      },
      {
        size: '100ml',
        price: 2700,
        // [BURAYI DOLDUR: 100ml Shopier linkini buraya yapıştırın]
        shopierUrl: 'https://www.shopier.com/ashiaura?product=ambre-celeste-100ml',
        inStock: true,
      },
    ],
    image: '/images/products/elit_kolonya.png',
    featured: false,
  },

  // ==========================================
  // UNISEX SERİSİ (Şeffaf, Asimetrik, Mineral)
  // ==========================================
  {
    id: 'ashi-aura-blanche',
    slug: 'aura-blanche',
    name: 'Aura Blanche',
    series: 'unisex',
    subtitle: 'Extrait de Parfum — 05',
    tagline: 'Saf beyaz keten, mineral tuz kristalleri ve berrak misk',
    description: 'Cinsiyet tanımlarını geride bırakan; temiz, heykelsi ve mimari bir kompozisyon. İkinci bir ten gibi saran saf ferahlık.',
    story: 'Modern minimalizmin kokusal tanımı: Ne fazlalık bir nota, ne de eksik bir duygu. Sadece arı zarafet.',
    concentration: 'Extrait de Parfum (%30 Esans)',
    longevity: '12+ Saat',
    sillage: 'Dengeli & Manyetik',
    season: 'Dört Mevsim / İmza Koku',
    notes: {
      top: ['Deniz Tuzu', 'Calabrian Bergamot', 'Beyaz Çay'],
      heart: ['Buzlu İris', 'Sedir Yaprağı', 'Ambroxan'],
      base: ['Beyaz Misk', 'Kuru Amber', 'Kristal Yosun'],
    },
    variants: [
      {
        size: '50ml',
        price: 1900,
        // [BURAYI DOLDUR: 50ml Shopier linkini buraya yapıştırın]
        shopierUrl: 'https://www.shopier.com/ashiaura?product=aura-blanche-50ml',
        inStock: true,
      },
      {
        size: '100ml',
        price: 2850,
        // [BURAYI DOLDUR: 100ml Shopier linkini buraya yapıştırın]
        shopierUrl: 'https://www.shopier.com/ashiaura?product=aura-blanche-100ml',
        inStock: true,
      },
    ],
    image: '/images/products/cube.png',
    badge: 'Kült Favori',
    featured: true,
  },
  {
    id: 'ashi-santal-mineral',
    slug: 'santal-mineral',
    name: 'Santal Minéral',
    series: 'unisex',
    subtitle: 'Extrait de Parfum — 06',
    tagline: 'Kremamsı Avustralya sandal ağacı ve soğuk kaya kristalleri',
    description: 'Kremsi odunsu sıcaklığın serin mineral tuzlarla zıt kutuplu dansı. Hem dinginleştirici hem de baş döndürücü bir aura.',
    story: 'Ege kayalıklarının rüzgarıyla kadim sandal ağacı ormanlarının meditatif buluşması.',
    concentration: 'Extrait de Parfum (%31 Esans)',
    longevity: '13+ Saat',
    sillage: 'Fark Edilir & Hipnotik',
    season: 'Sonbahar / İlkbahar / Yaz Akşamları',
    notes: {
      top: ['Menekşe Yaprağı', 'Kakule', 'Kaya Tuzu'],
      heart: ['Sandal Ağacı', 'Papirüs', 'Deri Akoru'],
      base: ['Sedir Ağacı', 'Gri Amber', 'Kaşmiran'],
    },
    variants: [
      {
        size: '50ml',
        price: 1850,
        // [BURAYI DOLDUR: 50ml Shopier linkini buraya yapıştırın]
        shopierUrl: 'https://www.shopier.com/ashiaura?product=santal-mineral-50ml',
        inStock: true,
      },
      {
        size: '100ml',
        price: 2750,
        // [BURAYI DOLDUR: 100ml Shopier linkini buraya yapıştırın]
        shopierUrl: 'https://www.shopier.com/ashiaura?product=santal-mineral-100ml',
        inStock: true,
      },
    ],
    image: '/images/products/mira.png',
    featured: true,
  },
];

// Yardımcı Sorgu Fonksiyonları
export function getAllProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsBySeries(series: SeriesType): Product[] {
  return products.filter((p) => p.series === series);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.featured);
}
