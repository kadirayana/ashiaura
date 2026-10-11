'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    CheckCircle2,
    Database,
    Package,
    RefreshCw,
    Search,
    Warehouse,
} from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'

type ProductOption = {
    id: string
    name: string
    gender: string | null
}

type InventoryBatch = {
    id: string
    lot_no: string
    product_id: string
    quantity: number
    unit_cost: number | null
    arrival_date: string
    supplier_id: string | null
}

type IngredientDeduction = {
    material_id?: string
    material_name: string
    quantity_deducted: number
    unit: string
    unit_cost?: number | null
    total_cost?: number | null
    lot_no?: string | null
    supplier?: string | null
}

type ProductionBatch = {
    product_id: string | null
    batch_number: string | null
    production_date: string
    ingredient_deductions: IngredientDeduction[] | null
}

type BatchStatus = 'all' | 'available' | 'low' | 'empty'
type BatchSort = 'arrival' | 'lot' | 'product' | 'supplier' | 'quantity' | 'cost'

function formatDate(value: string) {
    return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value))
}

function getBatchStatus(quantity: number): Exclude<BatchStatus, 'all'> {
    if (quantity <= 0) return 'empty'
    if (quantity <= 2) return 'low'
    return 'available'
}

export default function ProductsTrackerPage() {
    const [products, setProducts] = useState<ProductOption[]>([])
    const [batches, setBatches] = useState<InventoryBatch[]>([])
    const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([])
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState<BatchStatus>('all')
    const [productFilter, setProductFilter] = useState('all')
    const [sortBy, setSortBy] = useState<BatchSort>('arrival')
    const [sortDescending, setSortDescending] = useState(false)
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    async function loadData(isRefresh = false) {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)

        const supabase = createClient()
        const [productsResult, batchesResult, productionResult] = await Promise.all([
            supabase.from('products').select('id, name, gender').order('name'),
            supabase
                .from('inventory_batches')
                .select('id, lot_no, product_id, quantity, unit_cost, arrival_date, supplier_id')
                .order('arrival_date', { ascending: true }),
            supabase
                .from('production_batches')
                .select('product_id, batch_number, production_date, ingredient_deductions')
                .order('production_date', { ascending: false }),
        ])

        if (productsResult.error || batchesResult.error || productionResult.error) {
            console.error('Batch data loading error:', productsResult.error || batchesResult.error || productionResult.error)
            toast.error('Batch verileri yüklenemedi. Supabase tablo izinlerini kontrol edin.')
        } else {
            setProducts(productsResult.data || [])
            setBatches(batchesResult.data || [])
            setProductionBatches((productionResult.data || []) as ProductionBatch[])
        }

        setLoading(false)
        setRefreshing(false)
    }

    useEffect(() => {
        loadData()
    }, [])

    const productMap = useMemo(
        () => new Map(products.map((product) => [product.id, product])),
        [products]
    )

    const productionMap = useMemo(
        () => new Map(
            productionBatches.map((productionBatch) => [
                `${productionBatch.product_id}:${productionBatch.batch_number}`,
                productionBatch,
            ])
        ),
        [productionBatches]
    )

    function getProductionBatch(batch: InventoryBatch) {
        return productionMap.get(`${batch.product_id}:${batch.lot_no}`) || null
    }

    function getSuppliers(batch: InventoryBatch) {
        const production = getProductionBatch(batch)
        const suppliers = production?.ingredient_deductions
            ?.map((deduction) => deduction.supplier?.trim())
            .filter((supplier): supplier is string => Boolean(supplier)) || []

        return Array.from(new Set(suppliers))
    }

    const filteredBatches = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase('tr-TR')

        const filtered = batches.filter((batch) => {
            const product = productMap.get(batch.product_id)
            const suppliers = getSuppliers(batch).join(' ')
            const matchesSearch = !normalizedSearch ||
                batch.lot_no.toLocaleLowerCase('tr-TR').includes(normalizedSearch) ||
                product?.name.toLocaleLowerCase('tr-TR').includes(normalizedSearch) ||
                suppliers.toLocaleLowerCase('tr-TR').includes(normalizedSearch)
            const matchesStatus = status === 'all' || getBatchStatus(batch.quantity) === status
            const matchesProduct = productFilter === 'all' || batch.product_id === productFilter

            return matchesSearch && matchesStatus && matchesProduct
        })

        return filtered.sort((a, b) => {
            const productA = productMap.get(a.product_id)?.name || ''
            const productB = productMap.get(b.product_id)?.name || ''
            let comparison = 0

            if (sortBy === 'arrival') {
                comparison = new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime()
            } else if (sortBy === 'lot') {
                comparison = a.lot_no.localeCompare(b.lot_no, 'tr-TR')
            } else if (sortBy === 'product') {
                comparison = productA.localeCompare(productB, 'tr-TR')
            } else if (sortBy === 'supplier') {
                comparison = getSuppliers(a).join(', ').localeCompare(getSuppliers(b).join(', '), 'tr-TR')
            } else if (sortBy === 'quantity') {
                comparison = a.quantity - b.quantity
            } else {
                comparison = (a.unit_cost || 0) - (b.unit_cost || 0)
            }

            return sortDescending ? -comparison : comparison
        })
    }, [batches, productFilter, productMap, productionMap, search, sortBy, sortDescending, status])

    const stats = useMemo(() => ({
        total: batches.length,
        available: batches.filter((batch) => batch.quantity > 0).length,
        low: batches.filter((batch) => batch.quantity > 0 && batch.quantity <= 2).length,
        units: batches.reduce((total, batch) => total + (batch.quantity || 0), 0),
    }), [batches])

    const selectedBatch = selectedBatchId
        ? batches.find((batch) => batch.id === selectedBatchId) || null
        : null
    const selectedProduct = selectedBatch ? productMap.get(selectedBatch.product_id) : null
    const selectedProduction = selectedBatch ? getProductionBatch(selectedBatch) : null

    function changeSort(nextSort: BatchSort) {
        if (sortBy === nextSort) {
            setSortDescending((current) => !current)
        } else {
            setSortBy(nextSort)
            setSortDescending(false)
        }
    }

    return (
        <div className="max-w-7xl space-y-6 text-ink">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2.5 text-2xl font-bold sm:text-3xl">
                        <Warehouse className="h-7 w-7 text-rust" />
                        Batch Takibi
                    </h1>
                    <p className="mt-1 text-sm text-sand">
                        Depodaki lotları, stok durumunu ve FIFO sırasını tek ekrandan yönetin.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => loadData(true)}
                    disabled={loading || refreshing}
                    className="border-hairline text-ink"
                >
                    <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Yenile
                </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Toplam Batch" value={stats.total} icon={<Database className="h-4 w-4" />} />
                <StatCard label="Aktif Batch" value={stats.available} icon={<CheckCircle2 className="h-4 w-4" />} />
                <StatCard label="Son 2 Adet" value={stats.low} icon={<AlertTriangle className="h-4 w-4" />} tone="rust" />
                <StatCard label="Toplam Stok" value={stats.units} icon={<Package className="h-4 w-4" />} />
            </div>

            <Card className="border-hairline bg-paper">
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sand" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Lot numarası veya ürün ara..."
                            className="h-10 border-hairline bg-paper pl-9 text-ink"
                        />
                    </div>
                    <select
                        value={productFilter}
                        onChange={(event) => setProductFilter(event.target.value)}
                        className="h-10 rounded-md border border-hairline bg-paper px-3 text-sm text-ink"
                        aria-label="Ürün filtresi"
                    >
                        <option value="all">Tüm ürünler</option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                    </select>
                    <div className="flex gap-1 overflow-x-auto">
                        {([
                            ['all', 'Tümü'],
                            ['available', 'Aktif'],
                            ['low', 'Son 2'],
                            ['empty', 'Boş'],
                        ] as const).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setStatus(value)}
                                className={`whitespace-nowrap rounded-md border px-3 py-2 text-xs font-semibold transition-colors ${
                                    status === value
                                        ? 'border-ink bg-ink text-paper'
                                        : 'border-hairline text-sand hover:border-ink hover:text-ink'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <Card className="border-hairline bg-paper">
                    <CardHeader className="border-b border-hairline pb-3">
                        <CardTitle className="text-base text-ink">
                            Lot Listesi <span className="font-normal text-sand">({filteredBatches.length})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-8 text-center text-sm text-sand">Batch kayıtları yükleniyor...</div>
                        ) : filteredBatches.length === 0 ? (
                            <div className="p-8 text-center text-sm text-sand">
                                Aramanıza uyan batch bulunamadı.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-ink/[0.03]">
                                    <TableRow className="border-hairline hover:bg-transparent">
                                        <SortableHead label="Batch / Lot" sort="lot" current={sortBy} descending={sortDescending} onSort={changeSort} />
                                        <SortableHead label="Ürün" sort="product" current={sortBy} descending={sortDescending} onSort={changeSort} />
                                        <SortableHead label="Giriş tarihi" sort="arrival" current={sortBy} descending={sortDescending} onSort={changeSort} />
                                        <SortableHead label="Tedarikçi" sort="supplier" current={sortBy} descending={sortDescending} onSort={changeSort} />
                                        <SortableHead label="Stok" sort="quantity" current={sortBy} descending={sortDescending} onSort={changeSort} className="text-right" />
                                        <SortableHead label="Maliyet" sort="cost" current={sortBy} descending={sortDescending} onSort={changeSort} className="text-right" />
                                        <TableHead className="text-right text-xs uppercase tracking-wide text-sand">Durum</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBatches.map((batch) => {
                                        const product = productMap.get(batch.product_id)
                                        const batchStatus = getBatchStatus(batch.quantity)
                                        const isSelected = selectedBatchId === batch.id

                                        return (
                                            <TableRow
                                                key={batch.id}
                                                onClick={() => setSelectedBatchId(batch.id)}
                                                className={`cursor-pointer border-hairline ${isSelected ? 'bg-rust/10 hover:bg-rust/10' : 'hover:bg-ink/5'}`}
                                            >
                                                <TableCell className="min-w-[150px]">
                                                    <span className="font-storefront-mono font-bold text-rust">{batch.lot_no}</span>
                                                </TableCell>
                                                <TableCell className="min-w-[210px] max-w-[280px]">
                                                    <p className="truncate font-semibold text-ink">{product?.name || 'Ürün bulunamadı'}</p>
                                                    {product?.gender && <p className="mt-0.5 text-xs capitalize text-sand">{product.gender}</p>}
                                                </TableCell>
                                                <TableCell className="text-sm text-sand">{formatDate(batch.arrival_date)}</TableCell>
                                                <TableCell className="max-w-[190px] text-sm text-sand">
                                                    <span className="block truncate">
                                                        {getSuppliers(batch).join(', ') || 'Kayıt yok'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className={`text-right font-storefront-mono text-base font-bold ${batch.quantity <= 2 ? 'text-rust' : 'text-moss'}`}>
                                                    {batch.quantity}
                                                </TableCell>
                                                <TableCell className="text-right text-sm text-ink">
                                                    {batch.unit_cost != null ? `₺${batch.unit_cost.toFixed(2)}` : '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <StatusBadge status={batchStatus} />
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Card className="h-fit border-hairline bg-paper">
                    <CardHeader className="border-b border-hairline pb-3">
                        <CardTitle className="text-base text-ink">Batch Detayı</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4">
                        {!selectedBatch ? (
                            <p className="text-sm leading-relaxed text-sand">
                                Detaylarını görmek için listeden bir batch seçin.
                            </p>
                        ) : (
                            <>
                                <div>
                                    <p className="text-xs uppercase tracking-wide text-sand">Lot numarası</p>
                                    <p className="mt-1 font-storefront-mono text-xl font-bold text-rust">{selectedBatch.lot_no}</p>
                                </div>
                                <DetailRow label="Ürün" value={selectedProduct?.name || 'Ürün bulunamadı'} />
                                <DetailRow label="Profil" value={selectedProduct?.gender || '—'} />
                                <DetailRow label="Depo girişi" value={formatDate(selectedBatch.arrival_date)} />
                                <DetailRow label="Kalan stok" value={`${selectedBatch.quantity} adet`} />
                                <DetailRow label="Birim maliyet" value={selectedBatch.unit_cost != null ? `₺${selectedBatch.unit_cost.toFixed(2)}` : '—'} />
                                <DetailRow label="Üretim tarihi" value={selectedProduction ? formatDate(selectedProduction.production_date) : '—'} />
                                <DetailRow label="Tedarikçi" value={getSuppliers(selectedBatch).join(', ') || 'Kayıt yok'} />
                                {selectedProduction?.ingredient_deductions && selectedProduction.ingredient_deductions.length > 0 && (
                                    <div className="space-y-2 pt-2">
                                        <p className="text-xs uppercase tracking-wide text-sand">Kullanılan hammaddeler</p>
                                        <div className="overflow-x-auto rounded-md border border-hairline">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="border-hairline hover:bg-transparent">
                                                        <TableHead className="text-xs text-sand">Hammadde</TableHead>
                                                        <TableHead className="text-xs text-sand">Tedarikçi / lot</TableHead>
                                                        <TableHead className="text-right text-xs text-sand">Miktar</TableHead>
                                                        <TableHead className="text-right text-xs text-sand">Maliyet</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedProduction.ingredient_deductions.map((deduction, index) => (
                                                        <TableRow key={`${deduction.material_id || deduction.material_name}-${index}`} className="border-hairline">
                                                            <TableCell className="max-w-[150px] truncate text-xs text-ink">{deduction.material_name}</TableCell>
                                                            <TableCell className="max-w-[130px] text-xs text-sand">
                                                                <span className="block truncate">{deduction.supplier || 'Kayıt yok'}</span>
                                                                {deduction.lot_no && <span className="block font-storefront-mono text-[10px] text-rust">{deduction.lot_no}</span>}
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs text-ink">{deduction.quantity_deducted} {deduction.unit}</TableCell>
                                                            <TableCell className="text-right text-xs text-ink">
                                                                {deduction.total_cost != null ? `₺${Number(deduction.total_cost).toFixed(2)}` : '—'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function StatCard({
    label,
    value,
    icon,
    tone = 'default',
}: {
    label: string
    value: number
    icon: ReactNode
    tone?: 'default' | 'rust'
}) {
    return (
        <Card className="border-hairline bg-paper">
            <CardContent className="p-4">
                <div className={`mb-1 flex items-center justify-between text-xs uppercase tracking-wide ${tone === 'rust' ? 'text-rust' : 'text-sand'}`}>
                    {label}
                    {icon}
                </div>
                <p className="text-2xl font-bold text-ink">{value}</p>
            </CardContent>
        </Card>
    )
}

function StatusBadge({ status }: { status: Exclude<BatchStatus, 'all'> }) {
    const labels = {
        available: 'Aktif',
        low: 'Son 2',
        empty: 'Boş',
    }

    return (
        <Badge
            variant="outline"
            className={status === 'low' ? 'border-rust text-rust' : status === 'empty' ? 'border-hairline text-sand' : 'border-moss text-moss'}
        >
            {labels[status]}
        </Badge>
    )
}

function SortableHead({
    label,
    sort,
    current,
    descending,
    onSort,
    className = '',
}: {
    label: string
    sort: BatchSort
    current: BatchSort
    descending: boolean
    onSort: (sort: BatchSort) => void
    className?: string
}) {
    const Icon = current !== sort ? ArrowUpDown : descending ? ArrowDown : ArrowUp

    return (
        <TableHead className={className}>
            <button
                type="button"
                onClick={() => onSort(sort)}
                className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-sand transition-colors hover:text-ink"
            >
                {label}
                <Icon className="h-3.5 w-3.5" />
            </button>
        </TableHead>
    )
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-3 border-b border-dashed border-hairline pb-2 text-sm">
            <span className="text-sand">{label}</span>
            <span className="max-w-[190px] text-right font-medium text-ink">{value}</span>
        </div>
    )
}
