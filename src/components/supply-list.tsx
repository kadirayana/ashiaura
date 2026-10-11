'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type EssencePublic = {
    id: string
    manufacturer: string
    perfume_name: string
    gender: string
}

const WHATSAPP_NUMBER = '905369433943'

export function SupplyList() {
    const [items, setItems] = useState<EssencePublic[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [genderFilter, setGenderFilter] = useState<string>('all')
    const [manufacturerFilter, setManufacturerFilter] = useState<string>('all')

    const supabase = createClient()

    const fetchItems = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('essence_list')
            .select('id, manufacturer, perfume_name, gender')
            .order('manufacturer', { ascending: true })

        if (!error && data) {
            setItems(data)
        }
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        fetchItems()
    }, [fetchItems])

    // Compute unique manufacturers for dropdown
    const manufacturers = Array.from(new Set(items.map(i => i.manufacturer))).sort()

    const filteredItems = items.filter((item) => {
        const term = searchTerm.toLowerCase()
        const matchesSearch =
            item.perfume_name.toLowerCase().includes(term) ||
            item.manufacturer.toLowerCase().includes(term) ||
            item.gender.toLowerCase().includes(term)
        const matchesGender = genderFilter === 'all' || item.gender.toLowerCase().includes(genderFilter)
        const matchesManufacturer = manufacturerFilter === 'all' || item.manufacturer === manufacturerFilter
        return matchesSearch && matchesGender && matchesManufacturer
    })

    function handleRequest(perfumeName: string) {
        const message = encodeURIComponent(
            `Merhaba, listenizdeki ${perfumeName} esansını getirtmenizi istiyorum`
        )
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank')
    }

    if (loading) {
        return (
            <div className="text-center py-8 text-sand font-storefront-mono text-sm">
                Liste yükleniyor…
            </div>
        )
    }

    if (items.length === 0) return null

    return (
        <div className="w-full">
            <div className="text-center mb-8">
                <div className="inline-block font-storefront-mono text-[10px] text-rust border border-rust rounded-sm px-2 py-1 mb-4">
                    {items.length} ESANS MEVCUT
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-ink mb-3">Getirtebileceklerimiz</h3>
                <p className="text-sand max-w-xl mx-auto">
                    Tedarikçimizden sizin için getirtebileceğimiz esansların listesi.
                    Beğendiğiniz esansı talep etmek için &quot;Bunu İstiyorum&quot; butonuna tıklayın.
                </p>
            </div>

            <div className="max-w-2xl mx-auto mb-6 space-y-3">
                <Input
                    placeholder="Parfüm ara…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-0 border-b border-ink rounded-none px-0 text-ink placeholder:text-sand/60 focus-visible:ring-0 focus-visible:border-rust max-w-md mx-auto block"
                />

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <div className="flex items-center gap-2 font-storefront-mono text-[11px]">
                        {[
                            { label: 'Tümü', value: 'all' },
                            { label: 'Erkek', value: 'erkek' },
                            { label: 'Kadın', value: 'kadın' },
                            { label: 'Unisex', value: 'unisex' },
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setGenderFilter(opt.value)}
                                className={`px-3 py-1.5 rounded-full border transition-all cursor-pointer ${genderFilter === opt.value
                                        ? 'bg-ink text-paper border-ink'
                                        : 'text-sand border-ink/30 hover:border-ink'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <select
                        value={manufacturerFilter}
                        onChange={(e) => setManufacturerFilter(e.target.value)}
                        className="bg-paper border border-ink font-storefront-mono text-[11px] text-ink rounded-none px-3 py-1.5 focus:outline-none cursor-pointer min-w-[160px]"
                    >
                        <option value="all">Tüm Üreticiler</option>
                        {manufacturers.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                {(searchTerm || genderFilter !== 'all' || manufacturerFilter !== 'all') && (
                    <p className="font-storefront-mono text-[11px] text-sand text-center">
                        {filteredItems.length} sonuç bulundu
                    </p>
                )}
            </div>

            <div className="border border-ink overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-paper">
                            <tr className="border-b border-ink font-storefront-mono text-[10px] text-sand uppercase tracking-wider">
                                <th className="text-left py-3 px-4 font-medium">Üretici</th>
                                <th className="text-left py-3 px-4 font-medium">Parfüm İsmi</th>
                                <th className="text-left py-3 px-4 font-medium">Cinsiyet</th>
                                <th className="text-right py-3 px-4 font-medium"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item) => (
                                <tr key={item.id} className="border-b border-dashed border-hairline hover:bg-black/[0.03] transition-colors">
                                    <td className="py-3 px-4 text-sand font-storefront-mono text-xs">{item.manufacturer}</td>
                                    <td className="py-3 px-4 text-ink font-medium">{item.perfume_name}</td>
                                    <td className="py-3 px-4">
                                        <Badge variant="outline" className="border-ink text-ink font-storefront-mono text-[10px] rounded-full">
                                            {item.gender}
                                        </Badge>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <button
                                            onClick={() => handleRequest(item.perfume_name)}
                                            className="font-storefront-mono text-[11px] font-semibold text-rust hover:text-ink border-b border-rust hover:border-ink transition-colors cursor-pointer"
                                        >
                                            BUNU İSTİYORUM →
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredItems.length === 0 && (searchTerm || genderFilter !== 'all' || manufacturerFilter !== 'all') && (
                    <div className="text-center py-8 text-sand font-storefront-mono text-sm">
                        Filtrelere uygun sonuç bulunamadı
                    </div>
                )}
            </div>
        </div>
    )
}
