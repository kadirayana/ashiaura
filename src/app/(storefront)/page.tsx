export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
import { RequestForm } from '@/components/request-form'
import { RequestPopup } from '@/components/request-popup'
import { LedgerRow } from '@/components/storefront-ui/ledger-row'
import { StatBlock } from '@/components/storefront-ui/stat-block'
import { LotStamp } from '@/components/storefront-ui/lot-stamp'
import { slugify } from '@/lib/utils'
import type { Product, Recipe } from '@/types/database'

type ProductWithRecipe = Product & {
    recipe: Recipe | null
}

async function getFeaturedProducts(): Promise<ProductWithRecipe[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('products')
        .select('*, recipe:recipes(*)')
        .gt('stock', 0)
        .order('fragrantica_score', { ascending: false })
        .limit(5)

    if (error) {
        console.error('Error fetching products:', error)
        return []
    }

    return (data || []).map(product => ({
        ...product,
        recipe: Array.isArray(product.recipe) ? product.recipe[0] || null : product.recipe,
    }))
}

async function getStorefrontStats() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('products')
        .select('stock, fragrantica_score, bottle_size_ml')

    if (error || !data) {
        return { essenceCount: 0, avgScore: null as number | null, commonSize: null as number | null }
    }

    const essenceCount = data.reduce((n, p) => (p.stock > 0 ? n + 1 : n), 0)
    const scores = data.map(p => p.fragrantica_score).filter((s): s is number => s != null)
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null

    const sizeCounts = new Map<number, number>()
    for (const p of data) {
        if (p.bottle_size_ml) sizeCounts.set(p.bottle_size_ml, (sizeCounts.get(p.bottle_size_ml) || 0) + 1)
    }
    let commonSize: number | null = null
    let bestCount = 0
    for (const [size, count] of sizeCounts) {
        if (count > bestCount) {
            bestCount = count
            commonSize = size
        }
    }

    return { essenceCount, avgScore, commonSize }
}

export default async function HomePage() {
    const [featured, stats] = await Promise.all([getFeaturedProducts(), getStorefrontStats()])
    const latest = featured[0]

    return (
        <div className="min-h-screen">
            <Navbar />

            {/* Hero */}
            <section className="grid grid-cols-1 md:grid-cols-[1fr_360px] border-b border-ink">
                <div className="p-8 md:p-14 border-b md:border-b-0 md:border-r border-ink">
                    <p className="font-storefront-mono text-xs text-sand mb-5">İZMİRDE, 2024&apos;TE KURULDU</p>
                    <h1 className="font-bold text-4xl md:text-6xl leading-[0.98] tracking-tight text-ink">
                        Koku, ölçülebilir bir <span className="text-rust">sanattır.</span>
                    </h1>
                    <p className="mt-6 max-w-xl text-sand leading-relaxed">
                        El yapımı parfüm koleksiyonu — her esans tek tek formüle edilir, tartılır ve bu deftere
                        işlenir. Fragrantica skoru, hacim ve kalan adediyle birlikte.
                    </p>
                    <div className="flex gap-3 mt-8">
                        <Link href="/products" className="bg-ink text-paper font-storefront-mono font-semibold text-sm px-6 py-3.5 hover:bg-rust transition-colors">
                            KOLEKSİYONU AÇ →
                        </Link>
                        <a
                            href="https://wa.me/905369433943"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border border-ink font-storefront-mono font-semibold text-sm px-6 py-3.5 hover:bg-black/[0.03] transition-colors"
                        >
                            WHATSAPP
                        </a>
                    </div>

                    <div className="flex gap-9 mt-11 pt-6 border-t border-dashed border-hairline">
                        <StatBlock value={stats.essenceCount || '—'} suffix="+" label="Kayıtlı Esans" />
                        <StatBlock value={stats.avgScore ? stats.avgScore.toFixed(2) : '—'} suffix="/5" label="Ort. Fragrantica" />
                        <StatBlock value={stats.commonSize || '—'} suffix="ml" label="Standart Hacim" />
                        <StatBlock value="%100" label="El Yapımı" />
                    </div>
                </div>

                <div className="flex flex-col">
                    <div className="flex-1 relative min-h-[220px] flex items-center justify-center bg-[repeating-linear-gradient(45deg,#eceadf_0_9px,#e3e0d2_9px_18px)] border-b border-ink">
                        <Image
                            src="/hero-perfume.jpg"
                            alt="Atölye / Şişe Fotoğrafı"
                            fill
                            priority
                            sizes="(max-width: 768px) 100vw, 360px"
                            className="object-cover"
                        />
                        <LotStamp label="LOT KA-2026/047" className="absolute top-4 left-4 z-10" />
                    </div>
                    {latest && (
                        <Link href={`/products/${slugify(latest.name)}`} className="p-4 hover:bg-black/[0.03] transition-colors">
                            <div className="flex justify-between font-storefront-mono text-[10px] text-sand">
                                <span>SON KAYIT — DETAYA GİT →</span>
                                <span className="text-rust">{latest.stock <= 3 ? `SON ${latest.stock}` : 'STOKTA'}</span>
                            </div>
                            <div className="font-semibold text-ink mt-1">{latest.name}</div>
                        </Link>
                    )}
                </div>
            </section>

            {/* Kayıt Defteri */}
            <section id="products" className="px-4 md:px-14 py-10 md:py-14 border-b border-ink">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-baseline justify-between mb-4">
                        <div className="flex items-baseline gap-3">
                            <span className="font-storefront-mono text-xs text-rust">BÖLÜM 01</span>
                            <h2 className="font-bold text-2xl md:text-3xl text-ink">Kayıt Defteri</h2>
                        </div>
                        <Link href="/products" className="font-storefront-mono text-xs font-semibold border-b border-ink hover:text-rust hover:border-rust">
                            TÜMÜNÜ GÖR →
                        </Link>
                    </div>

                    {featured.length === 0 ? (
                        <p className="text-sand py-12 text-center">Yakında yeni ürünler eklenecek…</p>
                    ) : (
                        <div>
                            {featured.map((p) => (
                                <LedgerRow
                                    key={p.id}
                                    no={p.id.slice(0, 3).toUpperCase()}
                                    name={p.name}
                                    house={p.recipe?.name}
                                    gender={p.gender}
                                    volumeLabel={p.bottle_size_ml ? `${p.bottle_size_ml} ml` : undefined}
                                    rating={p.fragrantica_score}
                                    href={`/products/${slugify(p.name)}`}
                                    stockLabel={p.stock > 5 ? 'STOKTA' : `SON ${p.stock}`}
                                    stockTone={p.stock > 5 ? 'moss' : 'rust'}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Hakkımızda */}
            <section id="about" className="grid grid-cols-1 md:grid-cols-3 border-b border-ink">
                {[
                    { no: 'A — KALİTE GARANTİSİ', title: 'En kaliteli esanslar', body: 'Her formülasyonda en kaliteli hammaddeler kullanılır; her parti kayıt altına alınır.' },
                    { no: 'B — EL YAPIMI', title: 'Tek tek hazırlanır', body: 'Her şişe elde tartılır, karıştırılır ve dinlendirilir — seri üretim yoktur.' },
                    { no: 'C — HIZLI TESLİMAT', title: 'Hemen hazırlanır', body: 'Siparişiniz onaylandığı gün hazırlanır ve yola çıkarılır.' },
                ].map((cell, i) => (
                    <div key={cell.no} className={`p-8 md:p-10 ${i < 2 ? 'md:border-r border-ink' : ''} ${i > 0 ? 'border-t md:border-t-0 border-ink' : ''}`}>
                        <p className="font-storefront-mono text-[10px] text-rust tracking-wide mb-3">{cell.no}</p>
                        <h3 className="font-bold text-xl text-ink">{cell.title}</h3>
                        <p className="mt-2 text-sand text-sm leading-relaxed">{cell.body}</p>
                    </div>
                ))}
            </section>

            {/* Talep Formu */}
            <section id="contact" className="grid grid-cols-1 md:grid-cols-2 border-b border-ink">
                <div className="p-8 md:p-14 md:border-r border-ink">
                    <p className="font-storefront-mono text-xs text-rust mb-3">BÖLÜM 02 — TALEP FORMU F/01</p>
                    <h2 className="font-bold text-3xl md:text-4xl leading-tight text-ink">
                        Aradığınız koku defterde yoksa, tarif edin — atölyede deneyelim.
                    </h2>
                    <p className="mt-4 text-sand">
                        Talebiniz kayıt altına alınır; en kısa sürede WhatsApp üzerinden dönüş yapılır.
                    </p>
                </div>
                <div className="p-8 md:p-14">
                    <RequestForm />
                </div>
            </section>

            <Footer />
            <RequestPopup />
        </div>
    )
}
