'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Save, Plus, Trash2, Gift } from 'lucide-react'
import { TESTER_SIZE_ML, GIFT_ELIGIBLE_SIZE_ML, getSizeMl, formatPrice } from '@/lib/pricing'

interface PriceRow {
    size_ml: number
    price: string
    productCount: number
    saved: boolean
}

export default function PricingPage() {
    const [rows, setRows] = useState<PriceRow[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [newSize, setNewSize] = useState('')

    const supabase = createClient()

    useEffect(() => {
        fetchPrices()
    }, [])

    async function fetchPrices() {
        setLoading(true)
        const [{ data: priceRows, error }, { data: products }] = await Promise.all([
            supabase.from('size_prices').select('size_ml, price'),
            supabase.from('products').select('name, bottle_size_ml'),
        ])

        if (error) {
            toast.error('Fiyatlar yüklenemedi. supabase/pricing.sql çalıştırıldı mı?')
            setLoading(false)
            return
        }

        const productCounts = new Map<number, number>()
        for (const p of products || []) {
            const size = getSizeMl(p)
            if (size) productCounts.set(size, (productCounts.get(size) || 0) + 1)
        }

        // Every size that has products or a saved price, plus the tester row
        const sizes = new Set<number>([TESTER_SIZE_ML, ...productCounts.keys(), ...(priceRows || []).map(r => r.size_ml)])
        const saved = new Map((priceRows || []).map(r => [r.size_ml, Number(r.price)]))

        setRows([...sizes].sort((a, b) => a - b).map(size => ({
            size_ml: size,
            price: saved.has(size) ? String(saved.get(size)) : '',
            productCount: size === TESTER_SIZE_ML ? 0 : productCounts.get(size) || 0,
            saved: saved.has(size),
        })))
        setLoading(false)
    }

    function updatePrice(size: number, price: string) {
        setRows(prev => prev.map(r => r.size_ml === size ? { ...r, price } : r))
    }

    function addSize() {
        const size = parseInt(newSize)
        if (!size || size <= 0) {
            toast.error('Geçerli bir ml değeri girin.')
            return
        }
        if (rows.some(r => r.size_ml === size)) {
            toast.error('Bu boyut zaten listede.')
            return
        }
        setRows(prev => [...prev, { size_ml: size, price: '', productCount: 0, saved: false }].sort((a, b) => a.size_ml - b.size_ml))
        setNewSize('')
    }

    async function removePrice(size: number) {
        if (!confirm(`${size}ml fiyatı silinsin mi? Bu boyuttaki ürünler sitede "Fiyat için sorunuz" olarak görünür.`)) return
        const { error } = await supabase.from('size_prices').delete().eq('size_ml', size)
        if (error) {
            toast.error('Silinemedi')
            return
        }
        toast.success('Fiyat silindi')
        fetchPrices()
    }

    async function saveAll() {
        const filled = rows.filter(r => r.price.trim() !== '')
        const invalid = filled.find(r => !(Number(r.price.replace(',', '.')) >= 0))
        if (invalid) {
            toast.error(`${invalid.size_ml}ml için geçersiz fiyat.`)
            return
        }

        setSaving(true)
        const { error } = await supabase.from('size_prices').upsert(
            filled.map(r => ({
                size_ml: r.size_ml,
                price: Number(r.price.replace(',', '.')),
                updated_at: new Date().toISOString(),
            }))
        )
        setSaving(false)

        if (error) {
            toast.error('Fiyatlar kaydedilemedi')
        } else {
            toast.success('Fiyatlar kaydedildi')
            fetchPrices()
        }
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-ink">Fiyatlar</h1>
                    <p className="text-sand text-xs sm:text-sm mt-0.5">
                        Şişe boyutuna göre satış fiyatı. Aynı boyuttaki tüm ürünler bu fiyattan satılır.
                    </p>
                </div>
                <Button onClick={saveAll} disabled={saving || loading} className="bg-moss hover:bg-moss/90 text-paper">
                    <Save className="w-4 h-4 mr-1.5" />
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
            </div>

            <Card className="bg-paper border-hairline">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-ink">Boyut Fiyatları (TL)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                    {loading ? (
                        <div className="text-center py-8 text-sand">Yükleniyor...</div>
                    ) : (
                        rows.map(row => {
                            const isTester = row.size_ml === TESTER_SIZE_ML
                            return (
                                <div key={row.size_ml} className="flex items-center gap-3 py-2 border-b border-hairline last:border-0">
                                    <div className="w-40 shrink-0">
                                        <div className="font-semibold text-ink">
                                            {row.size_ml}ml {isTester && 'Tester'}
                                        </div>
                                        <div className="text-[11px] text-sand font-storefront-mono">
                                            {isTester
                                                ? 'Ürün sayfasından satılır'
                                                : `${row.productCount} ürün`}
                                            {row.size_ml === GIFT_ELIGIBLE_SIZE_ML && (
                                                <span className="inline-flex items-center gap-0.5 ml-1.5 text-moss">
                                                    <Gift className="w-3 h-3" /> tester hediye
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Input
                                        inputMode="decimal"
                                        value={row.price}
                                        onChange={(e) => updatePrice(row.size_ml, e.target.value)}
                                        placeholder="Fiyat yok"
                                        className="h-9 max-w-[160px] bg-paper border-hairline text-ink"
                                    />
                                    <span className="text-xs text-sand font-storefront-mono flex-1">
                                        {row.price && Number(row.price.replace(',', '.')) >= 0
                                            ? formatPrice(Number(row.price.replace(',', '.')))
                                            : row.productCount > 0 ? 'Sitede "Fiyat için sorunuz"' : ''}
                                    </span>
                                    {row.saved && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removePrice(row.size_ml)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
                                            aria-label={`${row.size_ml}ml fiyatını sil`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            )
                        })
                    )}

                    <div className="flex items-center gap-2 pt-4">
                        <Input
                            inputMode="numeric"
                            value={newSize}
                            onChange={(e) => setNewSize(e.target.value)}
                            placeholder="Yeni boyut (ml)"
                            className="h-9 max-w-[160px] bg-paper border-hairline text-ink"
                        />
                        <Button variant="outline" size="sm" onClick={addSize} className="border-hairline text-ink">
                            <Plus className="w-4 h-4 mr-1" /> Boyut Ekle
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
