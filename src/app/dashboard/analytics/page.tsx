'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Eye, MousePointerClick, Users, Globe, RefreshCw,
    TrendingUp, ArrowUpRight, ArrowDownRight, Package,
    ShoppingCart, DollarSign, Award, Calendar, Download,
    Sparkles, Filter, ChevronRight
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportToExcel } from '@/lib/excelExport'
import { toast } from 'sonner'
import type { Sale, Customer, Product } from '@/types/database'

// ─── TYPES ───────────────────────────────────────────────────
type SaleWithRelations = Sale & {
    customer: Customer | null
    product: Product | null
}

interface PageView {
    id: string
    session_id: string
    ip_address: string
    page_path: string
    referrer: string | null
    user_agent: string | null
    screen_width: number | null
    screen_height: number | null
    created_at: string
}

interface ClickEvent {
    id: string
    session_id: string
    ip_address: string
    page_path: string
    element_tag: string
    element_text: string | null
    element_id: string | null
    x_position: number
    y_position: number
    page_width: number
    page_height: number
    created_at: string
}

interface VisitorProfile {
    ip_address: string
    first_seen: string
    last_seen: string
    device: string
    screen: string
    total_page_views: number
    total_clicks: number
    pages_visited: string[]
    referrer: string | null
    timeline: TimelineEvent[]
}

interface TimelineEvent {
    type: 'pageview' | 'click'
    timestamp: string
    page_path: string
    detail: string
}

interface MonthlyStat {
    key: string // e.g. "2026-02"
    label: string // e.g. "Şubat 2026"
    shortLabel: string // e.g. "Şub '26"
    salesCount: number
    bottleCount: number
    revenue: number
    cost: number
    profit: number
    marginPct: number
    paymentAmount: number
    avgOrderValue: number
    momGrowth: number | null // Month-over-month revenue growth %
}

// ─── COMPONENT ───────────────────────────────────────────────
export default function AnalyticsPage() {
    const [sales, setSales] = useState<SaleWithRelations[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [pageViews, setPageViews] = useState<PageView[]>([])
    const [clickEvents, setClickEvents] = useState<ClickEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'sales-report' | 'overview' | 'visitors'>('sales-report')
    const [selectedYear, setSelectedYear] = useState<string>('all')

    const supabase = createClient()

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [salesRes, customersRes, productsRes, viewsRes, clicksRes] = await Promise.all([
                supabase.from('sales').select('*, customer:customers(*), product:products(*)').order('sale_date', { ascending: true }),
                supabase.from('customers').select('*').order('name'),
                supabase.from('products').select('*').order('name'),
                supabase.from('page_views').select('*').order('created_at', { ascending: false }).limit(1000),
                supabase.from('click_events').select('*').order('created_at', { ascending: false }).limit(1000),
            ])

            if (salesRes.data) setSales(salesRes.data as SaleWithRelations[])
            if (customersRes.data) setCustomers(customersRes.data)
            if (productsRes.data) setProducts(productsRes.data)
            if (viewsRes.data) setPageViews(viewsRes.data)
            if (clicksRes.data) setClickEvents(clicksRes.data)
        } catch (err) {
            console.error('Error fetching analytics:', err)
            toast.error('Rapor verileri yüklenirken hata oluştu')
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Available Years
    const availableYears = useMemo(() => {
        const years = new Set<string>()
        sales.forEach(s => {
            if (s.sale_date) {
                const yr = s.sale_date.substring(0, 4)
                if (yr) years.add(yr)
            }
        })
        return Array.from(years).sort((a, b) => b.localeCompare(a))
    }, [sales])

    // Filtered Sales by Year
    const filteredSales = useMemo(() => {
        if (selectedYear === 'all') return sales
        return sales.filter(s => s.sale_date && s.sale_date.startsWith(selectedYear))
    }, [sales, selectedYear])

    // ─── MONTHLY AGGREGATIONS ───────────────────────────────────
    const monthlyStats = useMemo<MonthlyStat[]>(() => {
        const map = new Map<string, {
            salesCount: number
            bottleCount: number
            revenue: number
            cost: number
            profit: number
            paymentAmount: number
        }>()

        filteredSales.forEach(s => {
            if (!s.sale_date) return
            const monthKey = s.sale_date.substring(0, 7) // "2026-02"
            const isPaymentOnly = s.quantity === 0 || s.product?.name === 'Tahsilat'
            const qty = isPaymentOnly ? 0 : (s.quantity || 0)
            const rev = s.total_price || 0
            const cost = isPaymentOnly ? 0 : ((s.unit_cost || 0) * (s.quantity || 0))
            const prof = s.profit !== null ? s.profit : (rev - cost)
            const pay = s.payment_amount !== null ? s.payment_amount : rev

            if (!map.has(monthKey)) {
                map.set(monthKey, {
                    salesCount: 0,
                    bottleCount: 0,
                    revenue: 0,
                    cost: 0,
                    profit: 0,
                    paymentAmount: 0,
                })
            }

            const current = map.get(monthKey)!
            current.salesCount += 1
            current.bottleCount += qty
            current.revenue += rev
            current.cost += cost
            current.profit += prof
            current.paymentAmount += pay
        })

        // Sort keys chronologically
        const sortedKeys = Array.from(map.keys()).sort()
        const result: MonthlyStat[] = []

        for (let i = 0; i < sortedKeys.length; i++) {
            const key = sortedKeys[i]
            const raw = map.get(key)!
            const [yr, mo] = key.split('-')
            const dateObj = new Date(parseInt(yr), parseInt(mo) - 1, 1)
            const label = dateObj.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
            const shortLabel = dateObj.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })
            const marginPct = raw.revenue > 0 ? (raw.profit / raw.revenue) * 100 : 0
            const avgOrderValue = raw.salesCount > 0 ? raw.revenue / raw.salesCount : 0

            // Calculate MoM growth based on previous month in sequence
            let momGrowth: number | null = null
            if (i > 0) {
                const prevRevenue = result[i - 1].revenue
                if (prevRevenue > 0) {
                    momGrowth = ((raw.revenue - prevRevenue) / prevRevenue) * 100
                }
            }

            result.push({
                key,
                label: label.charAt(0).toUpperCase() + label.slice(1),
                shortLabel,
                salesCount: raw.salesCount,
                bottleCount: raw.bottleCount,
                revenue: raw.revenue,
                cost: raw.cost,
                profit: raw.profit,
                marginPct,
                paymentAmount: raw.paymentAmount,
                avgOrderValue,
                momGrowth,
            })
        }

        return result
    }, [filteredSales])

    // Overall Totals for the current filter
    const totalRevenue = useMemo(() => filteredSales.reduce((sum, s) => sum + (s.total_price || 0), 0), [filteredSales])
    const totalProfit = useMemo(() => filteredSales.reduce((sum, s) => sum + (s.profit || 0), 0), [filteredSales])
    const totalBottles = useMemo(() => filteredSales.reduce((sum, s) => sum + (s.product?.name === 'Tahsilat' ? 0 : (s.quantity || 0)), 0), [filteredSales])
    const totalOrders = filteredSales.length
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const totalCollected = useMemo(() => filteredSales.reduce((sum, s) => sum + (s.payment_amount !== null ? s.payment_amount : (s.total_price || 0)), 0), [filteredSales])

    // ─── TOP SELLING PRODUCTS ───────────────────────────────────
    const topProducts = useMemo(() => {
        const prodMap = new Map<string, {
            name: string
            gender: string | null
            quantity: number
            revenue: number
            profit: number
        }>()

        filteredSales.forEach(s => {
            if (!s.product || s.product.name === 'Tahsilat') return
            const name = s.product.name
            if (!prodMap.has(name)) {
                prodMap.set(name, {
                    name,
                    gender: s.product.gender || null,
                    quantity: 0,
                    revenue: 0,
                    profit: 0,
                })
            }
            const p = prodMap.get(name)!
            p.quantity += (s.quantity || 0)
            p.revenue += (s.total_price || 0)
            p.profit += (s.profit || 0)
        })

        return Array.from(prodMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10)
    }, [filteredSales])

    // ─── TOP CUSTOMERS ──────────────────────────────────────────
    const topCustomers = useMemo(() => {
        const custMap = new Map<string, {
            id: string
            name: string
            orderCount: number
            totalSpent: number
            totalProfit: number
            balance: number
        }>()

        filteredSales.forEach(s => {
            const custId = s.customer?.id || 'retail'
            const custName = s.customer?.name || 'Perakende / Anonim Müşteri'
            const custBal = s.customer?.balance || 0

            if (!custMap.has(custId)) {
                custMap.set(custId, {
                    id: custId,
                    name: custName,
                    orderCount: 0,
                    totalSpent: 0,
                    totalProfit: 0,
                    balance: custBal,
                })
            }
            const c = custMap.get(custId)!
            c.orderCount += 1
            c.totalSpent += (s.total_price || 0)
            c.totalProfit += (s.profit || 0)
        })

        return Array.from(custMap.values())
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10)
    }, [filteredSales])

    // ─── EXCEL EXPORT ───────────────────────────────────────────
    const handleExportMonthlyExcel = () => {
        if (monthlyStats.length === 0) {
            toast.error('Aktarılacak rapor verisi bulunamadı')
            return
        }

        const excelData = monthlyStats.map(m => ({
            'Dönem / Ay': m.label,
            'Satış Sayısı (İşlem)': m.salesCount,
            'Satılan Şişe (Adet)': m.bottleCount,
            'Toplam Ciro (₺)': Number(m.revenue.toFixed(2)),
            'Toplam Maliyet (₺)': Number(m.cost.toFixed(2)),
            'Net Kâr (₺)': Number(m.profit.toFixed(2)),
            'Kâr Marjı (%)': Number(m.marginPct.toFixed(2)),
            'Tahsil Edilen Tutar (₺)': Number(m.paymentAmount.toFixed(2)),
            'Ortalama Sipariş Tutarı (₺)': Number(m.avgOrderValue.toFixed(2)),
            'Aylık Büyüme (MoM %)': m.momGrowth !== null ? `${m.momGrowth > 0 ? '+' : ''}${m.momGrowth.toFixed(1)}%` : '-'
        }))

        exportToExcel(excelData, `Aylik_Finans_Ve_Satis_Raporu_${selectedYear}.xlsx`, 'Aylık Satış Raporu')
        toast.success('Aylık finans ve satış raporu Excel olarak indirildi!')
    }

    // ─── VISITOR PROFILES (TRAFFIC TAB) ─────────────────────────
    const visitorProfiles = useMemo<VisitorProfile[]>(() => {
        const ipMap = new Map<string, { views: PageView[]; clicks: ClickEvent[] }>()

        pageViews.forEach(v => {
            if (!ipMap.has(v.ip_address)) ipMap.set(v.ip_address, { views: [], clicks: [] })
            ipMap.get(v.ip_address)!.views.push(v)
        })

        clickEvents.forEach(c => {
            if (!ipMap.has(c.ip_address)) ipMap.set(c.ip_address, { views: [], clicks: [] })
            ipMap.get(c.ip_address)!.clicks.push(c)
        })

        return Array.from(ipMap.entries()).map(([ip, data]) => {
            const allTimestamps = [
                ...data.views.map(v => v.created_at),
                ...data.clicks.map(c => c.created_at),
            ].sort()

            const latestView = data.views[0]
            const ua = latestView?.user_agent || ''
            let device = 'Bilinmiyor'
            if (/iphone/i.test(ua)) device = 'iPhone'
            else if (/ipad/i.test(ua)) device = 'iPad'
            else if (/android/i.test(ua)) device = 'Android'
            else if (/macintosh|mac os/i.test(ua)) device = 'Mac'
            else if (/windows/i.test(ua)) device = 'Windows PC'
            else if (/linux/i.test(ua)) device = 'Linux'

            const screen = latestView?.screen_width && latestView?.screen_height
                ? `${latestView.screen_width}x${latestView.screen_height}`
                : 'Bilinmiyor'

            const timeline: TimelineEvent[] = [
                ...data.views.map(v => ({
                    type: 'pageview' as const,
                    timestamp: v.created_at,
                    page_path: v.page_path,
                    detail: `Sayfa: ${v.page_path}`,
                })),
                ...data.clicks.map(c => ({
                    type: 'click' as const,
                    timestamp: c.created_at,
                    page_path: c.page_path,
                    detail: `Tıklama: "${c.element_text || c.element_tag}"`,
                })),
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

            return {
                ip_address: ip,
                first_seen: allTimestamps[0] || '',
                last_seen: allTimestamps[allTimestamps.length - 1] || '',
                device,
                screen,
                total_page_views: data.views.length,
                total_clicks: data.clicks.length,
                pages_visited: Array.from(new Set(data.views.map(v => v.page_path))),
                referrer: latestView?.referrer || null,
                timeline,
            }
        }).sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())
    }, [pageViews, clickEvents])

    // SVG Chart Constants
    const maxRevVal = Math.max(...monthlyStats.map(d => Math.max(d.revenue, d.profit)), 1000)
    const yMaxRev = Math.ceil(maxRevVal * 1.15 / 1000) * 1000
    const maxBottleVal = Math.max(...monthlyStats.map(d => Math.max(d.bottleCount, d.salesCount)), 10)
    const yMaxBottle = Math.ceil(maxBottleVal * 1.2 / 10) * 10

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* ═══ TOP HEADER ═══ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-ink">Raporlama & Analiz</h1>
                    <p className="text-sand text-xs sm:text-sm mt-0.5">
                        Aydan aya satış hacmi, kârlılık, ürün liderleri ve web trafiği
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Year Selector */}
                    <div className="flex items-center gap-1.5 bg-paper border border-hairline rounded-md px-2 py-1">
                        <Calendar className="w-3.5 h-3.5 text-sand" />
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            aria-label="Yıl Seçimi"
                            className="bg-transparent text-xs sm:text-sm font-medium text-ink focus:outline-none cursor-pointer"
                        >
                            <option value="all">Tüm Yıllar</option>
                            {availableYears.map(yr => (
                                <option key={yr} value={yr}>{yr} Yılı</option>
                            ))}
                        </select>
                    </div>

                    <Button
                        variant="outline"
                        onClick={handleExportMonthlyExcel}
                        className="border-hairline text-ink hover:bg-ink/5 text-xs sm:text-sm h-9"
                    >
                        <Download className="w-4 h-4 mr-1.5 sm:mr-2" />
                        Excel Raporu
                    </Button>

                    <Button
                        variant="outline"
                        onClick={fetchData}
                        disabled={loading}
                        className="border-hairline text-sand hover:text-ink hover:bg-ink/5 text-xs sm:text-sm h-9"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                        Yenile
                    </Button>
                </div>
            </div>

            {/* ═══ TABS NAVIGATION ═══ */}
            <div className="flex gap-1.5 p-1 bg-paper rounded-lg border border-hairline w-full sm:w-fit overflow-x-auto custom-scrollbar">
                <button
                    onClick={() => setActiveTab('sales-report')}
                    className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'sales-report'
                            ? 'bg-ink text-paper font-bold shadow-sm'
                            : 'text-sand hover:text-ink hover:bg-ink/5'
                    }`}
                >
                    <TrendingUp className="w-4 h-4" />
                    <span>Satış & Finans Raporları</span>
                </button>
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'overview'
                            ? 'bg-ink text-paper font-bold shadow-sm'
                            : 'text-sand hover:text-ink hover:bg-ink/5'
                    }`}
                >
                    <Globe className="w-4 h-4" />
                    <span>Web Ziyaretçi Trafiği</span>
                </button>
                <button
                    onClick={() => setActiveTab('visitors')}
                    className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'visitors'
                            ? 'bg-ink text-paper font-bold shadow-sm'
                            : 'text-sand hover:text-ink hover:bg-ink/5'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    <span>Ziyaretçi Profilleri ({visitorProfiles.length})</span>
                </button>
            </div>

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 1: SATIŞ VE FİNANSAL RAPORLAR                         */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === 'sales-report' && (
                <div className="space-y-6">
                    {/* KPI Summary Cards */}
                    <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-3 sm:p-4">
                                <div className="flex items-center justify-between text-sand text-[11px] font-mono uppercase mb-1">
                                    <span className="truncate">Toplam Ciro</span>
                                    <DollarSign className="w-3.5 h-3.5 shrink-0 text-rust" />
                                </div>
                                <div className="text-lg sm:text-xl font-bold text-ink truncate" title={formatCurrency(totalRevenue)}>
                                    {formatCurrency(totalRevenue)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-3 sm:p-4">
                                <div className="flex items-center justify-between text-sand text-[11px] font-mono uppercase mb-1">
                                    <span className="truncate">Net Kâr</span>
                                    <TrendingUp className="w-3.5 h-3.5 shrink-0 text-moss" />
                                </div>
                                <div className="text-lg sm:text-xl font-bold text-moss truncate" title={formatCurrency(totalProfit)}>
                                    {formatCurrency(totalProfit)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-3 sm:p-4">
                                <div className="flex items-center justify-between text-sand text-[11px] font-mono uppercase mb-1">
                                    <span className="truncate">Kâr Marjı</span>
                                    <Award className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                </div>
                                <div className="text-lg sm:text-xl font-bold text-ink truncate">
                                    %{avgMargin.toFixed(1)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-3 sm:p-4">
                                <div className="flex items-center justify-between text-sand text-[11px] font-mono uppercase mb-1">
                                    <span className="truncate">Satılan Şişe</span>
                                    <Package className="w-3.5 h-3.5 shrink-0 text-rust" />
                                </div>
                                <div className="text-lg sm:text-xl font-bold text-ink truncate">
                                    {totalBottles} Adet
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-3 sm:p-4">
                                <div className="flex items-center justify-between text-sand text-[11px] font-mono uppercase mb-1">
                                    <span className="truncate">Toplam Sipariş</span>
                                    <ShoppingCart className="w-3.5 h-3.5 shrink-0 text-sand" />
                                </div>
                                <div className="text-lg sm:text-xl font-bold text-ink truncate">
                                    {totalOrders} Satış
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-3 sm:p-4">
                                <div className="flex items-center justify-between text-sand text-[11px] font-mono uppercase mb-1">
                                    <span className="truncate">Ortalama Sepet</span>
                                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-sand" />
                                </div>
                                <div className="text-lg sm:text-xl font-bold text-ink truncate" title={formatCurrency(avgOrderValue)}>
                                    {formatCurrency(avgOrderValue)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ─── AYDAN AYA SATIŞ VE FİNANS TABLOSU ─── */}
                    <Card className="bg-paper border-hairline">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4">
                            <div>
                                <CardTitle className="text-lg font-bold text-ink flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-rust" />
                                    Aydan Aya Satış & Kârlılık Matrisi
                                </CardTitle>
                                <CardDescription className="text-sand text-xs mt-0.5">
                                    Her ay yapılan toplam satış adedi, ciro, maliyet, net kâr ve aylık büyüme oranları
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-8 text-center text-sand">Rapor yükleniyor...</div>
                            ) : monthlyStats.length === 0 ? (
                                <div className="p-8 text-center text-sand">Seçilen dönemde satış kaydı bulunmuyor.</div>
                            ) : (
                                <div className="overflow-x-auto custom-scrollbar">
                                    <Table className="min-w-[900px]">
                                        <TableHeader>
                                            <TableRow className="border-hairline hover:bg-transparent bg-ink/5">
                                                <TableHead className="text-sand font-mono text-xs whitespace-nowrap">Dönem (Ay)</TableHead>
                                                <TableHead className="text-sand font-mono text-xs text-right whitespace-nowrap">Satış (İşlem)</TableHead>
                                                <TableHead className="text-sand font-mono text-xs text-right whitespace-nowrap">Satılan Şişe</TableHead>
                                                <TableHead className="text-sand font-mono text-xs text-right whitespace-nowrap">Toplam Ciro</TableHead>
                                                <TableHead className="text-sand font-mono text-xs text-right whitespace-nowrap">Toplam Maliyet</TableHead>
                                                <TableHead className="text-sand font-mono text-xs text-right whitespace-nowrap">Net Kâr</TableHead>
                                                <TableHead className="text-sand font-mono text-xs text-right whitespace-nowrap">Kâr Marjı</TableHead>
                                                <TableHead className="text-sand font-mono text-xs text-right whitespace-nowrap">Tahsilat</TableHead>
                                                <TableHead className="text-sand font-mono text-xs text-right whitespace-nowrap">Aylık Büyüme (MoM)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {monthlyStats.map((stat) => (
                                                <TableRow key={stat.key} className="border-hairline hover:bg-ink/5">
                                                    <TableCell className="font-semibold text-ink whitespace-nowrap">
                                                        {stat.label}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-ink whitespace-nowrap">
                                                        {stat.salesCount} işlem
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-ink whitespace-nowrap">
                                                        {stat.bottleCount} adet
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-ink whitespace-nowrap">
                                                        {formatCurrency(stat.revenue)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sand whitespace-nowrap">
                                                        {formatCurrency(stat.cost)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-moss whitespace-nowrap">
                                                        {formatCurrency(stat.profit)}
                                                    </TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                            stat.marginPct >= 50
                                                                ? 'bg-moss/15 text-moss border border-moss/30'
                                                                : stat.marginPct >= 25
                                                                    ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                                                                    : 'bg-sand/15 text-sand'
                                                        }`}>
                                                            %{stat.marginPct.toFixed(1)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right text-sand whitespace-nowrap">
                                                        {formatCurrency(stat.paymentAmount)}
                                                    </TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        {stat.momGrowth === null ? (
                                                            <span className="text-sand text-xs">—</span>
                                                        ) : stat.momGrowth > 0 ? (
                                                            <span className="inline-flex items-center text-moss font-semibold text-xs">
                                                                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                                                                +{stat.momGrowth.toFixed(1)}%
                                                            </span>
                                                        ) : stat.momGrowth < 0 ? (
                                                            <span className="inline-flex items-center text-rust font-semibold text-xs">
                                                                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                                                                {stat.momGrowth.toFixed(1)}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-sand text-xs">%0.0</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ─── GÖRSEL GRAFİKLER (SVG) ─── */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* 1. Ciro vs Kâr Çubuk Grafiği */}
                        <Card className="bg-paper border-hairline">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div>
                                    <CardTitle className="text-base font-bold text-ink">Aylık Ciro & Net Kâr (₺)</CardTitle>
                                    <CardDescription className="text-xs text-sand">Gelir ve kârın aydan aya karşılaştırması</CardDescription>
                                </div>
                                <div className="flex gap-3 text-xs">
                                    <div className="flex items-center gap-1 text-sand">
                                        <span className="w-2.5 h-2.5 rounded bg-rust inline-block" /> Ciro
                                    </div>
                                    <div className="flex items-center gap-1 text-sand">
                                        <span className="w-2.5 h-2.5 rounded bg-moss inline-block" /> Net Kâr
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="h-[280px] flex items-center justify-center overflow-x-auto custom-scrollbar p-2">
                                <svg width="100%" height="100%" viewBox="0 0 540 260" className="min-w-[480px] w-full max-w-[600px] select-none overflow-visible">
                                    {/* Grid Lines */}
                                    {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                                        const y = 20 + 190 * (1 - pct)
                                        const val = Math.round(yMaxRev * pct)
                                        return (
                                            <g key={idx}>
                                                <line x1={50} y1={y} x2={520} y2={y} stroke="#b9b4a4" strokeWidth="1" strokeDasharray={idx === 0 ? "0" : "3 3"} opacity="0.6" />
                                                <text x={42} y={y + 3} fill="#6f6a5e" fontSize="9" textAnchor="end" className="font-mono font-medium">
                                                    {val >= 1000 ? `₺${(val / 1000).toFixed(0)}k` : `₺${val}`}
                                                </text>
                                            </g>
                                        )
                                    })}
                                    {/* Bars */}
                                    {monthlyStats.map((item, idx) => {
                                        const colW = (520 - 50) / Math.max(monthlyStats.length, 1)
                                        const xCenter = 50 + idx * colW + colW / 2
                                        const barW = Math.min(14, colW / 3)
                                        const revH = (item.revenue / (yMaxRev || 1)) * 190
                                        const profH = (item.profit / (yMaxRev || 1)) * 190
                                        const revY = 210 - revH
                                        const profY = 210 - profH

                                        return (
                                            <g key={item.key}>
                                                {item.revenue > 0 && (
                                                    <rect x={xCenter - barW - 2} y={revY} width={barW} height={revH} rx="2" fill="#8a1f0e" className="hover:opacity-80 transition-opacity">
                                                        <title>{`${item.label} Ciro: ${formatCurrency(item.revenue)}`}</title>
                                                    </rect>
                                                )}
                                                {item.profit > 0 && (
                                                    <rect x={xCenter + 2} y={profY} width={barW} height={profH} rx="2" fill="#4c6b2f" className="hover:opacity-80 transition-opacity">
                                                        <title>{`${item.label} Kâr: ${formatCurrency(item.profit)}`}</title>
                                                    </rect>
                                                )}
                                                <text x={xCenter} y={230} fill="#6f6a5e" fontSize="9" textAnchor="middle" className="font-mono">
                                                    {item.shortLabel}
                                                </text>
                                            </g>
                                        )
                                    })}
                                </svg>
                            </CardContent>
                        </Card>

                        {/* 2. Satılan Şişe & Sipariş Sayısı Grafiği */}
                        <Card className="bg-paper border-hairline">
                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                <div>
                                    <CardTitle className="text-base font-bold text-ink">Aylık Şişe & Sipariş Hacmi</CardTitle>
                                    <CardDescription className="text-xs text-sand">Satılan fiziksel ürün adedi ve işlem sayısı</CardDescription>
                                </div>
                                <div className="flex gap-3 text-xs">
                                    <div className="flex items-center gap-1 text-sand">
                                        <span className="w-2.5 h-2.5 rounded bg-ink inline-block" /> Şişe (Adet)
                                    </div>
                                    <div className="flex items-center gap-1 text-sand">
                                        <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Sipariş Sayısı
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="h-[280px] flex items-center justify-center overflow-x-auto custom-scrollbar p-2">
                                <svg width="100%" height="100%" viewBox="0 0 540 260" className="min-w-[480px] w-full max-w-[600px] select-none overflow-visible">
                                    {/* Grid Lines */}
                                    {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                                        const y = 20 + 190 * (1 - pct)
                                        const val = Math.round(yMaxBottle * pct)
                                        return (
                                            <g key={idx}>
                                                <line x1={40} y1={y} x2={520} y2={y} stroke="#b9b4a4" strokeWidth="1" strokeDasharray={idx === 0 ? "0" : "3 3"} opacity="0.6" />
                                                <text x={32} y={y + 3} fill="#6f6a5e" fontSize="9" textAnchor="end" className="font-mono font-medium">
                                                    {val}
                                                </text>
                                            </g>
                                        )
                                    })}
                                    {/* Bars */}
                                    {monthlyStats.map((item, idx) => {
                                        const colW = (520 - 40) / Math.max(monthlyStats.length, 1)
                                        const xCenter = 40 + idx * colW + colW / 2
                                        const barW = Math.min(14, colW / 3)
                                        const btlH = (item.bottleCount / (yMaxBottle || 1)) * 190
                                        const ordH = (item.salesCount / (yMaxBottle || 1)) * 190
                                        const btlY = 210 - btlH
                                        const ordY = 210 - ordH

                                        return (
                                            <g key={item.key}>
                                                {item.bottleCount > 0 && (
                                                    <rect x={xCenter - barW - 2} y={btlY} width={barW} height={btlH} rx="2" fill="#1d1b16" className="hover:opacity-80 transition-opacity">
                                                        <title>{`${item.label} Şişe: ${item.bottleCount} adet`}</title>
                                                    </rect>
                                                )}
                                                {item.salesCount > 0 && (
                                                    <rect x={xCenter + 2} y={ordY} width={barW} height={ordH} rx="2" fill="#d97706" className="hover:opacity-80 transition-opacity">
                                                        <title>{`${item.label} Sipariş: ${item.salesCount} işlem`}</title>
                                                    </rect>
                                                )}
                                                <text x={xCenter} y={230} fill="#6f6a5e" fontSize="9" textAnchor="middle" className="font-mono">
                                                    {item.shortLabel}
                                                </text>
                                            </g>
                                        )
                                    })}
                                </svg>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ─── EN ÇOK SATANLAR & EN İYİ MÜŞTERİLER ─── */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* En Çok Satan Parfümler */}
                        <Card className="bg-paper border-hairline">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-bold text-ink flex items-center gap-2">
                                    <Award className="w-4 h-4 text-amber-500" />
                                    En Çok Satan Parfümler (Top 10)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <Table className="min-w-[450px]">
                                        <TableHeader>
                                            <TableRow className="border-hairline bg-ink/5">
                                                <TableHead className="text-sand text-xs">#</TableHead>
                                                <TableHead className="text-sand text-xs">Parfüm Adı</TableHead>
                                                <TableHead className="text-sand text-xs text-right">Satılan Adet</TableHead>
                                                <TableHead className="text-sand text-xs text-right">Toplam Ciro</TableHead>
                                                <TableHead className="text-sand text-xs text-right">Net Kâr</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {topProducts.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-6 text-sand text-xs">Veri bulunamadı</TableCell>
                                                </TableRow>
                                            ) : (
                                                topProducts.map((p, idx) => (
                                                    <TableRow key={p.name} className="border-hairline hover:bg-ink/5">
                                                        <TableCell className="font-bold text-sand text-xs">{idx + 1}</TableCell>
                                                        <TableCell className="font-semibold text-ink text-xs truncate max-w-[160px]" title={p.name}>
                                                            {p.name}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-ink text-xs">
                                                            {p.quantity} adet
                                                        </TableCell>
                                                        <TableCell className="text-right text-ink text-xs">
                                                            {formatCurrency(p.revenue)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold text-moss text-xs">
                                                            {formatCurrency(p.profit)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* En İyi Müşteriler */}
                        <Card className="bg-paper border-hairline">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-bold text-ink flex items-center gap-2">
                                    <Users className="w-4 h-4 text-rust" />
                                    En Yüksek Hacimli Müşteriler (Top 10)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <Table className="min-w-[450px]">
                                        <TableHeader>
                                            <TableRow className="border-hairline bg-ink/5">
                                                <TableHead className="text-sand text-xs">#</TableHead>
                                                <TableHead className="text-sand text-xs">Müşteri Adı</TableHead>
                                                <TableHead className="text-sand text-xs text-right">Sipariş Sayısı</TableHead>
                                                <TableHead className="text-sand text-xs text-right">Toplam Harcama</TableHead>
                                                <TableHead className="text-sand text-xs text-right">Bakiye</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {topCustomers.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-6 text-sand text-xs">Veri bulunamadı</TableCell>
                                                </TableRow>
                                            ) : (
                                                topCustomers.map((c, idx) => (
                                                    <TableRow key={c.id} className="border-hairline hover:bg-ink/5">
                                                        <TableCell className="font-bold text-sand text-xs">{idx + 1}</TableCell>
                                                        <TableCell className="font-semibold text-ink text-xs truncate max-w-[160px]" title={c.name}>
                                                            {c.name}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sand text-xs">
                                                            {c.orderCount} sipariş
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-ink text-xs">
                                                            {formatCurrency(c.totalSpent)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs">
                                                            <span className={c.balance > 0 ? 'text-amber-500 font-bold' : c.balance < 0 ? 'text-moss font-bold' : 'text-sand'}>
                                                                {formatCurrency(c.balance)}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 2: WEB ZİYARETÇİ TRAFİĞİ                              */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-4">
                                <p className="text-xs text-sand font-mono uppercase mb-1">Bugünkü Ziyaretçi</p>
                                <p className="text-2xl font-bold text-ink">
                                    {new Set(pageViews.filter(v => new Date(v.created_at).toDateString() === new Date().toDateString()).map(v => v.ip_address)).size}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-4">
                                <p className="text-xs text-sand font-mono uppercase mb-1">Toplam Sayfa Görüntüleme</p>
                                <p className="text-2xl font-bold text-ink">{pageViews.length}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-4">
                                <p className="text-xs text-sand font-mono uppercase mb-1">Toplam Tıklama Olayı</p>
                                <p className="text-2xl font-bold text-rust">{clickEvents.length}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-4">
                                <p className="text-xs text-sand font-mono uppercase mb-1">Tekil Ziyaretçi</p>
                                <p className="text-2xl font-bold text-moss">{visitorProfiles.length}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* En Çok Gezilen Sayfalar */}
                        <Card className="bg-paper border-hairline">
                            <CardHeader>
                                <CardTitle className="text-base font-bold text-ink">En Çok Ziyaret Edilen Sayfalar</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {(() => {
                                    const pageCounts = pageViews.reduce((acc, v) => {
                                        acc[v.page_path] = (acc[v.page_path] || 0) + 1
                                        return acc
                                    }, {} as Record<string, number>)
                                    const sorted = Object.entries(pageCounts).sort(([, a], [, b]) => b - a).slice(0, 8)
                                    if (sorted.length === 0) return <p className="text-sand text-xs">Henüz veri yok</p>
                                    return sorted.map(([path, count], idx) => (
                                        <div key={path} className="flex justify-between items-center py-1.5 border-b border-hairline text-xs">
                                            <span className="font-mono text-ink truncate max-w-[280px]">#{idx + 1} {path}</span>
                                            <span className="font-bold text-rust">{count} kez</span>
                                        </div>
                                    ))
                                })()}
                            </CardContent>
                        </Card>

                        {/* Cihaz Dağılımı */}
                        <Card className="bg-paper border-hairline">
                            <CardHeader>
                                <CardTitle className="text-base font-bold text-ink">Cihaz & Platform Dağılımı</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {(() => {
                                    const deviceCounts = visitorProfiles.reduce((acc, v) => {
                                        acc[v.device] = (acc[v.device] || 0) + 1
                                        return acc
                                    }, {} as Record<string, number>)
                                    const sorted = Object.entries(deviceCounts).sort(([, a], [, b]) => b - a)
                                    if (sorted.length === 0) return <p className="text-sand text-xs">Henüz veri yok</p>
                                    return sorted.map(([device, count]) => {
                                        const pct = visitorProfiles.length > 0 ? Math.round((count / visitorProfiles.length) * 100) : 0
                                        return (
                                            <div key={device} className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-ink font-medium">{device}</span>
                                                    <span className="text-sand">{count} kişi (%{pct})</span>
                                                </div>
                                                <div className="w-full bg-ink/10 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-rust h-full rounded-full" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        )
                                    })
                                })()}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════ */}
            {/* TAB 3: ZİYARETÇİ PROFİLLERİ                                */}
            {/* ══════════════════════════════════════════════════════════ */}
            {activeTab === 'visitors' && (
                <div className="space-y-4">
                    {visitorProfiles.length === 0 ? (
                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-8 text-center text-sand">
                                Henüz ziyaretçi profili kaydedilmemiş.
                            </CardContent>
                        </Card>
                    ) : (
                        visitorProfiles.map(visitor => (
                            <Card key={visitor.ip_address} className="bg-paper border-hairline">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-2">
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-rust" />
                                            <span className="font-mono font-bold text-sm text-ink">{visitor.ip_address}</span>
                                            <Badge variant="outline" className="text-[10px] bg-ink/5 border-hairline text-sand">
                                                {visitor.device}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-sand">
                                            Son Görülme: {new Date(visitor.last_seen).toLocaleString('tr-TR')}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                        <div>
                                            <span className="text-sand block">Sayfa Görüntüleme</span>
                                            <strong className="text-ink">{visitor.total_page_views}</strong>
                                        </div>
                                        <div>
                                            <span className="text-sand block">Tıklama Sayısı</span>
                                            <strong className="text-rust">{visitor.total_clicks}</strong>
                                        </div>
                                        <div>
                                            <span className="text-sand block">Ekran Çözünürlüğü</span>
                                            <strong className="text-ink">{visitor.screen}</strong>
                                        </div>
                                        <div>
                                            <span className="text-sand block">Ziyaret Edilen Sayfalar</span>
                                            <strong className="text-ink">{visitor.pages_visited.length} sayfa</strong>
                                        </div>
                                    </div>

                                    {/* Recent Events */}
                                    <div className="space-y-1.5 pt-2 border-t border-hairline">
                                        <span className="text-[11px] font-mono text-sand uppercase">Son Etkileşimler:</span>
                                        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                            {visitor.timeline.slice(0, 5).map((ev, i) => (
                                                <div key={i} className="flex items-center justify-between text-xs bg-ink/5 p-1.5 rounded">
                                                    <span className="text-ink truncate max-w-[320px]">{ev.detail}</span>
                                                    <span className="text-sand text-[10px]">{new Date(ev.timestamp).toLocaleTimeString('tr-TR')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
