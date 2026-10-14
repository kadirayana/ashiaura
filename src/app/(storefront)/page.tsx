export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import { RequestForm } from '@/components/request-form'
import { RequestPopup } from '@/components/request-popup'
import { ProductCard } from '@/components/product-card'
import { getBaseName } from '@/lib/pricing'
import { pickRepresentative } from '@/lib/catalog'
import type { Product, Recipe } from '@/types/database'

type ProductWithRecipe = Product & {
    recipe: Recipe | null
}

interface ProductFamily {
    representative: ProductWithRecipe
    variants: ProductWithRecipe[]
}

const FEATURED_COUNT = 6

/** In-stock product families (sizes of one scent), best rated first */
async function getFeaturedFamilies(): Promise<ProductFamily[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('products')
        .select('*, recipe:recipes(*)')
        .order('fragrantica_score', { ascending: false, nullsFirst: false })

    if (error) {
        console.error('Error fetching products:', error)
        return []
    }

    const families = new Map<string, ProductWithRecipe[]>()
    for (const raw of data || []) {
        const product: ProductWithRecipe = {
            ...raw,
            recipe: Array.isArray(raw.recipe) ? raw.recipe[0] || null : raw.recipe,
        }
        const key = getBaseName(product.name)
        families.set(key, [...(families.get(key) || []), product])
    }

    return [...families.values()]
        .filter(variants => variants.some(v => v.stock > 0))
        .slice(0, FEATURED_COUNT)
        .map(variants => ({ representative: pickRepresentative(variants), variants }))
}

const PROMISES = [
    'Elle, küçük partilerle',
    'Her şişede lot numarası',
    '3 ml tester ile dene',
    'Shopier ile güvenli ödeme',
]

// Dividers for a 2×2 grid on phones and a single row on desktop
const PROMISE_CELL = [
    'pr-4',
    'pl-4 lg:pl-6 border-l',
    'pr-4 lg:pl-6 border-t lg:border-t-0 lg:border-l',
    'pl-4 lg:pl-6 border-l border-t lg:border-t-0',
]

export default async function HomePage() {
    const featured = await getFeaturedFamilies()

    return (
        <div className="min-h-screen">
            <Navbar />

            {/* Hero */}
            <section className="bg-linen border-b border-hairline">
                <div className="flex flex-wrap items-stretch">
                    <div className="flex-[1_1_480px] min-w-0 px-6 lg:pl-[max(48px,calc((100vw-1320px)/2+48px))] lg:pr-12 py-16 md:py-24 flex flex-col justify-center gap-6">
                        <p className="font-storefront-mono text-xs sm:text-[13px] tracking-[0.32em] text-umber">
                            İZMİR · EL YAPIMI · KÜÇÜK PARTİLER
                        </p>
                        <h1 className="italic font-normal text-[64px] sm:text-[88px] lg:text-[112px] leading-[0.92] tracking-[-0.01em]">
                            Kendi<br />auranı bul.
                        </h1>
                        <p className="text-[28px] sm:text-[32px] leading-tight text-umber">Sana ait bir iz.</p>
                        <div className="flex flex-wrap gap-3.5 pt-2">
                            <Link
                                href="/products"
                                className="h-14 px-8 inline-flex items-center bg-ink text-label font-storefront-mono text-[13px] sm:text-sm tracking-[0.22em] hover:bg-tan-ink transition-colors"
                            >
                                KOLEKSİYONU KEŞFET →
                            </Link>
                            <a
                                href="#tester"
                                className="h-14 px-6 inline-flex items-center border border-ink font-storefront-mono text-[13px] sm:text-sm tracking-[0.22em] hover:bg-ink hover:text-label transition-colors"
                            >
                                3 ML TESTER
                            </a>
                        </div>
                    </div>
                    <div className="flex-[1.25_1_560px] min-w-0 min-h-[420px] md:min-h-[640px] relative overflow-hidden">
                        <Image
                            src="/brand/hero.jpg"
                            alt="Ahşap kapaklı Ashi Aura parfüm şişesi traverten üzerinde"
                            fill
                            priority
                            sizes="(max-width: 1040px) 100vw, 60vw"
                            className="object-cover object-right"
                        />
                    </div>
                </div>
            </section>

            {/* Promises */}
            <section aria-label="Sözümüz" className="border-b border-hairline">
                <div className="max-w-[1320px] mx-auto px-6 lg:px-12 grid grid-cols-2 lg:grid-cols-4">
                    {PROMISES.map((text, i) => (
                        <div
                            key={text}
                            className={`py-7 flex flex-col gap-1.5 border-hairline ${PROMISE_CELL[i]}`}
                        >
                            <span className="font-storefront-mono text-[11px] tracking-[0.24em] text-tan-ink">0{i + 1}</span>
                            <span className="text-xl sm:text-[22px] font-medium leading-snug">{text}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Collection */}
            <section id="koleksiyon" className="max-w-[1320px] mx-auto px-6 lg:px-12 py-20 md:py-28 flex flex-col gap-14">
                <div className="flex flex-wrap items-end justify-between gap-6">
                    <div className="flex flex-col gap-3.5">
                        <p className="font-storefront-mono text-xs tracking-[0.3em] text-tan-ink">KOLEKSİYON</p>
                        <h2 className="italic font-normal text-5xl md:text-[68px] leading-none">Raftakiler</h2>
                    </div>
                    <Link
                        href="/products"
                        className="font-storefront-mono text-xs tracking-[0.2em] border-b border-ink pb-1 hover:text-tan-ink hover:border-tan-ink"
                    >
                        TÜMÜNÜ GÖR →
                    </Link>
                </div>

                {featured.length === 0 ? (
                    <p className="text-sand text-xl text-center py-12">Yakında yeni kokular rafta…</p>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-x-8 gap-y-16">
                        {featured.map(family => (
                            <ProductCard
                                key={family.representative.id}
                                product={family.representative}
                                variants={family.variants.length > 1 ? family.variants : undefined}
                            />
                        ))}
                    </div>
                )}

                <div className="flex justify-center">
                    <Link
                        href="/products"
                        className="h-14 px-9 inline-flex items-center border border-ink font-storefront-mono text-[13px] tracking-[0.22em] hover:bg-ink hover:text-label transition-colors"
                    >
                        TÜM KOLEKSİYON →
                    </Link>
                </div>
            </section>

            {/* Story */}
            <section id="hikaye" className="bg-linen border-y border-hairline scroll-mt-28">
                <div className="max-w-[1320px] mx-auto px-6 lg:px-12 py-20 md:py-28 flex flex-wrap items-center gap-16 lg:gap-[72px]">
                    <div className="flex-[1_1_360px] min-w-0 relative aspect-[4/5]">
                        <Image
                            src="/brand/story.jpg"
                            alt="Ashi Aura şişesi traverten üzerinde, yanında kuru çiçek"
                            fill
                            sizes="(max-width: 900px) 100vw, 40vw"
                            className="object-cover object-[50%_92%]"
                        />
                    </div>
                    <div className="flex-[1_1_520px] min-w-0 flex flex-col gap-7">
                        <p className="font-storefront-mono text-xs tracking-[0.3em] text-tan-ink">HİKAYEMİZ</p>
                        <h2 className="italic font-normal text-[44px] md:text-6xl leading-[1.05]">
                            Ashi, “aşiyan” kelimesinden geliyor: yuva.
                        </h2>
                        <div className="flex flex-col gap-4 text-xl md:text-[21px] leading-relaxed text-umber max-w-[600px]">
                            <p>Bir kuşun dal dal taşıyıp ördüğü, sıcak, küçük ve ona ait olan yer.</p>
                            <p>
                                Kokular da böyle çalışır. Bir koku bir anda insanı bir eve, bir yaz akşamına, birinin
                                boynuna götürür. Biz buna aura diyoruz: insanın etrafında kalan görünmez iz.
                            </p>
                            <p>
                                Ashi Aura, İzmir&apos;de bir kimya mühendisinin masasında başladı. Her esans tek tek tartılır,
                                formüle edilir ve deftere işlenir. Her şişenin bir lot numarası var, çünkü kokunun bir sanat
                                olduğuna, ama ölçülebilir bir sanat olduğuna inanıyoruz.
                            </p>
                            <p>
                                Küçük partilerle, elle üretiyoruz. Amacımız, sana ait bir koku: <em>yuvanın havası.</em>
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tester */}
            <section id="tester" className="max-w-[1320px] mx-auto px-6 lg:px-12 py-20 md:py-28 flex flex-wrap items-center gap-16 scroll-mt-28">
                <div className="flex-[1_1_400px] min-w-0 flex flex-col gap-5">
                    <p className="font-storefront-mono text-xs tracking-[0.3em] text-tan-ink">TESTER</p>
                    <h2 className="italic font-normal text-5xl md:text-6xl leading-none">Önce teninde dene.</h2>
                    <p className="text-xl md:text-[21px] leading-relaxed text-umber max-w-[460px]">
                        Bir kokuyu tenine sıkmadan bilemezsin. Raftaki her kokuyu 3 ml tester olarak sipariş edebilirsin;
                        50 ml şişe aldığında, seçtiğin bir tester bizden.
                    </p>
                </div>
                <div className="flex-[1_1_520px] min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-label border border-label-line px-7 pt-8 pb-6 flex flex-col gap-4 font-storefront-mono text-xs">
                        <Image src="/brand/logo-ink.svg" alt="" width={54} height={30} unoptimized className="h-[30px] w-auto self-start" />
                        <span className="border-t border-ink pt-4 text-[13px] font-bold tracking-[0.14em]">TESTER<br />3 ML</span>
                        <span className="font-storefront text-6xl leading-none">120 ₺</span>
                        <span className="border-t border-ink pt-2.5 tracking-[0.08em] text-umber">İSTEDİĞİN KOKU · ÜRÜN SAYFASINDAN</span>
                    </div>
                    <div className="bg-ink text-paper px-7 pt-8 pb-6 flex flex-col gap-4 font-storefront-mono text-xs">
                        <Image src="/brand/logo-cream.svg" alt="" width={54} height={30} unoptimized className="h-[30px] w-auto self-start" />
                        <span className="border-t border-paper pt-4 text-[13px] font-bold tracking-[0.14em]">50 ML ŞİŞEYE</span>
                        <span className="font-storefront italic text-6xl leading-none">hediye</span>
                        <span className="border-t border-paper pt-2.5 tracking-[0.08em] text-hairline">KOKUSUNU SEPETTE SEÇERSİN</span>
                    </div>
                </div>
            </section>

            {/* Custom request */}
            <section id="istek" className="bg-linen border-t border-hairline scroll-mt-28">
                <div className="max-w-[1320px] mx-auto px-6 lg:px-12 py-20 md:py-28 flex flex-wrap gap-16">
                    <div className="flex-[1_1_400px] min-w-0 flex flex-col gap-4">
                        <p className="font-storefront-mono text-xs tracking-[0.3em] text-tan-ink">ÖZEL İSTEK</p>
                        <h2 className="italic font-normal text-5xl md:text-[56px] leading-[1.05]">Aradığın koku rafta yok mu?</h2>
                        <p className="text-xl md:text-[21px] leading-relaxed text-umber max-w-[440px]">
                            Tarif et, masamızda deneyelim. Talebine en kısa sürede WhatsApp üzerinden dönüyoruz.
                        </p>
                    </div>
                    <div className="flex-[1_1_460px] min-w-0 bg-label border border-label-line p-7 sm:p-9">
                        <RequestForm />
                    </div>
                </div>
            </section>

            <Footer />
            <RequestPopup />
        </div>
    )
}
