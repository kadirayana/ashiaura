'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { ShoppingBag, CheckCircle2, XCircle, Trash2, Search, ArrowDownCircle, AlertTriangle } from 'lucide-react'

interface CartItemMeta {
    product_id: string
    name: string
    quantity: number
    bottle_size_ml?: number | null
    unit_cost?: number | null
}

interface CartOrderMeta {
    type: 'cart_order'
    total_bottles: number
    address_or_notes?: string
    items: CartItemMeta[]
}

type ProductRequest = {
    id: string
    customer_name: string
    contact_info: string
    request_details: string
    status: 'pending' | 'completed' | 'cancelled'
    created_at: string
}

function parseOrderMetadata(details: string): { isCartOrder: boolean; meta: CartOrderMeta | null; cleanText: string } {
    if (!details) return { isCartOrder: false, meta: null, cleanText: '' }

    const marker = '__CART_METADATA__:'
    const index = details.indexOf(marker)
    if (index !== -1) {
        const textPart = details.substring(0, index).trim()
        const jsonPart = details.substring(index + marker.length).trim()
        try {
            const meta = JSON.parse(jsonPart) as CartOrderMeta
            return { isCartOrder: true, meta, cleanText: textPart }
        } catch (e) {
            console.error('Failed to parse cart metadata', e)
        }
    }

    const isCart = details.includes('[SEPET SİPARİŞİ]')
    return { isCartOrder: isCart, meta: null, cleanText: details }
}

export default function RequestsPage() {
    const [requests, setRequests] = useState<ProductRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all')

    const supabase = createClient()

    useEffect(() => {
        fetchRequests()
    }, [])

    async function fetchRequests() {
        setLoading(true)
        const { data, error } = await supabase
            .from('product_requests')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            toast.error('İstekler yüklenirken hata oluştu')
        } else {
            setRequests(data || [])
        }
        setLoading(false)
    }

    async function updateStatus(id: string, newStatus: 'pending' | 'completed' | 'cancelled') {
        const { error } = await supabase
            .from('product_requests')
            .update({ status: newStatus })
            .eq('id', id)

        if (error) {
            toast.error('Durum güncellenemedi')
        } else {
            toast.success('Durum güncellendi')
            fetchRequests()
        }
    }

    // Approve Cart Order and Deduct Stock
    async function handleApproveCartOrder(req: ProductRequest, meta: CartOrderMeta) {
        if (!confirm(`"${req.customer_name}" müşterisine ait ${meta.total_bottles} şişelik sipariş onaylanacak ve stoklardan düşülecektir. Onaylıyor musunuz?`)) {
            return
        }

        setProcessingId(req.id)
        const toastId = toast.loading('Sipariş onaylanıyor ve stoklar güncelleniyor...')

        try {
            // 1. Fetch current products to check stocks and recipe costs
            const productIds = meta.items.map(i => i.product_id).filter(Boolean)
            const { data: currentProducts, error: prodErr } = await supabase
                .from('products')
                .select('*')
                .in('id', productIds)

            if (prodErr) throw prodErr

            const productsMap = new Map((currentProducts || []).map(p => [p.id, p]))

            // 2. Find or create customer
            let customerId: string | null = null
            if (req.customer_name) {
                const { data: existingCustomer } = await supabase
                    .from('customers')
                    .select('id')
                    .or(`phone.eq.${req.contact_info},name.ilike.${req.customer_name}`)
                    .limit(1)
                    .single()

                if (existingCustomer?.id) {
                    customerId = existingCustomer.id
                } else {
                    const { data: newCustomer, error: createCustErr } = await supabase
                        .from('customers')
                        .insert({
                            name: req.customer_name,
                            phone: req.contact_info,
                            notes: meta.address_or_notes || 'Web sepetinden otomatik oluşturuldu.',
                            balance: 0,
                        })
                        .select('id')
                        .single()

                    if (!createCustErr && newCustomer) {
                        customerId = newCustomer.id
                    }
                }
            }

            const today = new Date().toISOString().split('T')[0]
            const deductedInfo: string[] = []

            // 3. For each item in cart, deduct stock and create sale record
            for (const item of meta.items) {
                const prod = productsMap.get(item.product_id)
                if (prod) {
                    const currentStock = prod.stock || 0
                    const newStock = Math.max(0, currentStock - item.quantity)

                    // Update stock
                    const { error: stockUpdateErr } = await supabase
                        .from('products')
                        .update({ stock: newStock })
                        .eq('id', prod.id)

                    if (stockUpdateErr) {
                        console.error('Stock update error for product:', prod.name, stockUpdateErr)
                    } else {
                        deductedInfo.push(`${prod.name}: ${currentStock} -> ${newStock}`)
                    }

                    // Create sale log
                    const unitCost = prod.unit_cost || item.unit_cost || 0
                    const totalPrice = (prod.unit_cost ? prod.unit_cost * 1.5 : 0) * item.quantity // default or zero if price undefined
                    await supabase.from('sales').insert({
                        customer_id: customerId,
                        product_id: prod.id,
                        quantity: item.quantity,
                        unit_cost: unitCost,
                        unit_price: prod.unit_cost ? prod.unit_cost * 1.5 : null,
                        total_price: totalPrice > 0 ? totalPrice : null,
                        profit: totalPrice > 0 ? totalPrice - (unitCost * item.quantity) : 0,
                        sale_date: today,
                        notes: `Web Sipariş Onayı (İstek #${req.id.slice(0, 8)}) - ${meta.address_or_notes || ''}`.trim()
                    })
                }
            }

            // 4. Update request status to completed
            const { error: updateReqErr } = await supabase
                .from('product_requests')
                .update({ status: 'completed' })
                .eq('id', req.id)

            if (updateReqErr) throw updateReqErr

            toast.success(`Sipariş onaylandı! Stoklar düşüldü ve satış kaydı işlendi.`, { id: toastId })
            fetchRequests()
        } catch (err: any) {
            console.error('Order approval error:', err)
            toast.error(err.message || 'Sipariş onaylanırken bir hata oluştu.', { id: toastId })
        } finally {
            setProcessingId(null)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Bu isteği silmek istediğinize emin misiniz?')) return

        const { error } = await supabase
            .from('product_requests')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Silinemedi')
        } else {
            toast.success('İstek silindi')
            fetchRequests()
        }
    }

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const matchesStatus = statusFilter === 'all' || req.status === statusFilter
            if (!matchesStatus) return false

            if (!searchQuery.trim()) return true
            const q = searchQuery.toLowerCase().trim()
            return (
                req.customer_name.toLowerCase().includes(q) ||
                req.contact_info.toLowerCase().includes(q) ||
                req.request_details.toLowerCase().includes(q)
            )
        })
    }, [requests, statusFilter, searchQuery])

    const pendingCount = requests.filter(r => r.status === 'pending').length

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-ink">Müşteri İstekleri & Siparişler</h1>
                    <p className="text-sand text-xs sm:text-sm mt-0.5">
                        Ön yüzden sepete eklenen siparişler ve özel parfüm talepleri
                    </p>
                </div>
                {pendingCount > 0 && (
                    <div className="inline-flex items-center gap-2 bg-rust/10 border border-rust/30 px-3 py-1.5 rounded-full text-rust font-storefront-mono text-xs font-semibold">
                        <ShoppingBag className="w-4 h-4" />
                        <span>{pendingCount} Bekleyen Sipariş</span>
                    </div>
                )}
            </div>

            {/* Filters and Search Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant={statusFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('all')}
                        className={statusFilter === 'all' ? 'bg-ink text-paper font-bold text-xs h-9' : 'text-sand border-hairline hover:bg-ink/5 text-xs h-9'}
                    >
                        Tümü ({requests.length})
                    </Button>
                    <Button
                        type="button"
                        variant={statusFilter === 'pending' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('pending')}
                        className={statusFilter === 'pending' ? 'bg-yellow-600 text-paper font-bold text-xs h-9' : 'text-sand border-hairline hover:bg-ink/5 text-xs h-9'}
                    >
                        Bekleyenler ({pendingCount})
                    </Button>
                    <Button
                        type="button"
                        variant={statusFilter === 'completed' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('completed')}
                        className={statusFilter === 'completed' ? 'bg-moss text-paper font-bold text-xs h-9' : 'text-sand border-hairline hover:bg-ink/5 text-xs h-9'}
                    >
                        Tamamlananlar ({requests.filter(r => r.status === 'completed').length})
                    </Button>
                    <Button
                        type="button"
                        variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('cancelled')}
                        className={statusFilter === 'cancelled' ? 'bg-red-600 text-paper font-bold text-xs h-9' : 'text-sand border-hairline hover:bg-ink/5 text-xs h-9'}
                    >
                        İptaller ({requests.filter(r => r.status === 'cancelled').length})
                    </Button>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand" />
                    <Input
                        placeholder="İsim, telefon veya ürün ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-9 bg-paper border-hairline text-xs sm:text-sm text-ink w-full"
                    />
                </div>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-12 text-sand">Yükleniyor...</div>
                ) : filteredRequests.length === 0 ? (
                    <Card className="bg-paper border-hairline">
                        <CardContent className="py-12 text-center text-sand">
                            {searchQuery ? `"${searchQuery}" ile eşleşen istek veya sipariş bulunamadı.` : 'Henüz bir talep veya sipariş kaydı yok.'}
                        </CardContent>
                    </Card>
                ) : (
                    filteredRequests.map((req) => {
                        const { isCartOrder, meta, cleanText } = parseOrderMetadata(req.request_details)
                        const isProcessing = processingId === req.id

                        return (
                            <Card key={req.id} className="bg-paper border-hairline hover:border-sand/40 transition-colors overflow-hidden">
                                <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-3 pb-3 bg-ink/[0.02] border-b border-hairline">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <CardTitle className="text-base sm:text-lg font-semibold text-ink">
                                                {req.customer_name}
                                            </CardTitle>
                                            {isCartOrder ? (
                                                <Badge className="bg-rust text-paper text-[11px] font-storefront-mono flex items-center gap-1">
                                                    <ShoppingBag className="w-3 h-3" />
                                                    Sepet Siparişi
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-sand border-hairline text-[11px]">
                                                    Özel Talep
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs sm:text-sm text-sand font-storefront-mono">
                                            <span>📞 {req.contact_info}</span>
                                            <a
                                                href={`https://wa.me/${req.contact_info.replace(/[^0-9]/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-moss hover:underline ml-1"
                                            >
                                                (WhatsApp'tan Yaz)
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                                        <Badge
                                            className={
                                                req.status === 'completed'
                                                    ? 'bg-moss text-paper'
                                                    : req.status === 'cancelled'
                                                        ? 'bg-red-600 text-paper'
                                                        : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/40'
                                            }
                                        >
                                            {req.status === 'pending' && '⏳ Onay Bekliyor'}
                                            {req.status === 'completed' && '✅ Onaylandı & Stok Düşüldü'}
                                            {req.status === 'cancelled' && '❌ İptal Edildi'}
                                        </Badge>
                                        <span className="text-[11px] text-sand font-storefront-mono">
                                            {formatDate(req.created_at)}
                                        </span>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-4 sm:p-6 space-y-4">
                                    {/* Order Content */}
                                    {meta && meta.items && meta.items.length > 0 ? (
                                        <div className="space-y-3">
                                            <div className="rounded-lg border border-hairline bg-ink/[0.03] p-3 sm:p-4 space-y-2">
                                                <p className="font-storefront-mono text-xs font-semibold text-sand uppercase">
                                                    SİPARİŞ VERİLEN PARFÜMLER ({meta.total_bottles} ŞİŞE)
                                                </p>
                                                <div className="divide-y divide-hairline">
                                                    {meta.items.map((item, idx) => (
                                                        <div key={idx} className="py-2 flex items-center justify-between text-sm">
                                                            <div className="font-medium text-ink">
                                                                {item.name}{' '}
                                                                <span className="text-sand text-xs font-storefront-mono">
                                                                    ({item.bottle_size_ml ? `${item.bottle_size_ml}ml` : 'Özel'})
                                                                </span>
                                                            </div>
                                                            <div className="font-bold text-rust font-storefront-mono">
                                                                {item.quantity} Adet
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {meta.address_or_notes && (
                                                    <div className="pt-2 border-t border-hairline text-xs text-sand">
                                                        <span className="font-semibold text-ink">Adres / Not:</span> {meta.address_or_notes}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-ink/5 p-4 rounded-lg text-ink text-sm whitespace-pre-line leading-relaxed">
                                            {cleanText}
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-dashed border-hairline">
                                        {req.status === 'pending' && (
                                            <>
                                                {meta && meta.items && meta.items.length > 0 ? (
                                                    <Button
                                                        size="sm"
                                                        disabled={isProcessing}
                                                        onClick={() => handleApproveCartOrder(req, meta)}
                                                        className="bg-moss hover:bg-moss/90 text-paper font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow"
                                                    >
                                                        <ArrowDownCircle className="w-4 h-4" />
                                                        {isProcessing ? 'İşleniyor...' : 'Siparişi Onayla & Stoktan Düş'}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => updateStatus(req.id, 'completed')}
                                                        className="bg-moss text-paper hover:bg-moss/80 text-xs"
                                                    >
                                                        Tamamlandı İşaretle
                                                    </Button>
                                                )}

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => updateStatus(req.id, 'cancelled')}
                                                    className="border-hairline text-sand hover:text-red-500 hover:bg-red-500/10 text-xs"
                                                >
                                                    İptal Et
                                                </Button>
                                            </>
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(req.id)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-950/20 text-xs"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                                            Sil
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}
