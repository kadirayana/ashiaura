'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { formatPrice } from '@/lib/pricing'
import type { CartOrderMeta } from '@/types/orders'
import { ShoppingBag, CheckCircle2, XCircle, Trash2, Search, ArrowDownCircle, AlertTriangle, Gift } from 'lucide-react'

type ProductRequest = {
    id: string
    customer_name: string
    contact_info: string
    request_details: string
    status: 'pending' | 'completed' | 'cancelled'
    created_at: string
    // Online payment (null on offline requests / before supabase/shopier.sql)
    order_code?: string | null
    total_price?: number | null
    payment_status?: 'awaiting_payment' | 'paid' | 'review' | null
    shopier_product_url?: string | null
    shopier_order_id?: string | null
    paid_at?: string | null
    shipping_info?: Record<string, string> | null
}

const PAYMENT_BADGES: Record<NonNullable<ProductRequest['payment_status']>, { label: string; className: string }> = {
    awaiting_payment: { label: '💳 Ödeme Bekleniyor', className: 'bg-ink/5 text-sand border border-hairline' },
    paid: { label: '💰 Ödendi', className: 'bg-moss text-paper' },
    review: { label: '⚠️ Ödenen Tutar Farklı', className: 'bg-rust text-paper' },
}

function formatShipping(info: Record<string, string>): string {
    const name = [info.firstName, info.lastName].filter(Boolean).join(' ')
    const place = [info.address, info.district, info.city, info.postcode].filter(Boolean).join(', ')
    return [name, info.phone, info.email, place].filter(Boolean).join(' · ')
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
        const unpaidWarning = req.payment_status === 'awaiting_payment' ? 'DİKKAT: Bu siparişin online ödemesi henüz gelmedi.\n\n' : ''
        if (!confirm(`${unpaidWarning}"${req.customer_name}" müşterisine ait ${meta.total_bottles} şişelik sipariş onaylanacak ve stoklardan düşülecektir. Onaylıyor musunuz?`)) {
            return
        }

        setProcessingId(req.id)
        const toastId = toast.loading('Sipariş onaylanıyor ve stoklar güncelleniyor...')

        // Same server path as the Shopier webhook: FIFO stock deduction, sales,
        // customer and status in one transaction (testers are not stock-tracked)
        try {
            const response = await fetch('/api/orders/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: req.id }),
            })
            const result = await response.json() as { error?: string; salesRecorded?: number }
            if (!response.ok) throw new Error(result.error || 'Sipariş onaylanamadı.')

            toast.success(`Sipariş onaylandı: ${result.salesRecorded ?? 0} satış kaydedildi, stoklar lotlardan düşüldü.`, { id: toastId })
            fetchRequests()
        } catch (err) {
            console.error('Order approval error:', err)
            toast.error(err instanceof Error ? err.message : 'Sipariş onaylanırken bir hata oluştu.', { id: toastId })
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
                                            {req.order_code && (
                                                <span className="font-storefront-mono text-[11px] text-sand">{req.order_code}</span>
                                            )}
                                            {req.payment_status && (
                                                <Badge className={`text-[11px] ${PAYMENT_BADGES[req.payment_status].className}`}>
                                                    {PAYMENT_BADGES[req.payment_status].label}
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
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-storefront-mono text-xs font-semibold text-sand uppercase">
                                                        SİPARİŞ ({meta.total_bottles} ŞİŞE{meta.total_testers ? `, ${meta.total_testers} TESTER` : ''})
                                                    </p>
                                                    {meta.total_price !== undefined && (
                                                        <span className="font-bold text-ink font-storefront-mono">{formatPrice(meta.total_price)}</span>
                                                    )}
                                                </div>
                                                <div className="divide-y divide-hairline">
                                                    {meta.items.map((item, idx) => (
                                                        <div key={idx} className="py-2 flex items-center justify-between text-sm">
                                                            <div className="font-medium text-ink">
                                                                {item.name}{' '}
                                                                <span className="text-sand text-xs font-storefront-mono">
                                                                    ({item.kind === 'tester' ? '3ml tester' : item.bottle_size_ml ? `${item.bottle_size_ml}ml` : 'Özel'})
                                                                </span>
                                                            </div>
                                                            <div className="font-bold text-rust font-storefront-mono">
                                                                {item.quantity} Adet
                                                                {item.line_total !== undefined && (
                                                                    <span className="text-ink font-normal ml-2">{formatPrice(item.line_total)}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {meta.gift_testers && meta.gift_testers.length > 0 && (
                                                    <div className="pt-2 border-t border-hairline text-xs">
                                                        <span className="inline-flex items-center gap-1 font-semibold text-moss">
                                                            <Gift className="w-3 h-3" /> Hediye 3ml tester:
                                                        </span>{' '}
                                                        <span className="text-ink">{meta.gift_testers.join(', ')}</span>
                                                    </div>
                                                )}
                                                {req.shipping_info && (
                                                    <div className="pt-2 border-t border-hairline text-xs">
                                                        <span className="font-semibold text-ink">Teslimat (Shopier):</span>{' '}
                                                        <span className="text-sand">{formatShipping(req.shipping_info)}</span>
                                                        {req.shipping_info.note && (
                                                            <div className="text-sand mt-1">Not: {req.shipping_info.note}</div>
                                                        )}
                                                    </div>
                                                )}
                                                {req.payment_status === 'awaiting_payment' && req.shopier_product_url && (
                                                    <div className="pt-2 border-t border-hairline text-xs">
                                                        <a href={req.shopier_product_url} target="_blank" rel="noopener noreferrer" className="text-moss hover:underline">
                                                            Shopier ödeme sayfası →
                                                        </a>
                                                    </div>
                                                )}
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
