'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Hash, Calendar, Box, Package, ArrowDown, MapPin, Database } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

type Ingredient = {
  consumed_qty: number
  lot_no: string
  arrival_date: string
  unit_cost: number
  total_cost: number
  product_name: string
  product_type: string
  supplier_name: string
}

type TraceResult = {
  error?: string
  target_batch: {
    lot_no: string
    product_name: string
    product_type: string
    current_stock: number
    arrival_date: string
    unit_cost: number | null
    supplier_name: string | null
  }
  production: {
    order_date: string
    formula_name: string
    yield_quantity: number
    ingredients: Ingredient[]
  } | null
}

export default function ProductsTrackerPage() {
  const [lotNo, setLotNo] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TraceResult | null>(null)
  const [availableLots, setAvailableLots] = useState<{ lot_no: string; product_name: string; is_legacy: boolean }[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function loadLots() {
      // 1. Active batches
      const { data: batches } = await supabase
        .from('inventory_batches')
        .select('lot_no, products(name)')
        .order('arrival_date', { ascending: false })
        .limit(100)

      // 2. Legacy items
      const { data: legacy } = await supabase
        .from('products')
        .select('batch_number, name')
        .not('batch_number', 'is', null)
        .limit(100)

      const combined: any[] = []

      if (batches) {
        batches.forEach((b: any) => {
          combined.push({
            lot_no: b.lot_no,
            product_name: b.products?.name || 'Bilinmeyen Ürün',
            is_legacy: false
          })
        })
      }

      if (legacy) {
        legacy.forEach((l: any) => {
          if (!combined.some(c => c.lot_no === l.batch_number || c.lot_no.startsWith(l.batch_number + '-'))) {
            combined.push({
              lot_no: l.batch_number,
              product_name: l.name,
              is_legacy: true
            })
          }
        })
      }

      setAvailableLots(combined)
    }
    loadLots()
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!lotNo.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const { data, error } = await supabase.rpc('trace_lot_history', { p_lot_no: lotNo.trim() })

      if (error) throw error

      if (data && data.error) {
        toast.error(data.error)
      } else if (data) {
        setResult(data as TraceResult)
        toast.success('Lot izlenebilirlik raporu bulundu.')
      }
    } catch (err: any) {
      console.error("Supabase RPC Error Details:", err.message, err.details, err.hint, err)
      toast.error(`Sorgu hatası: ${err?.message || 'Lütfen Supabase RPC fonksiyonunu SQL editörde çalıştırdığınızdan emin olun.'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl space-y-6 text-ink">
      <div className="flex flex-col space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink flex items-center gap-2.5 sm:gap-3">
          <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-rust shrink-0" /> Lot (Batch) İzlenebilirliği
        </h1>
        <p className="text-sand text-xs sm:text-sm">Ürün veya Hammadde Lot Numarasını yazarak tüm üretim köklerini ve maliyetlerini şeffafça inceleyin.</p>
      </div>

      <Card className="bg-paper border-hairline">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-sand" />
              <Input
                placeholder="Lot numarası girin (Örn: PRF-2026...)"
                value={lotNo}
                onChange={(e) => setLotNo(e.target.value)}
                className="pl-9 sm:pl-10 h-10 sm:h-12 bg-paper border-hairline text-sm sm:text-base w-full text-ink placeholder:text-sand"
              />
            </div>
            <Button
                type="submit"
                disabled={loading}
                className="h-10 sm:h-12 px-6 bg-ink hover:bg-rust text-paper font-semibold text-sm sm:text-base"
            >
              {loading ? 'Aranıyor...' : <><Search className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" /> Sorgula</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* --- SONUC GOSTERIMI --- */}
      {result && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">

          {/* 1. HEDEF LOT BILGISI */}
          <Card className="bg-paper border-l-4 border-l-rust border-hairline">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl flex justify-between items-center text-ink">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-rust" />
                  Aranan Lot: <span className="font-storefront-mono text-rust tracking-wider bg-ink/10 px-2 py-1 rounded">{result.target_batch.lot_no}</span>
                </div>
                <Badge variant="outline" className="border-hairline text-sand capitalize text-sm">
                  {result.target_batch.product_type}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
                <div className="space-y-1">
                  <p className="text-xs text-sand font-medium uppercase">Ürün Adı</p>
                  <p className="text-lg font-semibold text-ink">{result.target_batch.product_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-sand font-medium uppercase">Tarih (Depo Giriş)</p>
                  <p className="text-lg text-sand flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-sand" /> {result.target_batch.arrival_date}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-sand font-medium uppercase">Kalan Stok / Tutar</p>
                  <p className="text-lg font-storefront-mono text-moss">
                    {result.target_batch.current_stock} <span className="text-sm text-sand">adet/ml</span>
                    {result.target_batch.unit_cost && <span className="ml-2 text-yellow-500 text-sm">(₺{result.target_batch.unit_cost})</span>}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-sand font-medium uppercase">Tedarikçi</p>
                  <p className="text-lg text-sand">
                    {result.target_batch.supplier_name || <span className="text-sand/60">İç Üretim</span>}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. URETIM (PRODUCTION) AGACI */}
          {result.production ? (
            <div className="flex flex-col items-center">
              <div className="w-1 h-12 bg-hairline flex items-center justify-center">
                <ArrowDown className="w-5 h-5 text-sand bg-paper rounded-full" />
              </div>

              <Card className="w-full bg-paper border-hairline relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-rust" />
                <CardHeader className="bg-ink/5 border-b border-hairline">
                  <CardTitle className="flex justify-between items-center text-lg text-ink">
                     <span>Üretim Raporu 🔬</span>
                     <span className="text-sm font-normal text-sand">
                       Formül: <strong className="text-rust">{result.production.formula_name}</strong> |
                       Tarih: <strong className="text-ink">{new Date(result.production.order_date).toLocaleDateString('tr-TR')}</strong>
                     </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-6">
                  <h3 className="text-sm font-semibold text-sand uppercase mb-4 tracking-wider">Harcırah (Kullanılan Hammaddeler)</h3>

                  <div className="space-y-3">
                    {result.production.ingredients.length === 0 ? (
                      <p className="text-sand italic">Hammadde tüketim kaydı bulunamadı.</p>
                    ) : (
                      result.production.ingredients.map((ing, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-ink/5 border border-hairline hover:border-ink/30 transition-colors gap-4">

                          <div className="flex items-center gap-4 w-full md:w-1/3">
                            <div className="bg-ink/10 p-2 rounded-lg">
                              <Box className="w-5 h-5 text-rust" />
                            </div>
                            <div>
                               <p className="text-ink font-medium">{ing.product_name}</p>
                               <p className="text-xs text-sand font-storefront-mono tracking-wide">{ing.lot_no}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-2/3 text-sm">
                            <div className="space-y-1">
                              <p className="text-sand text-xs">Tedarikçi</p>
                              <p className="text-sand truncate">{ing.supplier_name}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sand text-xs">Dolum Tarihi</p>
                              <p className="text-sand">{ing.arrival_date}</p>
                            </div>
                            <div className="space-y-1 text-right">
                              <p className="text-sand text-xs">Tüketim</p>
                              <p className="text-moss font-medium">-{ing.consumed_qty}</p>
                            </div>
                            <div className="space-y-1 text-right">
                               <p className="text-sand text-xs">Maliyet Etkisi</p>
                               <p className="text-yellow-500 font-medium">₺{ing.total_cost?.toFixed(2) || '0.00'}</p>
                            </div>
                          </div>

                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-8 flex justify-end">
                     <div className="text-right p-4 rounded-xl bg-ink/5 inline-block border border-hairline">
                        <p className="text-sm text-sand mb-1 uppercase tracking-wider">Toplam Üretim Maliyeti (COGS)</p>
                        <p className="text-2xl font-bold text-yellow-500">
                          ₺{result.production.ingredients.reduce((acc, curr) => acc + (curr.total_cost || 0), 0).toFixed(2)}
                        </p>
                     </div>
                  </div>

                </CardContent>
              </Card>
            </div>
          ) : (
             <div className="p-4 bg-paper border border-hairline rounded-lg text-center text-sand italic">
                Bu Lot bir mamul (üretim) değil, veya sisteme direkt girilmiş bir hammadde kaydıdır. Alt kırılımı bulunmuyor.
             </div>
          )}

        </div>
      )}

      {/* --- MEVCUT LOTLAR LISTESI --- */}
      <div className="pt-10">
        <h2 className="text-xl font-semibold text-ink mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-rust" /> Sistemde Kayıtlı Olan Lotlar
        </h2>
        <div className="flex flex-wrap gap-2">
          {availableLots.length === 0 ? (
            <p className="text-sm text-sand">Henüz kayıtlı lot bulunmuyor.</p>
          ) : (
            availableLots.map((lot, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className={`cursor-pointer hover:bg-ink/5 transition-colors py-1.5 px-3 border ${lot.is_legacy ? 'border-hairline text-sand' : 'border-rust/30 text-rust'}`}
                onClick={() => {
                  setLotNo(lot.lot_no)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                {lot.lot_no} <span className="text-xs opacity-60 ml-2 font-normal">({lot.product_name})</span>
              </Badge>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
