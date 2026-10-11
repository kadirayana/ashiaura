'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Customer, Sale, Product } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ChevronDown, ChevronRight, Download, Search } from 'lucide-react'
import { exportToExcel } from '@/lib/excelExport'
import React from 'react'

type CustomerWithSales = Customer & {
    sales: (Sale & { product: Product })[]
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<CustomerWithSales[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<CustomerWithSales | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
        balance: '' as number | '',
    })

    const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
    const [paymentCustomer, setPaymentCustomer] = useState<CustomerWithSales | null>(null)
    const [paymentFormData, setPaymentFormData] = useState({
        amount: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
    })
    const [paymentSubmitting, setPaymentSubmitting] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        fetchCustomers()
    }, [])

    async function fetchCustomers() {
        setLoading(true)
        const { data, error } = await supabase
            .from('customers')
            .select('*, sales(id, quantity, total_price, profit, payment_amount, sale_date, product:products(name))')
            .order('name')

        if (error) {
            toast.error('Failed to load customers')
        } else {
            setCustomers(data || [])
        }
        setLoading(false)
    }

    const filteredCustomers = useMemo(() => {
        if (!searchQuery.trim()) return customers
        const q = searchQuery.toLowerCase().trim()
        return customers.filter((c) =>
            c.name.toLowerCase().includes(q) ||
            (c.email && c.email.toLowerCase().includes(q)) ||
            (c.phone && c.phone.toLowerCase().includes(q)) ||
            (c.address && c.address.toLowerCase().includes(q)) ||
            (c.notes && c.notes.toLowerCase().includes(q))
        )
    }, [customers, searchQuery])

    function resetForm() {
        setFormData({ name: '', email: '', phone: '', address: '', notes: '', balance: '' })
        setEditingCustomer(null)
    }

    function openEditDialog(customer: CustomerWithSales) {
        savedScrollY.current = window.scrollY
        setEditingCustomer(customer)
        setFormData({
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || '',
            address: customer.address || '',
            notes: customer.notes || '',
            balance: customer.balance !== null && customer.balance !== undefined ? customer.balance : 0,
        })
        setDialogOpen(true)
    }

    function toggleExpand(id: string) {
        setExpandedCustomers(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) newSet.delete(id)
            else newSet.add(id)
            return newSet
        })
    }

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

    function openPaymentDialog(customer: CustomerWithSales) {
        savedScrollY.current = window.scrollY
        setPaymentCustomer(customer)
        setPaymentFormData({
            amount: '',
            notes: '',
            date: new Date().toISOString().split('T')[0],
        })
        setPaymentDialogOpen(true)
    }

    async function handlePaymentSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!paymentCustomer) return
        if (paymentSubmitting) return
        setPaymentSubmitting(true)

        const amount = parseFloat(paymentFormData.amount)
        if (isNaN(amount) || amount <= 0) {
            toast.error('Lütfen geçerli bir tutar girin')
            setPaymentSubmitting(false)
            return
        }

        try {
            // Get or create "Tahsilat" product
            let productId = ''
            const { data: existingProd } = await supabase
                .from('products')
                .select('id')
                .eq('name', 'Tahsilat')
                .maybeSingle()

            if (existingProd) {
                productId = existingProd.id
            } else {
                const { data: newProd, error: createError } = await supabase
                    .from('products')
                    .insert({ name: 'Tahsilat', stock: 0 })
                    .select('id')
                    .single()
                if (createError) throw createError
                productId = newProd.id
            }

            // Get items previously recorded with 0 TL price for this customer
            const { data: zeroSales, error: zeroSalesError } = await supabase
                .from('sales')
                .select('*, product:products(*)')
                .eq('customer_id', paymentCustomer.id)
                .eq('total_price', 0)
                .gt('quantity', 0)

            if (zeroSalesError) throw zeroSalesError

            // Insert payment into sales table
            const { data: newSale, error: saleError } = await supabase
                .from('sales')
                .insert({
                    customer_id: paymentCustomer.id,
                    product_id: productId,
                    quantity: 0,
                    unit_price: 0,
                    unit_cost: 0,
                    total_price: 0,
                    profit: 0,
                    payment_amount: amount,
                    notes: paymentFormData.notes ? `Tahsilat: ${paymentFormData.notes}` : 'Tahsilat',
                    sale_date: paymentFormData.date,
                })
                .select('*, customer:customers(*), product:products(*)')
                .single()

            if (saleError) throw saleError

            // Track any updated sale records for local state sync
            let updatedSalesLocal: any[] = []

            if (zeroSales && zeroSales.length > 0) {
                const count = zeroSales.length
                const baseAmount = Math.floor((amount / count) * 100) / 100
                const remainingCents = Math.round((amount - (baseAmount * count)) * 100)

                // Update each 0 TL sale record in the database
                for (let i = 0; i < count; i++) {
                    const sale = zeroSales[i]
                    const allocatedPrice = baseAmount + (i < remainingCents ? 0.01 : 0)
                    const newUnitPrice = sale.quantity > 0 ? allocatedPrice / sale.quantity : 0
                    const newProfit = (sale.unit_cost !== null && sale.unit_cost > 0)
                        ? (allocatedPrice - (sale.quantity * sale.unit_cost))
                        : null

                    const { data: updatedSale, error: updateError } = await supabase
                        .from('sales')
                        .update({
                            total_price: allocatedPrice,
                            unit_price: newUnitPrice,
                            profit: newProfit
                        })
                        .eq('id', sale.id)
                        .select('id, total_price, unit_price, profit')
                        .single()

                    if (updateError) throw updateError
                    updatedSalesLocal.push(updatedSale)
                }
            }

            // Update customer's balance in database (handled automatically by sales insert trigger, just compute local state)
            const distributedTotal = zeroSales && zeroSales.length > 0 ? amount : 0
            const newBalance = (paymentCustomer.balance || 0) - amount + distributedTotal

            // Update customer locally
            setCustomers(prev => prev.map(c => {
                if (c.id === paymentCustomer.id) {
                    let localSales = c.sales || []

                    if (updatedSalesLocal.length > 0) {
                        localSales = localSales.map(s => {
                            const match = updatedSalesLocal.find(us => us.id === s.id)
                            return match ? {
                                ...s,
                                total_price: match.total_price,
                                unit_price: match.unit_price,
                                profit: match.profit
                            } : s
                        })
                    }

                    const updatedSales = [...localSales, {
                        ...newSale,
                        product: { name: 'Tahsilat' }
                    }]
                    return {
                        ...c,
                        balance: newBalance,
                        sales: updatedSales
                    } as CustomerWithSales
                }
                return c
            }))

            toast.success('Tahsilat başarıyla kaydedildi!')
            setPaymentDialogOpen(false)
            restoreScroll()
        } catch (err: any) {
            console.error(err)
            toast.error('Tahsilat kaydedilirken bir hata oluştu: ' + (err.message || err))
        } finally {
            setPaymentSubmitting(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (submitting) return
        setSubmitting(true)

        try {
            const customerData = {
                name: formData.name,
                email: formData.email || null,
                phone: formData.phone || null,
                address: formData.address || null,
                notes: formData.notes || null,
                balance: formData.balance !== '' ? Number(formData.balance) : 0,
            }

            if (editingCustomer) {
                const { error } = await supabase
                    .from('customers')
                    .update(customerData)
                    .eq('id', editingCustomer.id)

                if (error) {
                    toast.error('Failed to update customer')
                } else {
                    toast.success('Customer updated')
                    // Optimistic update: replace in local state, preserve sales
                    restoreScroll()
                    setCustomers(prev => prev.map(c =>
                        c.id === editingCustomer.id
                            ? { ...c, ...customerData, updated_at: new Date().toISOString() }
                            : c
                    ))
                    setDialogOpen(false)
                    resetForm()
                }
            } else {
                const { data, error } = await supabase.from('customers').insert(customerData).select().single()

                if (error) {
                    toast.error('Failed to add customer')
                } else if (data) {
                    toast.success('Customer added')
                    // Optimistic update: prepend with empty sales
                    restoreScroll()
                    setCustomers(prev => [{ ...data, sales: [] } as CustomerWithSales, ...prev])
                    setDialogOpen(false)
                    resetForm()
                }
            }
        } finally {
            setSubmitting(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this customer?')) return

        const { error } = await supabase.from('customers').delete().eq('id', id)

        if (error) {
            toast.error('Failed to delete customer')
        } else {
            toast.success('Customer deleted')
            // Optimistic update: remove from local state
            restoreScroll()
            setCustomers(prev => prev.filter(c => c.id !== id))
        }
    }

    async function handleExportExcel() {
        toast.loading('Supabase veritabanından tüm müşteriler çekiliyor...', { id: 'excel-export' })
        const { data: allCustomers, error } = await supabase
            .from('customers')
            .select('*, sales(*)')
            .order('name')

        if (error || !allCustomers || allCustomers.length === 0) {
            toast.error('Aktarılacak müşteri kaydı bulunamadı.', { id: 'excel-export' })
            return
        }

        const excelData = allCustomers.map(c => {
            const bal = c.balance || 0
            return {
                'Müşteri Adı Soyadı': c.name,
                'Telefon': c.phone || '-',
                'E-Posta': c.email || '-',
                'Adres': c.address || '-',
                'Cari Bakiye (₺)': bal,
                'Bakiye Durumu': bal > 0 ? 'Müşteri Borçlu (Alacaklıyız)' : bal < 0 ? 'Müşteri Alacaklı' : 'Bakiye Nötr',
                'Toplam Alışveriş Sayısı': c.sales?.length || 0,
                'Notlar': c.notes || '-'
            }
        })
        exportToExcel(excelData, 'Musteriler_Ve_Cari_Dokum.xlsx', 'Müşteriler')
        toast.success(`${allCustomers.length} adet müşteri dökümü Supabase DB'den indirildi!`, { id: 'excel-export' })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-ink">Customers</h1>
                    <p className="text-sand text-xs sm:text-sm mt-0.5">Manage your customer database</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap flex-1 sm:justify-end">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand" />
                        <Input
                            placeholder="Müşteri ara (isim, tel, e-posta)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9 bg-paper border-hairline text-xs sm:text-sm text-ink w-full"
                        />
                    </div>
                    <Button variant="outline" onClick={handleExportExcel} className="border-hairline text-ink hover:bg-ink/5 text-xs sm:text-sm h-9">
                        <Download className="w-4 h-4 mr-1.5 sm:mr-2" />
                        Excel'e Aktar
                    </Button>
                    <Dialog open={dialogOpen} onOpenChange={(open) => { if (open) savedScrollY.current = window.scrollY; setDialogOpen(open); if (!open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button className="bg-ink text-paper hover:bg-rust text-xs sm:text-sm h-9">
                                <svg className="w-4 h-4 mr-1.5 sm:mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Add Customer
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-paper border-hairline w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl overflow-x-hidden overflow-y-auto max-h-[90vh] p-4 sm:p-6 mx-auto">
                            <DialogHeader>
                                <DialogTitle className="text-ink">{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-ink">Name</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="bg-paper border-hairline text-ink"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-ink">Email</Label>
                                        <Input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="bg-paper border-hairline text-ink"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-ink">Phone</Label>
                                        <Input
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="bg-paper border-hairline text-ink"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-ink">Address</Label>
                                        <Input
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            className="bg-paper border-hairline text-ink"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-ink">Mevcut Bakiye / Borç (₺)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.balance}
                                            onChange={(e) => setFormData({ ...formData, balance: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                            className="bg-paper border-hairline text-ink font-semibold"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-ink">Notes</Label>
                                    <Input
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="bg-paper border-hairline text-ink"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); resetForm(); }} className="text-sand hover:text-ink">
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={submitting} className="bg-ink text-paper hover:bg-rust disabled:opacity-50">
                                        {submitting ? 'İşleniyor...' : `${editingCustomer ? 'Update' : 'Add'} Customer`}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Tahsilat Ekle Dialog */}
                <Dialog open={paymentDialogOpen} onOpenChange={(open) => { if (open) savedScrollY.current = window.scrollY; setPaymentDialogOpen(open); if (!open) setPaymentCustomer(null); }}>
                    <DialogContent className="bg-paper border-hairline w-full max-w-[95vw] sm:max-w-lg overflow-x-hidden overflow-y-auto max-h-[90vh] p-4 sm:p-6 mx-auto">
                        <DialogHeader>
                            <DialogTitle className="text-ink">Tahsilat Ekle — {paymentCustomer?.name}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handlePaymentSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-ink font-semibold">Ödeme Tutarı (₺)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={paymentFormData.amount}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                                    required
                                    className="bg-paper border-hairline text-ink font-semibold text-lg"
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-ink font-semibold">Tarih</Label>
                                <Input
                                    type="date"
                                    value={paymentFormData.date}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                                    required
                                    className="bg-paper border-hairline text-ink"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-ink">Açıklama / Notlar</Label>
                                <Input
                                    value={paymentFormData.notes}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                                    className="bg-paper border-hairline text-ink"
                                    placeholder="Nakit, Havale, vb."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="ghost" onClick={() => { setPaymentDialogOpen(false); setPaymentCustomer(null); }} className="text-sand hover:text-ink">
                                    Vazgeç
                                </Button>
                                <Button type="submit" disabled={paymentSubmitting} className="bg-moss text-paper hover:bg-moss/80 disabled:opacity-50 font-medium">
                                    {paymentSubmitting ? 'İşleniyor...' : 'Tahsilatı Kaydet'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="bg-paper border-hairline">
                <CardContent className="p-0 overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-sand">Loading...</div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="p-8 text-center text-sand">
                            {searchQuery ? `"${searchQuery}" ile eşleşen müşteri bulunamadı.` : 'No customers yet. Add your first customer!'}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table Header (hidden on mobile) */}
                            <div className="hidden md:block overflow-x-auto custom-scrollbar">
                                <Table className="min-w-[800px]">
                                    <TableHeader>
                                        <TableRow className="border-hairline hover:bg-transparent">
                                            <TableHead className="w-10"> </TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Name</TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Email</TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Phone</TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Address</TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap text-right">Bakiye (Borç)</TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap text-right">Toplam Kâr</TableHead>
                                            <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCustomers.map((customer) => {
                                            const totalProfit = customer.sales?.reduce((sum, s) => sum + (s.profit || 0), 0) || 0;
                                            const isExpanded = expandedCustomers.has(customer.id);
                                            return (
                                                <React.Fragment key={customer.id}>
                                                    <TableRow className={`border-hairline hover:bg-ink/5 cursor-pointer ${isExpanded ? 'bg-ink/5' : ''}`} onClick={() => toggleExpand(customer.id)}>
                                                        <TableCell className="p-2 text-sand text-center">
                                                            {isExpanded ? <ChevronDown className="w-4 h-4 mx-auto" /> : <ChevronRight className="w-4 h-4 mx-auto" />}
                                                        </TableCell>
                                                        <TableCell className="font-medium text-ink whitespace-nowrap">{customer.name}</TableCell>
                                                        <TableCell className="text-sand whitespace-nowrap">{customer.email || '-'}</TableCell>
                                                        <TableCell className="text-sand whitespace-nowrap">{customer.phone || '-'}</TableCell>
                                                        <TableCell className="text-sand max-w-xs truncate">{customer.address || '-'}</TableCell>
                                                        <TableCell className="text-right font-medium whitespace-nowrap">
                                                            <span className={customer.balance > 0 ? 'text-amber-500 font-bold' : customer.balance < 0 ? 'text-moss font-bold' : 'text-sand'}>
                                                                {formatCurrency(customer.balance || 0)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-moss whitespace-nowrap">
                                                            {formatCurrency(totalProfit)}
                                                        </TableCell>
                                                        <TableCell className="text-right whitespace-nowrap space-x-1">
                                                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openPaymentDialog(customer) }} className="border-moss/50 text-moss hover:bg-moss/10 text-xs">
                                                                Tahsilat Ekle
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditDialog(customer) }} className="text-sand hover:text-ink">
                                                                Edit
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(customer.id) }} className="text-red-400 hover:text-red-300">
                                                                Delete
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                    {isExpanded && (
                                                        <TableRow className="border-hairline bg-ink/[0.02]">
                                                            <TableCell colSpan={8} className="p-0 border-b border-hairline">
                                                                <div className="p-4 border-l-2 border-hairline ml-4 my-2">
                                                                    <h4 className="text-ink text-sm font-medium mb-2">Satış Geçmişi</h4>
                                                                    {customer.sales?.length === 0 ? (
                                                                        <p className="text-sand text-sm">Geçmiş satış bulunmuyor.</p>
                                                                    ) : (
                                                                        <Table className="bg-ink/5 rounded overflow-hidden border border-hairline w-full max-w-3xl">
                                                                            <TableHeader>
                                                                                <TableRow className="border-hairline hover:bg-transparent">
                                                                                    <TableHead className="text-sand h-8 text-xs font-storefront-mono">Tarih</TableHead>
                                                                                    <TableHead className="text-sand h-8 text-xs font-storefront-mono">Ürün</TableHead>
                                                                                    <TableHead className="text-sand h-8 text-xs font-storefront-mono text-right">Tutar</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {customer.sales?.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()).map(sale => {
                                                                                    const isPayment = sale.product?.name === 'Tahsilat' || sale.quantity === 0;
                                                                                    return (
                                                                                        <TableRow key={sale.id} className="border-hairline hover:bg-ink/5">
                                                                                            <TableCell className="text-sand text-sm p-2">{formatDate(sale.sale_date)}</TableCell>
                                                                                            <TableCell className="text-ink text-sm p-2">
                                                                                                {isPayment ? (
                                                                                                    <span className="text-moss font-medium">Tahsilat / Ödeme Alındı</span>
                                                                                                ) : (
                                                                                                    <>{sale.product?.name} <span className="text-sand">({sale.quantity}x)</span></>
                                                                                                )}
                                                                                            </TableCell>
                                                                                            <TableCell className="text-sand font-medium text-sm text-right p-2">
                                                                                                {isPayment ? (
                                                                                                    <span className="text-moss">-{formatCurrency(sale.payment_amount || 0)}</span>
                                                                                                ) : (
                                                                                                    formatCurrency(sale.total_price || 0)
                                                                                                )}
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    );
                                                                                })}
                                                                            </TableBody>
                                                                        </Table>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card View (hidden on desktop) */}
                            <div className="md:hidden divide-y divide-hairline">
                                {filteredCustomers.map((customer) => {
                                    const totalProfit = customer.sales?.reduce((sum, s) => sum + (s.profit || 0), 0) || 0;
                                    const isExpanded = expandedCustomers.has(customer.id);
                                    return (
                                        <Card key={customer.id} className="bg-paper border-hairline">
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex justify-between items-start cursor-pointer" onClick={() => toggleExpand(customer.id)}>
                                                    <div>
                                                        <h3 className="font-medium text-ink flex items-center">
                                                            {isExpanded ? <ChevronDown className="w-4 h-4 mr-1 text-sand" /> : <ChevronRight className="w-4 h-4 mr-1 text-sand" />}
                                                            {customer.name}
                                                        </h3>
                                                        <p className="text-sm text-sand">{customer.email || 'No email'}</p>
                                                        <p className="text-sm text-sand">{customer.phone || 'No phone'}</p>
                                                    </div>
                                                    <div className="text-right space-y-1">
                                                        <div>
                                                            <div className="text-xs text-sand font-normal">Bakiye (Borç)</div>
                                                            <span className={`font-semibold text-sm ${customer.balance > 0 ? 'text-amber-500' : customer.balance < 0 ? 'text-moss' : 'text-sand'}`}>
                                                                {formatCurrency(customer.balance || 0)}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="text-xs text-sand font-normal">Toplam Kâr</div>
                                                            <span className="font-semibold text-moss text-sm">{formatCurrency(totalProfit)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {customer.address && (
                                                    <div className="text-sm text-sand">
                                                        <span className="text-sand mr-2">Adres:</span>
                                                        {customer.address}
                                                    </div>
                                                )}

                                                {isExpanded && (
                                                    <div className="pt-2 border-t border-hairline">
                                                        <h4 className="text-sand text-xs font-medium mb-2">Satış Geçmişi</h4>
                                                        {customer.sales?.length === 0 ? (
                                                            <p className="text-sand text-xs">Satış yok.</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {customer.sales?.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()).map(sale => {
                                                                    const isPayment = sale.product?.name === 'Tahsilat' || sale.quantity === 0;
                                                                    return (
                                                                        <div key={sale.id} className="bg-ink/5 p-2 rounded flex justify-between items-center text-sm">
                                                                            <div>
                                                                                <div className="text-ink">
                                                                                    {isPayment ? (
                                                                                        <span className="text-moss font-medium">Tahsilat / Ödeme Alındı</span>
                                                                                    ) : (
                                                                                        <>{sale.product?.name} <span className="text-sand">({sale.quantity}x)</span></>
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-xs text-sand">{formatDate(sale.sale_date)}</div>
                                                                            </div>
                                                                            <div className="text-sand font-medium">
                                                                                {isPayment ? (
                                                                                    <span className="text-moss">-{formatCurrency(sale.payment_amount || 0)}</span>
                                                                                ) : (
                                                                                    formatCurrency(sale.total_price || 0)
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openPaymentDialog(customer) }} className="border-moss/50 text-moss hover:bg-moss/10 h-8 text-xs">
                                                        Tahsilat Ekle
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditDialog(customer) }} className="text-sand hover:text-ink h-8">
                                                        Edit
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(customer.id) }} className="text-red-400 hover:text-red-300 h-8">
                                                        Delete
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
