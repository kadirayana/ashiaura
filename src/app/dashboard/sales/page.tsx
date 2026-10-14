'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Sale, Customer, Product } from '@/types/database'
import { Edit, Trash2, Check, ChevronsUpDown, Download, Search } from 'lucide-react'
import { exportToExcel } from '@/lib/excelExport'
import { cn } from '@/lib/utils'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface SaleItem {
    id: string
    product_id: string
    custom_product_name: string
    quantity: number
    unit_price: number | ''
    unit_cost: number | ''
    total_price: number | ''
}

type SaleWithRelations = Sale & {
    customer: Customer | null
    product: Product
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function SalesPage() {
    const [sales, setSales] = useState<SaleWithRelations[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingSale, setEditingSale] = useState<SaleWithRelations | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [openCustomer, setOpenCustomer] = useState(false)
    const [openProductPopovers, setOpenProductPopovers] = useState<Record<string, boolean>>({})
    const [isCredit, setIsCredit] = useState(false)

    const [formData, setFormData] = useState({
        customer_id: '',
        notes: '',
        payment_amount: '' as number | '',
        sale_date: new Date().toISOString().split('T')[0],
    })

    const [saleItems, setSaleItems] = useState<SaleItem[]>([
        {
            id: Math.random().toString(),
            product_id: '',
            custom_product_name: '',
            quantity: 1,
            unit_price: '' as number | '',
            unit_cost: '' as number | '',
            total_price: '' as number | '',
        }
    ])

    const supabase = createClient()

    // â”€â”€â”€ Data Fetching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => { fetchData() }, [])

    async function fetchData() {
        setLoading(true)
        const [salesRes, customersRes, productsRes] = await Promise.all([
            supabase.from('sales').select(`*, customer:customers (*), product:products (*)`).order('sale_date', { ascending: false }),
            supabase.from('customers').select('*').order('name'),
            supabase.from('products').select('*').order('name'),
        ])
        if (salesRes.error) { toast.error('Failed to load sales') } else { setSales(salesRes.data || []) }
        setCustomers(customersRes.data || [])
        setProducts(productsRes.data || [])
        setLoading(false)
    }

    const filteredSales = useMemo(() => {
        if (!searchQuery.trim()) return sales
        const q = searchQuery.toLowerCase().trim()
        return sales.filter((s) =>
            (s.customer?.name && s.customer.name.toLowerCase().includes(q)) ||
            (s.product?.name && s.product.name.toLowerCase().includes(q)) ||
            (s.notes && s.notes.toLowerCase().includes(q)) ||
            (s.sale_date && s.sale_date.toLowerCase().includes(q))
        )
    }, [sales, searchQuery])

    // â”€â”€â”€ Form Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function resetForm() {
        setFormData({
            customer_id: '',
            notes: '',
            payment_amount: '' as number | '',
            sale_date: new Date().toISOString().split('T')[0],
        })
        setSaleItems([
            {
                id: Math.random().toString(),
                product_id: '',
                custom_product_name: '',
                quantity: 1,
                unit_price: '' as number | '',
                unit_cost: '' as number | '',
                total_price: '' as number | '',
            }
        ])
        setOpenProductPopovers({})
        setEditingSale(null)
        setIsCredit(false)
    }

    function openEditDialog(sale: SaleWithRelations) {
        savedScrollY.current = window.scrollY
        setEditingSale(sale)
        setFormData({
            customer_id: sale.customer_id || '',
            notes: sale.notes || '',
            payment_amount: sale.payment_amount !== null ? sale.payment_amount : (sale.total_price ?? ''),
            sale_date: sale.sale_date,
        })
        setSaleItems([
            {
                id: Math.random().toString(),
                product_id: sale.product_id,
                custom_product_name: '',
                quantity: sale.quantity,
                unit_price: sale.unit_price !== null ? sale.unit_price : (sale.total_price !== null && sale.quantity > 0 ? sale.total_price / sale.quantity : ''),
                unit_cost: sale.unit_cost !== null ? sale.unit_cost : '',
                total_price: sale.total_price !== null ? sale.total_price : '',
            }
        ])
        setDialogOpen(true)
        setIsCredit(sale.payment_amount !== null && sale.payment_amount !== sale.total_price)
    }

    function updateItem(id: string, updates: Partial<SaleItem>) {
        setSaleItems((prev: SaleItem[]) => prev.map((item: SaleItem) => {
            if (item.id !== id) return item
            const newItem = { ...item, ...updates }

            // Recalculate total_price if quantity or unit_price changed
            if ('quantity' in updates || 'unit_price' in updates) {
                const q = newItem.quantity || 0
                const p = newItem.unit_price !== '' ? Number(newItem.unit_price) : 0
                newItem.total_price = q * p
            }

            return newItem
        }))
    }

    function removeItem(id: string) {
        setSaleItems((prev: SaleItem[]) => prev.filter((item: SaleItem) => item.id !== id))
    }

    function addItem() {
        setSaleItems((prev: SaleItem[]) => [...prev, {
            id: Math.random().toString(),
            product_id: '',
            custom_product_name: '',
            quantity: 1,
            unit_price: '' as number | '',
            unit_cost: '' as number | '',
            total_price: '' as number | '',
        }])
    }

    const totalPrice = saleItems.reduce((sum: number, item: SaleItem) => sum + (Number(item.total_price) || 0), 0)
    const paymentAmount = formData.customer_id
        ? (isCredit
            ? (formData.payment_amount !== '' ? Number(formData.payment_amount) : 0)
            : totalPrice)
        : totalPrice
    const balanceChange = totalPrice - paymentAmount

    // Scroll position saved before dialog opens (Radix Dialog locks body scroll)
    const savedScrollY = useRef(0)

    const restoreScroll = useCallback(() => {
        const y = savedScrollY.current
        const restore = () => window.scrollTo(0, y)
        requestAnimationFrame(restore)
        setTimeout(restore, 0)
        setTimeout(restore, 50)
        setTimeout(restore, 100)
    }, [])

    // â”€â”€â”€ Submit (Create / Update) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (submitting) return
        setSubmitting(true)

        // Basic validation for all items
        for (const item of saleItems) {
            if (!item.product_id) {
                toast.error('Please select a product for all items')
                setSubmitting(false)
                return
            }
            if (item.product_id === 'other' && !item.custom_product_name.trim()) {
                toast.error('Please enter a product name for all custom products')
                setSubmitting(false)
                return
            }
            if (item.quantity < 1) {
                toast.error('Quantity must be at least 1')
                setSubmitting(false)
                return
            }
        }

        // Stock validation: sum quantity required per product
        const productQuantities: Record<string, number> = {}
        for (const item of saleItems) {
            if (item.product_id && item.product_id !== 'other') {
                productQuantities[item.product_id] = (productQuantities[item.product_id] || 0) + item.quantity
            }
        }

        for (const [prodId, reqQty] of Object.entries(productQuantities)) {
            const product = products.find((p: Product) => p.id === prodId)
            if (product) {
                let effectiveStock = product.stock || 0
                if (editingSale && prodId === editingSale.product_id) {
                    effectiveStock += editingSale.quantity
                }
                if (effectiveStock < reqQty) {
                    toast.error(`Insufficient stock for ${product.name}. Only ${effectiveStock} available.`)
                    setSubmitting(false)
                    return
                }
            }
        }

        try {
            if (editingSale) {
                // â”€â”€ UPDATE MODE â”€â”€
                const item = saleItems[0]
                let finalProductId = item.product_id

                // Handle custom product
                if (item.product_id === 'other') {
                    const nameTrimmed = item.custom_product_name.trim()
                    const existingProduct = products.find((p: Product) =>
                        p.name.toLowerCase() === nameTrimmed.toLowerCase()
                    )
                    if (existingProduct) {
                        finalProductId = existingProduct.id
                    } else {
                        const { data: newProduct, error: createError } = await supabase
                            .from('products').insert({ name: nameTrimmed, stock: 0 }).select('*').single()
                        if (createError) throw createError
                        finalProductId = newProduct.id
                        setProducts((prev: Product[]) => [...prev, newProduct])
                    }
                }

                const replacementUnitPrice = item.unit_price !== '' ? Number(item.unit_price) : (item.quantity > 0 ? Number(item.total_price) / item.quantity : 0)
                const { data: replacementSaleId, error: replacementError } = await supabase.rpc('update_sale_fifo', {
                    p_sale_id: editingSale.id,
                    p_product_id: finalProductId,
                    p_quantity: item.quantity,
                    p_customer_id: formData.customer_id || null,
                    p_unit_price: replacementUnitPrice,
                    p_payment_amount: paymentAmount,
                    p_notes: formData.notes || '',
                    p_sale_date: formData.sale_date,
                })
                if (replacementError || !replacementSaleId) {
                    throw replacementError || new Error('Satış batch stoklarıyla birlikte güncellenemedi.')
                }

                toast.success('Satış ve batch stokları güncellendi.')
                await fetchData()
                setDialogOpen(false)
                resetForm()
                return

            } else {
                // â”€â”€ INSERT MODE â”€â”€
                const updatedItems = []
                for (const item of saleItems) {
                    let finalProductId = item.product_id
                    let isNewProductCreated = false
                    let newProductRecord: any = null

                    if (item.product_id === 'other') {
                        const nameTrimmed = item.custom_product_name.trim()
                        const existingProduct = products.find((p: Product) =>
                            p.name.toLowerCase() === nameTrimmed.toLowerCase()
                        )
                        if (existingProduct) {
                            finalProductId = existingProduct.id
                        } else {
                            const { data: newProduct, error: createError } = await supabase
                                .from('products').insert({ name: nameTrimmed, stock: 0 }).select('*').single()
                            if (createError) throw createError
                            finalProductId = newProduct.id
                            isNewProductCreated = true
                            newProductRecord = newProduct
                        }
                    }

                    if (isNewProductCreated && newProductRecord) {
                        setProducts((prev: Product[]) => [...prev, newProductRecord])
                    }

                    updatedItems.push({
                        ...item,
                        finalProductId
                    })
                }



                // C. Proportional payment amount allocation with penny-accuracy
                const count = updatedItems.length
                const itemPayments: number[] = []

                if (totalPrice === 0) {
                    const baseAmount = Math.floor((paymentAmount / count) * 100) / 100
                    const remainingCents = Math.round((paymentAmount - (baseAmount * count)) * 100)
                    for (let i = 0; i < count; i++) {
                        itemPayments.push(baseAmount + (i < remainingCents ? 0.01 : 0))
                    }
                } else {
                    let sumBasePayment = 0
                    const baseItemPayments = updatedItems.map((item: any) => {
                        const baseVal = Math.floor((Number(item.total_price) / totalPrice) * paymentAmount * 100) / 100
                        sumBasePayment += baseVal
                        return baseVal
                    })
                    const remainingCents = Math.round((paymentAmount - sumBasePayment) * 100)
                    for (let i = 0; i < count; i++) {
                        itemPayments.push(baseItemPayments[i] + (i < remainingCents ? 0.01 : 0))
                    }
                }

                // D. Prepare payloads for the transactional FIFO sales endpoint.
                const salePayloads = updatedItems.map((item, index) => {
                    const hasUnitCost = item.unit_cost !== '' && Number(item.unit_cost) > 0
                    const currentProductCost = hasUnitCost ? Number(item.unit_cost) : 0
                    const calculatedUnitPrice = item.unit_price !== '' ? Number(item.unit_price) : (item.quantity > 0 ? Number(item.total_price) / item.quantity : 0)
                    const profitValue = hasUnitCost ? Number(item.total_price) - (item.quantity * currentProductCost) : null
                    const itemPayment = itemPayments[index]

                    return {
                        customer_id: formData.customer_id || null,
                        product_id: item.finalProductId,
                        quantity: item.quantity,
                        unit_price: calculatedUnitPrice,
                        unit_cost: currentProductCost,
                        total_price: Number(item.total_price),
                        profit: profitValue,
                        payment_amount: itemPayment,
                        notes: formData.notes || null,
                        sale_date: formData.sale_date,
                    }
                })

                const newSales: SaleWithRelations[] = []
                for (const payload of salePayloads) {
                    const response = await fetch('/api/sales', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    })
                    const result = await response.json() as { error?: string; sale_id?: string }
                    if (!response.ok || !result.sale_id) {
                        throw new Error(result.error || 'Satış kaydedilemedi.')
                    }

                    const { data: savedSale, error: savedSaleError } = await supabase
                        .from('sales')
                        .select('*, customer:customers(*), product:products(*)')
                        .eq('id', result.sale_id)
                        .single()
                    if (savedSaleError || !savedSale) {
                        throw savedSaleError || new Error('Satış kaydı okunamadı.')
                    }
                    newSales.push(savedSale as SaleWithRelations)
                }

                toast.success('Sales logged successfully!')

                // Optimistic update: prepend all inserted sales to local state
                restoreScroll()
                setSales((prev: SaleWithRelations[]) => [...newSales, ...prev])

                // Update local customers state
                if (formData.customer_id && balanceChange !== 0) {
                    setCustomers((prev: Customer[]) => prev.map((c: Customer) =>
                        c.id === formData.customer_id ? { ...c, balance: (c.balance || 0) + balanceChange } : c
                    ))
                }

                // Update product stock locally
                setProducts((prev: Product[]) => prev.map((p: Product) => {
                    const soldQty = saleItems
                        .filter((item: SaleItem) => item.product_id === p.id)
                        .reduce((sum: number, item: SaleItem) => sum + item.quantity, 0)
                    return soldQty > 0 ? { ...p, stock: p.stock - soldQty } : p
                }))
            }

            setDialogOpen(false)
            resetForm()
        } catch (error) {
            console.error(error)
            const reason = error instanceof Error ? error.message : (error as { message?: string })?.message
            toast.error(`${editingSale ? 'Failed to update sale' : 'Failed to log sales'}${reason ? `: ${reason}` : ''}`)
        } finally {
            setSubmitting(false)
        }
    }

    // â”€â”€â”€ Delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async function handleDelete(sale: SaleWithRelations) {
        if (!confirm('Are you sure you want to delete this sale? Stock will be restored.')) return
        try {
            const { error } = await supabase.rpc('delete_sale_fifo', { p_sale_id: sale.id })
            if (error) throw error
            toast.success('Sale deleted and stock restored')
            await fetchData()
        } catch (error) {
            console.error('Sale deletion failed:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to delete sale')
        }
    }

    async function handleExportExcel() {
        toast.loading('Supabase veritabanından tüm satış verileri çekiliyor...', { id: 'excel-export' })
        const { data: allSales, error } = await supabase
            .from('sales')
            .select('*, customer:customers(*), product:products(*)')
            .order('sale_date', { ascending: false })

        if (error || !allSales || allSales.length === 0) {
            toast.error('Aktarılacak satış kaydı bulunamadı.', { id: 'excel-export' })
            return
        }

        const excelData = allSales.map((s: SaleWithRelations) => {
            const qty = s.quantity || 0
            const totalPrice = s.total_price || 0
            const unitCost = s.unit_cost || 0
            const totalCost = unitCost * qty
            const profit = s.profit !== null ? s.profit : (totalPrice - totalCost)
            const marginPct = totalPrice > 0 ? (profit / totalPrice) * 100 : 0

            return {
                'Tarih': s.sale_date ? formatDate(s.sale_date) : '-',
                'Müşteri': s.customer?.name || 'Perakende / Anonim',
                'Ürün': s.product?.name || '-',
                'Miktar (Adet)': qty,
                'Birim Fiyat (₺)': s.unit_price || 0,
                'Toplam Satış (₺)': totalPrice,
                'Birim Maliyet (₺)': unitCost,
                'Toplam Maliyet (₺)': Number(totalCost.toFixed(2)),
                'Net Kâr (₺)': Number(profit.toFixed(2)),
                'Kâr Marjı (%)': Number(marginPct.toFixed(2)),
                'Ödenen Tutar (₺)': s.payment_amount !== null ? s.payment_amount : totalPrice,
                'Notlar': s.notes || '-'
            }
        })
        exportToExcel(excelData, 'Parfum_Satis_Dokumu.xlsx', 'Satışlar')
        toast.success(`${allSales.length} adet satış kaydı Supabase DB'den indirildi!`, { id: 'excel-export' })
    }

    const uniqueProducts = useMemo(() => {
        const map = new Map<string, Product>()
        products.forEach(p => {
            const key = p.name.trim().toLowerCase()
            if (!map.has(key)) {
                map.set(key, { ...p })
            } else {
                const existing = map.get(key)!
                existing.stock = (existing.stock || 0) + (p.stock || 0)
            }
        })
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'))
    }, [products])

    // ─── Render ───────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-ink">Sales</h1>
                    <p className="text-sand text-xs sm:text-sm mt-0.5">Log and track your sales</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap flex-1 sm:justify-end">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand" />
                        <Input
                            placeholder="Satış ara (müşteri, ürün, tarih)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9 bg-paper border-hairline text-xs sm:text-sm text-ink w-full"
                        />
                    </div>
                    <Button variant="outline" onClick={handleExportExcel} className="border-hairline text-ink hover:bg-ink/5 text-xs sm:text-sm h-9">
                        <Download className="w-4 h-4 mr-1.5 sm:mr-2" />
                        Excel'e Aktar
                    </Button>
                    <Dialog open={dialogOpen} onOpenChange={(open) => { if (open) savedScrollY.current = window.scrollY; setDialogOpen(open); if (!open) resetForm() }}>
                        <DialogTrigger asChild>
                            <Button className="bg-ink text-paper hover:bg-rust text-xs sm:text-sm h-9">
                                <svg className="w-4 h-4 mr-1.5 sm:mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Log Sale
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-paper border-hairline w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl overflow-x-hidden overflow-y-auto max-h-[90vh] p-4 sm:p-6 mx-auto">
                            <DialogHeader>
                                <DialogTitle className="text-ink">{editingSale ? 'Edit Sale' : 'Log New Sale'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 min-w-0 w-full">
                                {/* Customer */}
                                <div className="space-y-2 flex flex-col min-w-0 overflow-hidden">
                                    <Label className="text-ink">Customer (optional)</Label>
                                    <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openCustomer}
                                                className="w-full justify-between bg-paper border-hairline text-ink hover:bg-ink/5 hover:text-ink !overflow-hidden whitespace-normal min-w-0"
                                            >
                                                <div className="truncate text-left flex-1 min-w-0 mr-2">
                                                    {formData.customer_id
                                                        ? customers.find((customer: Customer) => customer.id === formData.customer_id)?.name
                                                        : "Select customer (optional)"}
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-paper border-hairline">
                                            <Command className="bg-paper text-ink">
                                                <CommandInput placeholder="Search customer..." className="text-ink placeholder:text-sand" />
                                                <CommandList>
                                                    <CommandEmpty>No customer found.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem
                                                            value="No customer"
                                                            onSelect={() => {
                                                                setFormData({ ...formData, customer_id: "" })
                                                                setOpenCustomer(false)
                                                            }}
                                                            className="text-sand hover:bg-ink/5"
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    !formData.customer_id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            No customer
                                                        </CommandItem>
                                                        {customers.map((customer: Customer) => (
                                                            <CommandItem
                                                                key={customer.id}
                                                                value={customer.name}
                                                                onSelect={() => {
                                                                    setFormData({ ...formData, customer_id: customer.id })
                                                                    setOpenCustomer(false)
                                                                }}
                                                                className="text-ink hover:bg-ink/5"
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        formData.customer_id === customer.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                <div className="truncate min-w-0 flex-1 text-left">{customer.name}</div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                {/* Date */}
                                <div className="space-y-2">
                                    <Label className="text-ink">Date</Label>
                                    <Input type="date" value={formData.sale_date} onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })} className="bg-paper border-hairline text-ink" />
                                </div>
                                <div className="space-y-4 border-t border-b border-hairline py-4 my-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-ink font-bold text-sm">Products / Ürünler</Label>
                                        {!editingSale && (
                                            <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-moss text-moss hover:bg-moss/10 text-xs">
                                                + Add Product
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-4 max-h-[35vh] overflow-y-auto pr-1">
                                        {saleItems.map((item: SaleItem, index: number) => {
                                            const isCustom = item.product_id === 'other'
                                            const selectedProd = isCustom ? null : products.find((p: Product) => p.id === item.product_id)
                                            const effectiveStock = selectedProd
                                                ? selectedProd.stock + (editingSale?.product_id === selectedProd.id ? editingSale.quantity : 0)
                                                : 0

                                            return (
                                                <div key={item.id} className="p-3 rounded-lg bg-ink/5 border border-hairline space-y-3 relative">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-semibold text-sand">Item #{index + 1}</span>
                                                        {saleItems.length > 1 && !editingSale && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeItem(item.id)}
                                                                className="text-red-400 hover:text-red-300 h-6 px-2 text-xs"
                                                            >
                                                                Remove
                                                            </Button>
                                                        )}
                                                    </div>

                                                    {/* Product Combobox */}
                                                    <div className="space-y-2 flex flex-col min-w-0 overflow-hidden">
                                                        <Popover
                                                            open={openProductPopovers[item.id] || false}
                                                            onOpenChange={(open: boolean) => setOpenProductPopovers((prev: Record<string, boolean>) => ({ ...prev, [item.id]: open }))}
                                                        >
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    role="combobox"
                                                                    aria-expanded={openProductPopovers[item.id] || false}
                                                                    className="w-full justify-between bg-paper border-hairline text-ink hover:bg-ink/5 hover:text-ink !overflow-hidden whitespace-normal min-w-0 text-xs h-9"
                                                                >
                                                                    <div className="truncate text-left flex-1 min-w-0 mr-2">
                                                                        {item.product_id === 'other'
                                                                            ? '+ Other (Custom Product)'
                                                                            : item.product_id
                                                                                ? products.find((product: Product) => product.id === item.product_id)?.name
                                                                                : "Select product"}
                                                                    </div>
                                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-paper border-hairline animate-none">
                                                                <Command className="bg-paper text-ink">
                                                                    <CommandInput placeholder="Search product..." className="text-ink placeholder:text-sand" />
                                                                    <CommandList>
                                                                        <CommandEmpty>No product found.</CommandEmpty>
                                                                        <CommandGroup>
                                                                            <CommandItem
                                                                                value="Other (Custom Product)"
                                                                                onSelect={() => {
                                                                                    updateItem(item.id, { product_id: 'other', unit_cost: 0, unit_price: 0, total_price: 0 })
                                                                                    setOpenProductPopovers((prev: Record<string, boolean>) => ({ ...prev, [item.id]: false }))
                                                                                }}
                                                                                className="text-amber-400 font-medium hover:bg-ink/5"
                                                                            >
                                                                                <Check
                                                                                    className={cn(
                                                                                        "mr-2 h-4 w-4",
                                                                                        item.product_id === "other" ? "opacity-100" : "opacity-0"
                                                                                    )}
                                                                                />
                                                                                + Other (Custom Product)
                                                                            </CommandItem>
                                                                            <CommandSeparator className="bg-hairline" />
                                                                            {uniqueProducts.map((product) => (
                                                                                <CommandItem
                                                                                    key={product.id}
                                                                                    value={product.name}
                                                                                    onSelect={() => {
                                                                                        const prodCost = product.unit_cost || 0
                                                                                        updateItem(item.id, {
                                                                                            product_id: product.id,
                                                                                            unit_cost: prodCost,
                                                                                            unit_price: prodCost,
                                                                                            total_price: prodCost * item.quantity
                                                                                        })
                                                                                        setOpenProductPopovers((prev: Record<string, boolean>) => ({ ...prev, [item.id]: false }))
                                                                                    }}
                                                                                    className="text-ink hover:bg-ink/5"
                                                                                >
                                                                                    <Check
                                                                                        className={cn(
                                                                                            "mr-2 h-4 w-4",
                                                                                            item.product_id === product.id ? "opacity-100" : "opacity-0"
                                                                                        )}
                                                                                    />
                                                                                    <div className="truncate min-w-0 flex-1 text-left">{product.name}</div>
                                                                                    <span className="text-sand ml-2 shrink-0 whitespace-nowrap">({product.stock} in stock)</span>
                                                                                </CommandItem>
                                                                            ))}
                                                                        </CommandGroup>
                                                                    </CommandList>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>

                                                    {/* Custom Product Name */}
                                                    {isCustom && (
                                                        <div className="space-y-1">
                                                            <Label className="text-ink text-xs">Product Name</Label>
                                                            <Input
                                                                value={item.custom_product_name}
                                                                onChange={(e) => updateItem(item.id, { custom_product_name: e.target.value })}
                                                                className="bg-paper border-hairline text-ink h-8 text-xs"
                                                                placeholder="e.g. Custom blend"
                                                                required
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Inputs: Qty, Price */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-ink text-xs">Qty / Miktar</Label>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                                                                className="bg-paper border-hairline text-ink h-8 text-xs font-semibold"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-ink text-xs">Fiyat / Price (₺)</Label>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={item.unit_price}
                                                                onChange={(e) => updateItem(item.id, { unit_price: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                                                className="bg-paper border-hairline text-ink h-8 text-xs font-bold"
                                                                placeholder="0.00"
                                                                required
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Calculated Total Info */}
                                                    {item.total_price !== '' && Number(item.total_price) > 0 && (
                                                        <div className="text-[10px] text-moss font-semibold px-1 mt-1">
                                                            Ara Toplam (Subtotal): {formatCurrency(Number(item.total_price))}
                                                        </div>
                                                    )}

                                                    {/* Stock Warning */}
                                                    {selectedProd && (
                                                        <div className="flex justify-between text-[10px] text-sand px-1">
                                                            <span>Available Stock:</span>
                                                            <span className={effectiveStock < item.quantity ? 'text-red-400 font-bold' : 'text-moss'}>
                                                                {effectiveStock} units
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Global Total & Payment Fields */}
                                <div className="space-y-4 pt-2">
                                    <div className="p-3 rounded-lg bg-ink/5 border border-hairline flex justify-between items-center text-sm">
                                        <span className="text-sand font-bold">Toplam Satış Tutarı (Total):</span>
                                        <span className="text-lg font-bold text-ink">{formatCurrency(totalPrice)}</span>
                                    </div>

                                    {formData.customer_id ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-2 py-1">
                                                <input
                                                    type="checkbox"
                                                    id="isCredit"
                                                    checked={isCredit}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked
                                                        setIsCredit(checked)
                                                        if (!checked) {
                                                            setFormData({ ...formData, payment_amount: '' })
                                                        } else {
                                                            setFormData({ ...formData, payment_amount: 0 })
                                                        }
                                                    }}
                                                    className="rounded border-hairline text-moss focus:ring-moss h-4 w-4 bg-paper accent-moss cursor-pointer"
                                                />
                                                <label htmlFor="isCredit" className="text-ink text-xs font-semibold cursor-pointer select-none">
                                                    Veresiye / Borç Satışı (Kısmi Ödeme)
                                                </label>
                                            </div>

                                            {isCredit && (
                                                <div className="space-y-2">
                                                    <Label className="text-ink">Ödenen Tutar / Alınan Para (₺)</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={formData.payment_amount}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, payment_amount: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                                        className="bg-paper border-hairline text-ink font-semibold"
                                                        placeholder="0.00"
                                                        autoFocus
                                                    />
                                                </div>
                                            )}

                                            {/* Customer Balance Simulation Card */}
                                            {(() => {
                                                const cust = customers.find((c: Customer) => c.id === formData.customer_id)
                                                if (!cust) return null
                                                const currentBal = cust.balance || 0
                                                const projectedBal = currentBal + balanceChange
                                                return (
                                                    <div className="p-3 rounded-lg bg-ink/5 border border-hairline space-y-1.5 text-xs">
                                                        <div className="flex justify-between">
                                                            <span className="text-sand">Müşteri Mevcut Bakiyesi:</span>
                                                            <span className={`font-semibold ${currentBal > 0 ? 'text-amber-400' : currentBal < 0 ? 'text-moss' : 'text-ink'}`}>
                                                                {formatCurrency(currentBal)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-sand">Bu Satıştan Kalan (Borç):</span>
                                                            <span className={`font-semibold ${balanceChange > 0 ? 'text-amber-400' : 'text-ink'}`}>
                                                                {formatCurrency(balanceChange)}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between border-t border-hairline pt-1.5 mt-1">
                                                            <span className="text-sand font-medium">Yeni Bakiye (Tahmini):</span>
                                                            <span className={`font-bold ${projectedBal > 0 ? 'text-amber-400' : projectedBal < 0 ? 'text-moss' : 'text-ink'}`}>
                                                                {formatCurrency(projectedBal)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    ) : null}
                                </div>
                                {/* Notes */}
                                <div className="space-y-2">
                                    <Label className="text-ink">Notes</Label>
                                    <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-paper border-hairline text-ink" placeholder="e.g. Ödeme alındı, Veresiye..." />
                                </div>
                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-4">
                                    <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); resetForm() }} className="text-sand hover:text-ink">Cancel</Button>
                                    <Button type="submit" disabled={submitting} className="bg-ink text-paper hover:bg-rust disabled:opacity-50">
                                        {submitting ? 'İşleniyor...' : (editingSale ? 'Save Changes' : 'Log Sale')}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* ═══ SALES SUMMARY STATS ═══ */}
            {!loading && filteredSales.length > 0 && (() => {
                const totalBottles = filteredSales.reduce((sum: number, s: SaleWithRelations) => sum + (s.quantity || 0), 0)
                const totalRevenue = filteredSales.reduce((sum: number, s: SaleWithRelations) => sum + (s.total_price || 0), 0)
                const totalProfit = filteredSales.reduce((sum: number, s: SaleWithRelations) => sum + (s.profit || 0), 0)
                return (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-3 sm:p-4">
                                <p className="text-xs text-sand font-medium mb-1 truncate">Şişe Satıldı</p>
                                <p className="text-lg sm:text-xl md:text-2xl font-bold text-ink truncate">{totalBottles}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-3 sm:p-4">
                                <p className="text-xs text-sand font-medium mb-1 truncate">Toplam Gelir</p>
                                <p className="text-lg sm:text-xl md:text-2xl font-bold text-ink truncate">{formatCurrency(totalRevenue)}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-3 sm:p-4">
                                <p className="text-xs text-sand font-medium mb-1 truncate">Sipariş Sayısı</p>
                                <p className="text-lg sm:text-xl md:text-2xl font-bold text-ink truncate">{filteredSales.length}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-paper border-hairline">
                            <CardContent className="p-3 sm:p-4">
                                <p className="text-xs text-sand font-medium mb-1 truncate">Toplam Kar</p>
                                <p className="text-lg sm:text-xl md:text-2xl font-bold text-moss truncate">{formatCurrency(totalProfit)}</p>
                            </CardContent>
                        </Card>
                    </div>
                )
            })()}

            {/* ═══ SALES TABLE ═══ */}
            <Card className="bg-paper border-hairline">
                <CardContent className="p-0 overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-sand">Loading...</div>
                    ) : filteredSales.length === 0 ? (
                        <div className="p-8 text-center text-sand">
                            {searchQuery ? `"${searchQuery}" ile eşleşen satış kaydı bulunamadı.` : 'No sales yet. Log your first sale!'}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table (hidden on mobile) */}
                            <div className="hidden md:block overflow-x-auto custom-scrollbar">
                                <Table className="min-w-[850px]">
                                    <TableHeader>
                                        <TableRow className="border-hairline hover:bg-transparent">
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Date</TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Customer</TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Product</TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Notes</TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap text-right">Qty</TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap text-right">Total</TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap text-right">Cost</TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap text-right">Profit</TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSales.map((sale: SaleWithRelations) => (
                                            <TableRow key={sale.id} className="border-hairline hover:bg-ink/5">
                                                <TableCell className="text-sand whitespace-nowrap">{formatDate(sale.sale_date)}</TableCell>
                                                <TableCell className="text-ink whitespace-nowrap">{sale.customer?.name || '-'}</TableCell>
                                                <TableCell className="text-ink whitespace-nowrap">{sale.product?.name}</TableCell>
                                                <TableCell className="max-w-[150px]">
                                                    <div title={sale.notes || ''} className="truncate text-sand text-sm">{sale.notes || '-'}</div>
                                                </TableCell>
                                                <TableCell className="text-right text-ink whitespace-nowrap">{sale.quantity}</TableCell>
                                                <TableCell className="text-right font-medium text-ink whitespace-nowrap">{sale.total_price !== null ? formatCurrency(sale.total_price) : '-'}</TableCell>
                                                <TableCell className="text-right text-sand whitespace-nowrap">{sale.unit_cost !== null ? formatCurrency(sale.unit_cost * sale.quantity) : '-'}</TableCell>
                                                <TableCell className="text-right font-bold text-moss whitespace-nowrap">{sale.profit !== null ? formatCurrency(sale.profit) : '-'}</TableCell>
                                                <TableCell className="text-right whitespace-nowrap">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(sale)} className="text-sand hover:text-ink h-8 w-8">
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(sale)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card Layout (hidden on desktop) */}
                            <div className="grid grid-cols-1 gap-4 md:hidden p-4">
                                {filteredSales.map((sale: SaleWithRelations) => (
                                    <Card key={sale.id} className="bg-paper border-hairline">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex justify-between items-start border-b border-hairline pb-2">
                                                <div>
                                                    <div className="text-sm text-sand">{formatDate(sale.sale_date)}</div>
                                                    <h3 className="font-medium text-ink">{sale.product?.name}</h3>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-ink text-lg">{sale.total_price !== null ? formatCurrency(sale.total_price) : '-'}</div>
                                                    <div className="text-sm font-bold text-moss">{sale.profit !== null ? formatCurrency(sale.profit) : '-'} Kar</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-sand block text-xs uppercase tracking-wider">Müşteri</span>
                                                    <span className="text-sand">{sale.customer?.name || '-'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-sand block text-xs uppercase tracking-wider">Miktar</span>
                                                    <span className="text-sand">{sale.quantity} Adet</span>
                                                </div>
                                            </div>

                                            {sale.notes && (
                                                <div className="text-sm text-sand bg-ink/5 p-2 rounded">
                                                    <span className="text-sand mr-2 text-xs uppercase">Not:</span>
                                                    {sale.notes}
                                                </div>
                                            )}

                                            <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(sale)} className="text-sand hover:text-ink h-8">
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Düzenle
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(sale)} className="text-red-400 hover:text-red-300 h-8">
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Sil
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
