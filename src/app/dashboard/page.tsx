import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ExportAllExcelButton } from '@/components/ExportAllExcelButton'

export const dynamic = 'force-dynamic'

async function getStats() {
    const supabase = await createClient()

    const [materials, recipes, products, sales, rawCostRes, recentSalesRes, customers] = await Promise.all([
        supabase.from('raw_materials').select('id, total_cost', { count: 'exact' }),
        supabase.from('recipes').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('products').select('stock'),
        supabase.from('sales').select('total_price, profit, quantity, sale_date'),
        supabase.from('raw_materials').select('total_cost'),
        supabase.from('sales').select('*, customer:customers(name), product:products(name)').order('sale_date', { ascending: false }).limit(5),
        supabase.from('customers').select('id', { count: 'exact' })
    ])

    const totalStock = products.data?.reduce((sum, p) => sum + (p.stock || 0), 0) || 0
    const totalSales = sales.data?.reduce((sum, s) => sum + (s.total_price || 0), 0) || 0
    const totalProfit = sales.data?.reduce((sum, s) => sum + (s.profit || 0), 0) || 0
    const totalBottlesSold = sales.data?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0
    const totalMaterialCost = rawCostRes.data?.reduce((sum, m) => sum + (m.total_cost || 0), 0) || 0

    // Group sales by month (last 6 months)
    const monthlyData: Record<string, { revenue: number, profit: number }> = {}
    for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const label = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })
        monthlyData[label] = { revenue: 0, profit: 0 }
    }

    sales.data?.forEach(s => {
        if (!s.sale_date) return
        const date = new Date(s.sale_date)
        const label = date.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })
        if (monthlyData[label] !== undefined) {
            monthlyData[label].revenue += s.total_price || 0
            monthlyData[label].profit += s.profit || 0
        }
    })

    const monthlyList = Object.entries(monthlyData).map(([name, val]) => ({ name, ...val }))

    return {
        customersCount: customers.count || 0,
        materialsCount: materials.count || 0,
        recipesCount: recipes.count || 0,
        totalStock,
        totalSales,
        totalProfit,
        totalBottlesSold,
        totalMaterialCost,
        monthlyList,
        recentSales: recentSalesRes.data || []
    }
}

function StatCard({ title, value, icon }: {
    title: string
    value: string | number
    icon: React.ReactNode
}) {
    return (
        <Card className="bg-paper border-hairline hover:border-sand/40 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
                <CardTitle className="text-[11px] sm:text-xs font-storefront-mono tracking-wide text-sand uppercase truncate pr-1" title={title}>
                    {title}
                </CardTitle>
                <div className="text-sand shrink-0">
                    {icon}
                </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                <div className="text-lg sm:text-xl md:text-2xl font-bold text-ink truncate" title={String(value)}>{value}</div>
            </CardContent>
        </Card>
    )
}

export default async function DashboardPage() {
    const stats = await getStats()

    // SVG Chart Constants
    const maxDataVal = Math.max(...stats.monthlyList.map(d => Math.max(d.revenue, d.profit)), 1000)
    const yMax = Math.ceil(maxDataVal * 1.15 / 1000) * 1000

    const formatYLabel = (val: number) => {
        if (val >= 1000000) return `₺${(val / 1000000).toFixed(1)}M`
        if (val >= 1000) return `₺${(val / 1000).toFixed(0)}k`
        return `₺${val}`
    }

    const gridLines = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax]
    const plotWidth = 520
    const plotHeight = 240
    const padLeft = 60
    const padTop = 20
    const colWidth = plotWidth / 6
    const barWidth = 14
    const barGap = 4

    return (
        <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0 overflow-x-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-ink">Dashboard</h1>
                    <p className="text-sand text-xs sm:text-sm mt-0.5">Parfüm üretim ve satış yönetim paneli</p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportAllExcelButton />
                </div>
            </div>

            {/* Row 1: Key Stats Grid */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                <StatCard
                    title="Müşteriler"
                    value={stats.customersCount}
                    icon={
                        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                        </svg>
                    }
                />
                <StatCard
                    title="Aktif Reçeteler"
                    value={stats.recipesCount}
                    icon={
                        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 3h6v8l4 8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2l4-8V3zM9 3h6" />
                        </svg>
                    }
                />
                <StatCard
                    title="Stoktaki Ürünler"
                    value={stats.totalStock}
                    icon={
                        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                    }
                />
                <StatCard
                    title="Satılan Şişe"
                    value={stats.totalBottlesSold}
                    icon={
                        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 2v4a2 2 0 0 1-2 2H6" />
                            <path d="M14 2v4a2 2 0 0 0 2 2h2" />
                            <path d="M8 8v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V8" />
                            <path d="M10 2h4" />
                        </svg>
                    }
                />
                <StatCard
                    title="Toplam Ciro"
                    value={`₺${stats.totalSales.toLocaleString('tr-TR')}`}
                    icon={
                        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
                            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                        </svg>
                    }
                />
                <StatCard
                    title="Net Kâr"
                    value={`₺${stats.totalProfit.toLocaleString('tr-TR')}`}
                    icon={
                        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    }
                />
            </div>

            {/* Row 2: Charts and Quick Actions */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3 min-w-0">
                {/* Financial Analytics Chart Card */}
                <Card className="bg-paper border-hairline lg:col-span-2 min-w-0 overflow-hidden">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 sm:pb-6">
                        <CardTitle className="text-ink text-base sm:text-lg font-semibold">Mali Analiz (Son 6 Ay)</CardTitle>
                        <div className="flex gap-4 text-xs">
                            <div className="flex items-center gap-1.5 text-sand">
                                <span className="w-2.5 h-2.5 rounded bg-rust inline-block" />
                                Ciro
                            </div>
                            <div className="flex items-center gap-1.5 text-sand">
                                <span className="w-2.5 h-2.5 rounded bg-moss inline-block" />
                                Net Kâr
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6 w-full min-w-0">
                        <div className="w-full overflow-x-auto custom-scrollbar">
                            <svg width="100%" height="100%" viewBox="0 0 600 300" className="min-w-[320px] sm:min-w-[500px] w-full max-w-[650px] overflow-visible select-none h-[220px] sm:h-[280px]">
                                {/* Grid Lines */}
                                {gridLines.map((val, idx) => {
                                    const y = padTop + plotHeight * (1 - val / yMax)
                                    return (
                                        <g key={idx} className="opacity-70">
                                            <line
                                                x1={padLeft}
                                                y1={y}
                                                x2={padLeft + plotWidth}
                                                y2={y}
                                                stroke="#b9b4a4"
                                                strokeWidth="1"
                                                strokeDasharray={idx === 0 ? "0" : "4 4"}
                                            />
                                            <text
                                                x={padLeft - 10}
                                                y={y + 4}
                                                fill="#6f6a5e"
                                                fontSize="10"
                                                textAnchor="end"
                                                className="font-medium"
                                            >
                                                {formatYLabel(val)}
                                            </text>
                                        </g>
                                    )
                                })}

                                {/* X Axis labels & bars */}
                                {stats.monthlyList.map((item, idx) => {
                                    const xCenter = padLeft + idx * colWidth + colWidth / 2

                                    // Revenue Bar
                                    const revHeight = (item.revenue / yMax) * plotHeight
                                    const revX = xCenter - barWidth - barGap / 2
                                    const revY = padTop + plotHeight - revHeight

                                    // Profit Bar
                                    const prfHeight = (item.profit / yMax) * plotHeight
                                    const prfX = xCenter + barGap / 2
                                    const prfY = padTop + plotHeight - prfHeight

                                    return (
                                        <g key={idx}>
                                            {/* Revenue Rect */}
                                            {item.revenue > 0 && (
                                                <rect
                                                    x={revX}
                                                    y={revY}
                                                    width={barWidth}
                                                    height={revHeight}
                                                    rx="2"
                                                    fill="#8a1f0e"
                                                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                                                >
                                                    <title>{`${item.name} Ciro: ₺${item.revenue.toLocaleString('tr-TR')}`}</title>
                                                </rect>
                                            )}

                                            {/* Profit Rect */}
                                            {item.profit > 0 && (
                                                <rect
                                                    x={prfX}
                                                    y={prfY}
                                                    width={barWidth}
                                                    height={prfHeight}
                                                    rx="2"
                                                    fill="#4c6b2f"
                                                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                                                >
                                                    <title>{`${item.name} Net Kâr: ₺${item.profit.toLocaleString('tr-TR')}`}</title>
                                                </rect>
                                            )}

                                            {/* Month Label */}
                                            <text
                                                x={xCenter}
                                                y={padTop + plotHeight + 20}
                                                fill="#6f6a5e"
                                                fontSize="10"
                                                textAnchor="middle"
                                                className="font-semibold"
                                            >
                                                {item.name}
                                            </text>
                                        </g>
                                    )
                                })}
                            </svg>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions Card */}
                <Card className="bg-paper border-hairline min-w-0 overflow-hidden">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-ink text-base sm:text-lg font-semibold">Hızlı İşlemler</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2.5 sm:gap-3 p-3 sm:p-6 pt-0">
                        <a href="/dashboard/production" className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg bg-ink/5 hover:bg-ink/10 transition-colors group min-w-0">
                            <div className="p-2 rounded-lg bg-ink/10 shrink-0">
                                <svg className="w-4 h-4 text-ink" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16z" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-xs sm:text-sm text-ink group-hover:text-rust transition-colors truncate">Üretim Başlat</p>
                                <p className="text-xs text-sand truncate">Yeni bir parfüm serisi üretin</p>
                            </div>
                        </a>
                        <a href="/dashboard/sales" className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg bg-ink/5 hover:bg-ink/10 transition-colors group min-w-0">
                            <div className="p-2 rounded-lg bg-ink/10 shrink-0">
                                <svg className="w-4 h-4 text-ink" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
                                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-xs sm:text-sm text-ink group-hover:text-rust transition-colors truncate">Satış Gir</p>
                                <p className="text-xs text-sand truncate">Yeni bir sipariş kaydedin</p>
                            </div>
                        </a>
                        <a href="/dashboard/inventory" className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg bg-ink/5 hover:bg-ink/10 transition-colors group min-w-0">
                            <div className="p-2 rounded-lg bg-ink/10 shrink-0">
                                <svg className="w-4 h-4 text-ink" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4.5 3h15M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3M6 14h12" />
                                </svg>
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-xs sm:text-sm text-ink group-hover:text-rust transition-colors truncate">Envanteri Yönet</p>
                                <p className="text-xs text-sand truncate">Hammadde stoklarını güncelleyin</p>
                            </div>
                        </a>
                    </CardContent>
                </Card>
            </div>

            {/* Row 3: Recent Transactions and System Info */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3 min-w-0">
                {/* Son İşlemler Card */}
                <Card className="bg-paper border-hairline lg:col-span-2 min-w-0 overflow-hidden">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-ink text-base sm:text-lg font-semibold">Son İşlemler</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="w-full overflow-x-auto custom-scrollbar min-w-0">
                            <Table className="min-w-[480px] sm:min-w-[540px]">
                                <TableHeader>
                                    <TableRow className="border-hairline hover:bg-transparent">
                                        <TableHead className="text-sand font-storefront-mono text-xs tracking-wide px-3 sm:px-6">Tarih</TableHead>
                                        <TableHead className="text-sand font-storefront-mono text-xs tracking-wide">Müşteri</TableHead>
                                        <TableHead className="text-sand font-storefront-mono text-xs tracking-wide">Detay</TableHead>
                                        <TableHead className="text-sand font-storefront-mono text-xs tracking-wide text-right">Tutar</TableHead>
                                        <TableHead className="text-sand font-storefront-mono text-xs tracking-wide text-right px-3 sm:px-6">Net Kâr</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.recentSales.length === 0 ? (
                                        <TableRow className="hover:bg-transparent">
                                            <TableCell colSpan={5} className="text-center text-sand py-8 text-xs sm:text-sm">
                                                Henüz işlem kaydı bulunmuyor.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        stats.recentSales.map((sale: any) => {
                                            const isPayment = sale.quantity === 0 || sale.product?.name === 'Tahsilat'
                                            return (
                                                <TableRow key={sale.id} className="border-hairline hover:bg-ink/5">
                                                    <TableCell className="text-sand font-storefront-mono text-xs px-3 sm:px-6 whitespace-nowrap">
                                                        {sale.sale_date}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-ink text-xs sm:text-sm max-w-[120px] sm:max-w-[160px] truncate" title={sale.customer?.name || 'Perakende Müşteri'}>
                                                        {sale.customer?.name || 'Perakende Müşteri'}
                                                    </TableCell>
                                                    <TableCell className="text-sand text-xs sm:text-sm max-w-[140px] truncate" title={sale.product?.name}>
                                                        {isPayment ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-moss/10 text-moss border border-moss/30">
                                                                Tahsilat
                                                            </span>
                                                        ) : (
                                                            <span>
                                                                {sale.product?.name || 'Bilinmeyen Ürün'} <span className="text-sand/60">({sale.quantity}x)</span>
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-ink text-xs sm:text-sm whitespace-nowrap">
                                                        {isPayment ? (
                                                            <span className="text-moss">+{sale.payment_amount?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                                        ) : (
                                                            <span>{sale.total_price?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs sm:text-sm px-3 sm:px-6 whitespace-nowrap">
                                                        {isPayment ? (
                                                            <span className="text-sand">-</span>
                                                        ) : sale.profit !== null ? (
                                                            <span className="text-moss font-bold">
                                                                {sale.profit?.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                                            </span>
                                                        ) : (
                                                            <span className="text-sand">-</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* System Info Card */}
                <Card className="bg-paper border-hairline min-w-0 overflow-hidden">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-ink text-base sm:text-lg font-semibold">Sistem Bilgisi</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6 pt-0 text-xs sm:text-sm">
                        <div className="flex justify-between items-center py-2 border-b border-hairline">
                            <span className="text-sand">Versiyon</span>
                            <span className="text-ink font-medium">1.0.0</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-hairline">
                            <span className="text-sand">Veritabanı</span>
                            <span className="text-moss font-medium">Bağlı</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-sand">Kullanıcı</span>
                            <span className="text-ink font-medium truncate max-w-[140px] sm:max-w-[180px]" title="ayanakadir@hotmail.com">
                                ayanakadir@hotmail.com
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
