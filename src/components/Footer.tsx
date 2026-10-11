'use client'

import Link from 'next/link'

export function Footer() {
    return (
        <footer className="border-t border-ink bg-paper">
            <div className="max-w-7xl mx-auto px-6 md:px-10 py-6 flex gap-6 items-start bg-black/[0.02] border-b border-ink">
                <div className="font-storefront-mono font-semibold text-[10px] text-rust border border-rust rounded-sm px-2 py-1 whitespace-nowrap -rotate-2">
                    ASHİ AURA
                </div>
                <p className="font-storefront-mono text-xs leading-relaxed text-sand max-w-3xl">
                    El yapımı parfüm koleksiyonu — her esans tek tek formüle edilir, tartılır ve kayıt altına alınır.
                    İzmir'de üretilen ürünlerimiz Shopier üzerinden sipariş alınmaktadır. Her şişe özenle
                    hazırlanır; seri üretim yoktur. Siparişleriniz onaylandığı gün hazırlanıp kargoya verilir.
                </p>
            </div>
            <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-storefront-mono text-xs text-sand">
                <p>© 2026 ASHİ AURA</p>
            </div>
        </footer>
    )
}
