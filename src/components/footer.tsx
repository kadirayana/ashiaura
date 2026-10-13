import Link from 'next/link'
import Image from 'next/image'

export function Footer() {
    return (
        <footer className="bg-ink text-paper">
            <div className="max-w-[1320px] mx-auto px-6 lg:px-12 pt-20 pb-10 flex flex-col gap-14">
                <div className="flex flex-wrap justify-between gap-x-16 gap-y-12">
                    <div className="flex-1 basis-64 max-w-sm flex flex-col gap-5">
                        <Image src="/brand/logo-cream.svg" alt="Ashi Aura" width={126} height={70} unoptimized className="h-[68px] w-auto self-start" />
                        <p className="italic text-2xl leading-snug text-hairline">Yuvanın havası.</p>
                    </div>

                    <div className="flex flex-wrap gap-x-16 gap-y-10 text-lg">
                        <div className="flex flex-col gap-3">
                            <span className="font-storefront-mono text-[11px] tracking-[0.24em] text-tan">MAĞAZA</span>
                            <Link href="/products" className="hover:text-tan">Koleksiyon</Link>
                            <Link href="/#tester" className="hover:text-tan">Tester</Link>
                            <Link href="/#istek" className="hover:text-tan">Özel istek</Link>
                        </div>
                        <div className="flex flex-col gap-3">
                            <span className="font-storefront-mono text-[11px] tracking-[0.24em] text-tan">MARKA</span>
                            <Link href="/#hikaye" className="hover:text-tan">Hikayemiz</Link>
                            <Link href="/#tester" className="hover:text-tan">Tester programı</Link>
                        </div>
                        <div className="flex flex-col gap-3">
                            <span className="font-storefront-mono text-[11px] tracking-[0.24em] text-tan">İLETİŞİM</span>
                            <a href="mailto:info@ashiaura.com" className="hover:text-tan">info@ashiaura.com</a>
                            <a href="https://wa.me/905369433943" target="_blank" rel="noopener noreferrer" className="hover:text-tan">WhatsApp</a>
                            <span className="text-hairline">Bornova, İzmir</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap justify-between gap-3 pt-6 border-t border-[#4a4038] font-storefront-mono text-[11px] tracking-[0.18em] text-hairline">
                    <span>© 2026 ASHI AURA · İZMİR</span>
                    <span>ÖDEMELER SHOPIER GÜVENCESİYLE</span>
                </div>
            </div>
        </footer>
    )
}
