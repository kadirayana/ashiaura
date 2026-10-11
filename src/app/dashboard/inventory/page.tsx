'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { RawMaterial, RawMaterialPurchase, MaterialType, MaterialUnit } from '@/types/database'
import { Save, X, Pencil, Trash2, ChevronDown, ChevronRight, Download, History } from 'lucide-react'
import { exportToExcel } from '@/lib/excelExport'

const materialTypes: MaterialType[] = ['essence', 'alcohol', 'bottle', 'packaging', 'other']
const materialUnits: MaterialUnit[] = ['ml', 'gr', 'pcs', 'liter', 'kg']

// Type for tracking inline edits
type EditedMaterial = Partial<Pick<RawMaterial, 'name' | 'stock' | 'initial_stock' | 'total_cost' | 'supplier' | 'notes' | 'type' | 'unit'>>

export default function InventoryPage() {
    const [materials, setMaterials] = useState<RawMaterial[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        type: 'essence' as MaterialType,
        stock: 0,
        initial_stock: 0,
        unit: 'ml' as MaterialUnit,
        total_cost: 0,
        supplier: '',
        notes: '',
    })
    const [filterType, setFilterType] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const [totalExpenditure, setTotalExpenditure] = useState<number>(0)
    const PAGE_SIZE = 50

    // Inline editing state
    const [editingRows, setEditingRows] = useState<Set<string>>(new Set())
    const [editedData, setEditedData] = useState<Map<string, EditedMaterial>>(new Map())
    const [saving, setSaving] = useState(false)
    const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set())

    const toggleExpand = (name: string) => {
        setExpandedNames(prev => {
            const next = new Set(prev)
            const key = name.trim().toLowerCase()
            if (next.has(key)) {
                next.delete(key)
            } else {
                next.add(key)
            }
            return next
        })
    }

    const groupedMaterials = useMemo(() => {
        const groups = new Map<string, RawMaterial[]>()
        materials.forEach(material => {
            const key = material.name.trim().toLowerCase()
            if (!groups.has(key)) {
                groups.set(key, [])
            }
            groups.get(key)!.push(material)
        })
        return Array.from(groups.values())
    }, [materials])

    const hasUnsavedChanges = editedData.size > 0

    // Add Stock / Purchase Log dialog state
    const [stockDialogOpen, setStockDialogOpen] = useState(false)
    const [selectedStockMaterial, setSelectedStockMaterial] = useState<RawMaterial | null>(null)
    const [stockFormData, setStockFormData] = useState({
        add_quantity: 0,
        total_cost: 0,
        unit_price: 0,
        supplier: '',
        purchase_date: new Date().toISOString().split('T')[0],
        notes: '',
    })

    // Purchase History dialog state
    const [historyModalOpen, setHistoryModalOpen] = useState(false)
    const [historyMaterial, setHistoryMaterial] = useState<RawMaterial | null>(null)
    const [historyLogs, setHistoryLogs] = useState<RawMaterialPurchase[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    const supabase = createClient()

    async function openPurchaseHistory(material: RawMaterial) {
        setHistoryMaterial(material)
        setHistoryModalOpen(true)
        setLoadingHistory(true)

        try {
            const { data, error } = await supabase
                .from('raw_material_purchases')
                .select('*')
                .eq('material_id', material.id)
                .order('purchase_date', { ascending: false })

            if (!error && data) {
                setHistoryLogs(data as RawMaterialPurchase[])
            } else {
                setHistoryLogs([])
            }
        } catch (err) {
            console.error('History fetch error:', err)
            setHistoryLogs([])
        } finally {
            setLoadingHistory(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm)
            setPage(0)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchTerm])

    useEffect(() => {
        fetchMaterials(page === 0)
        if (page === 0) fetchTotalExpenditure()
    }, [debouncedSearch, filterType, page])

    async function fetchTotalExpenditure() {
        let query = supabase.from('raw_materials').select('total_cost')

        if (debouncedSearch) {
            query = query.ilike('name', `%${debouncedSearch}%`)
        }
        if (filterType !== 'all') {
            query = query.eq('type', filterType)
        }

        const { data, error } = await query
        if (!error && data) {
            const total = data.reduce((sum, item) => sum + (item.total_cost || 0), 0)
            setTotalExpenditure(total)
        }
    }


    async function fetchMaterials(isNewSearch = false) {
        if (isNewSearch) setLoading(true)

        let query = supabase
            .from('raw_materials')
            .select('*', { count: 'exact' })
            .order('stock', { ascending: false })
            .order('name')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (debouncedSearch) {
            query = query.ilike('name', `%${debouncedSearch}%`)
        }

        if (filterType !== 'all') {
            query = query.eq('type', filterType)
        }

        const { data, count, error } = await query

        if (error) {
            toast.error('Failed to load materials')
        } else {
            const rawList = data || []
            if (isNewSearch) {
                setMaterials(rawList)
            } else {
                setMaterials(prev => {
                    const existingIds = new Set(prev.map(m => m.id))
                    const newItems = rawList.filter(m => !existingIds.has(m.id))
                    return [...prev, ...newItems]
                })
            }
            setHasMore(count !== null && (page + 1) * PAGE_SIZE <= count)
        }
        if (isNewSearch) setLoading(false)
    }

    // ─── Add Material / Stock Purchase ────────────────────────
    function resetForm() {
        setFormData({
            name: '', type: 'essence', stock: 0, initial_stock: 0,
            unit: 'ml', total_cost: 0, supplier: '', notes: '',
        })
    }

    function openStockAddDialog(material: RawMaterial) {
        setSelectedStockMaterial(material)
        setStockFormData({
            add_quantity: 0,
            total_cost: 0,
            unit_price: material.total_cost && material.initial_stock ? Number((material.total_cost / material.initial_stock).toFixed(2)) : 0,
            supplier: material.supplier || '',
            purchase_date: new Date().toISOString().split('T')[0],
            notes: '',
        })
        setStockDialogOpen(true)
    }

    async function handleAddStock(e: React.FormEvent) {
        e.preventDefault()
        if (!selectedStockMaterial || submitting) return
        setSubmitting(true)

        try {
            const addQty = Number(stockFormData.add_quantity) || 0
            if (addQty <= 0) {
                toast.error('Lütfen geçerli bir miktar girin')
                setSubmitting(false)
                return
            }

            const addedCost = stockFormData.total_cost > 0
                ? Number(stockFormData.total_cost)
                : addQty * (Number(stockFormData.unit_price) || 0)

            const supplierVal = stockFormData.supplier.trim() || selectedStockMaterial.supplier || null

            // Insert as a new independent batch row in raw_materials
            const { data: newRow, error } = await supabase.from('raw_materials').insert({
                name: selectedStockMaterial.name,
                type: selectedStockMaterial.type,
                stock: addQty,
                initial_stock: addQty,
                unit: selectedStockMaterial.unit,
                total_cost: addedCost > 0 ? addedCost : null,
                supplier: supplierVal,
                notes: stockFormData.notes || null,
            }).select().single()

            if (error) throw error

            // Record purchase log in raw_material_purchases table
            try {
                await supabase.from('raw_material_purchases').insert({
                    material_id: newRow.id,
                    quantity: addQty,
                    unit_cost: addQty > 0 ? Number((addedCost / addQty).toFixed(4)) : 0,
                    total_cost: addedCost,
                    supplier: supplierVal,
                    notes: stockFormData.notes || null,
                    purchase_date: stockFormData.purchase_date || new Date().toISOString().split('T')[0]
                })
            } catch (logErr) {
                console.log('Purchase log insert info:', logErr)
            }

            toast.success(`Yeni alım lotu eklendi: ${addQty} ${selectedStockMaterial.unit} (${supplierVal || 'Tedarikçi yok'})`)
            setStockDialogOpen(false)
            fetchMaterials(true)
        } catch (err: any) {
            toast.error(err?.message || 'Stok eklenemedi')
        } finally {
            setSubmitting(false)
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault()
        if (submitting) return
        setSubmitting(true)

        try {
            const cleanName = formData.name.trim()
            const initialStock = formData.initial_stock > 0 ? formData.initial_stock : (formData.stock > 0 ? formData.stock : 1)
            const totalCostVal = formData.total_cost || null

            // Insert each purchase as its own independent batch row in raw_materials
            const { data, error } = await supabase.from('raw_materials').insert({
                name: cleanName,
                type: formData.type,
                stock: formData.stock,
                initial_stock: initialStock,
                unit: formData.unit,
                total_cost: totalCostVal,
                supplier: formData.supplier || null,
                notes: formData.notes || null,
            }).select().single()

            if (error) {
                toast.error('Failed to add material')
            } else if (data) {
                // Record purchase log in raw_material_purchases table
                try {
                    await supabase.from('raw_material_purchases').insert({
                        material_id: data.id,
                        quantity: initialStock,
                        unit_cost: (initialStock > 0 && totalCostVal) ? Number((totalCostVal / initialStock).toFixed(4)) : 0,
                        total_cost: totalCostVal || 0,
                        supplier: formData.supplier || null,
                        notes: formData.notes || 'Alım Kaydı',
                        purchase_date: new Date().toISOString().split('T')[0]
                    })
                } catch (logErr) {
                    console.log('Initial purchase log info:', logErr)
                }

                toast.success(`Yeni Alım Kaydı Eklendi: "${cleanName}" (${formData.supplier || 'Tedarikçi belirtilmedi'})`)
                setMaterials(prev => [data as RawMaterial, ...prev])
                setDialogOpen(false)
                resetForm()
            }
        } catch (err: any) {
            toast.error(err?.message || 'Hammadde eklenemedi')
        } finally {
            setSubmitting(false)
        }
    }

    // ─── Inline Editing ────────────────────────────────────────
    function startEditing(materialId: string) {
        setEditingRows(prev => new Set(prev).add(materialId))
    }

    function cancelEditing(materialId: string) {
        setEditingRows(prev => {
            const next = new Set(prev)
            next.delete(materialId)
            return next
        })
        setEditedData(prev => {
            const next = new Map(prev)
            next.delete(materialId)
            return next
        })
    }

    function updateField(materialId: string, field: keyof EditedMaterial, value: any) {
        setEditedData(prev => {
            const next = new Map(prev)
            const current = next.get(materialId) || {}
            next.set(materialId, { ...current, [field]: value })
            return next
        })
    }

    function getFieldValue(material: RawMaterial, field: keyof EditedMaterial) {
        const edited = editedData.get(material.id)
        if (edited && field in edited) return edited[field]
        return material[field]
    }

    // ─── Batch Save ────────────────────────────────────────────
    async function handleSaveAll() {
        if (editedData.size === 0) return
        setSaving(true)

        try {
            const updates = Array.from(editedData.entries())
            let successCount = 0
            let errorCount = 0

            for (const [materialId, changes] of updates) {
                const material = materials.find(m => m.id === materialId)
                if (!material) continue

                const updateData: any = { ...changes }
                // Ensure initial_stock logic
                if ('stock' in updateData && !('initial_stock' in updateData)) {
                    const stockDiff = updateData.stock - material.stock
                    if (stockDiff > 0) {
                        updateData.initial_stock = (material.initial_stock ?? material.stock ?? 0) + stockDiff
                    }
                }
                if ('initial_stock' in updateData) {
                    if (updateData.initial_stock <= 0) {
                        updateData.initial_stock = updateData.stock > 0 ? updateData.stock : (material.stock > 0 ? material.stock : 1)
                    }
                }

                const { error } = await supabase
                    .from('raw_materials')
                    .update(updateData)
                    .eq('id', materialId)

                if (error) {
                    errorCount++
                    console.error(`Failed to update ${material.name}:`, error)
                } else {
                    successCount++
                    // Optimistic update
                    setMaterials(prev => prev.map(m =>
                        m.id === materialId ? { ...m, ...updateData, updated_at: new Date().toISOString() } : m
                    ))
                }
            }

            if (successCount > 0) {
                toast.success(`${successCount} malzeme güncellendi`)
            }
            if (errorCount > 0) {
                toast.error(`${errorCount} malzeme güncellenemedi`)
            }

            // Clear editing state for successful saves
            setEditedData(new Map())
            setEditingRows(new Set())
        } finally {
            setSaving(false)
        }
    }
    // ─── Delete ────────────────────────────────────────────────
    async function handleDelete(id: string) {
        if (!confirm('Bu hammaddeyi silmek istediğinize emin misiniz?')) return

        // First delete associated purchase logs to avoid orphan data
        await supabase.from('raw_material_purchases').delete().eq('material_id', id)

        const { error } = await supabase.from('raw_materials').delete().eq('id', id)

        if (error) {
            toast.error('Hammadde silinemedi. Reçetelerde kullanılıyor olabilir.')
        } else {
            toast.success('Hammadde ve alım geçmişi silindi')
            setMaterials(prev => prev.filter(m => m.id !== id))
            // Clean up editing state
            cancelEditing(id)
        }
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—'
        const date = new Date(dateStr)
        return date.toLocaleDateString('tr-TR')
    }

    const getTypeColor = (type: MaterialType) => {
        const colors: Record<MaterialType, string> = {
            essence: 'bg-rust/5 text-rust border-rust/20',
            alcohol: 'bg-ink/5 text-ink border-ink/20',
            bottle: 'bg-sand/5 text-sand border-sand/20',
            packaging: 'bg-sand/5 text-sand border-sand/20',
            other: 'bg-sand/5 text-sand border-sand/20',
        }
        return colors[type]
    }

    async function handleExportExcel() {
        toast.loading('Supabase veritabanından tüm hammadde stokları çekiliyor...', { id: 'excel-export' })
        const { data: allMaterials, error } = await supabase
            .from('raw_materials')
            .select('*')
            .order('name')

        if (error || !allMaterials || allMaterials.length === 0) {
            toast.error('Aktarılacak hammadde verisi bulunamadı.', { id: 'excel-export' })
            return
        }

        const excelData = allMaterials.map(m => {
            const initialStock = m.initial_stock || m.stock || 1
            const totalCost = m.total_cost || 0
            const unitCost = initialStock > 0 ? totalCost / initialStock : 0
            return {
                'Hammadde Adı': m.name,
                'Kategori': m.type === 'essence' ? 'Esans' : m.type === 'alcohol' ? 'Alkol' : m.type === 'bottle' ? 'Şişe' : m.type === 'packaging' ? 'Ambalaj' : 'Diğer',
                'Mevcut Stok': m.stock,
                'İlk Alım Miktarı': m.initial_stock || m.stock,
                'Birim': m.unit,
                'Birim Maliyet (₺)': Number(unitCost.toFixed(2)),
                'Toplam Maliyet (₺)': totalCost,
                'Tedarikçi': m.supplier || '-',
                'Notlar': m.notes || '-'
            }
        })
        exportToExcel(excelData, 'Hammadde_Stok_Dokumu.xlsx', 'Hammaddeler')
        toast.success(`${allMaterials.length} adet hammadde dökümü Supabase DB'den indirildi!`, { id: 'excel-export' })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-ink">Raw Materials</h1>
                    <p className="text-sand text-xs sm:text-sm mt-0.5">Manage your inventory of essences, alcohol, bottles, and more</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={handleExportExcel} className="border-hairline text-ink hover:bg-ink/5 text-xs sm:text-sm h-9">
                        <Download className="w-4 h-4 mr-1.5 sm:mr-2" />
                        Excel'e Aktar
                    </Button>
                    <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button className="bg-rust hover:bg-rust/90 text-paper text-xs sm:text-sm h-9">
                                <svg className="w-4 h-4 mr-1.5 sm:mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                Add Material
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-paper border-hairline w-full max-w-[95vw] sm:max-w-lg overflow-x-hidden overflow-y-auto max-h-[90vh] p-4 sm:p-6 mx-auto text-ink">
                            <DialogHeader>
                                <DialogTitle className="text-ink">Add New Material</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAdd} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sand font-medium">Name</Label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            className="bg-transparent border-hairline text-ink focus:border-rust"
                                            placeholder="e.g., Rose Essence"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sand font-medium">Type</Label>
                                        <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as MaterialType })}>
                                            <SelectTrigger className="bg-transparent border-hairline text-ink">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-paper border-hairline">
                                                {materialTypes.map((type) => (
                                                    <SelectItem key={type} value={type} className="text-ink capitalize hover:bg-ink/5">{type}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sand font-medium">Current Stock</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.stock}
                                            onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                                            required
                                            className="bg-transparent border-hairline text-ink focus:border-rust"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sand font-medium">Unit</Label>
                                        <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v as MaterialUnit })}>
                                            <SelectTrigger className="bg-transparent border-hairline text-ink">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-paper border-hairline">
                                                {materialUnits.map((unit) => (
                                                    <SelectItem key={unit} value={unit} className="text-ink hover:bg-ink/5">{unit}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sand font-medium">İlk Alım Miktarı</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.initial_stock}
                                            onChange={(e) => setFormData({ ...formData, initial_stock: parseFloat(e.target.value) || 0 })}
                                            className="bg-transparent border-hairline text-ink focus:border-rust"
                                            placeholder={`Kaç ${formData.unit} alındı?`}
                                        />
                                        <p className="text-xs text-sand/70">Toplam maliyetin kaç birim için olduğu</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sand font-medium">Toplam Maliyet (₺)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={formData.total_cost}
                                            onChange={(e) => setFormData({ ...formData, total_cost: parseFloat(e.target.value) || 0 })}
                                            className="bg-transparent border-hairline text-ink focus:border-rust"
                                            placeholder="Total purchase cost"
                                        />
                                        {formData.initial_stock > 0 && formData.total_cost > 0 && (
                                            <p className="text-xs text-moss font-semibold">
                                                Birim fiyat: ₺{(formData.total_cost / formData.initial_stock).toFixed(2)} / {formData.unit}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sand font-medium">Tedarikçi (Supplier)</Label>
                                        <Input
                                            value={formData.supplier}
                                            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                            className="bg-transparent border-hairline text-ink focus:border-rust"
                                            placeholder="Örn: Dilruba, Doruk, İstanbul Esans..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sand font-medium">Notlar (Notes)</Label>
                                        <Input
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            className="bg-transparent border-hairline text-ink focus:border-rust"
                                            placeholder="Opsiyonel notlar..."
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); resetForm(); }} className="text-sand hover:text-ink">
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={submitting} className="bg-rust hover:bg-rust/90 text-paper disabled:opacity-50">
                                        {submitting ? 'İşleniyor...' : 'Add Material'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* ─── Add Stock / Purchase Log Modal ─────────────────── */}
                <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
                    <DialogContent className="bg-slate-900 border-slate-700 w-full max-w-[95vw] sm:max-w-lg overflow-x-hidden overflow-y-auto max-h-[90vh] p-4 sm:p-6 mx-auto">
                        <DialogHeader>
                            <DialogTitle className="text-white">
                                {selectedStockMaterial ? `${selectedStockMaterial.name} — Stok / Alım Ekle` : 'Stok Ekle'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddStock} className="space-y-4">
                            <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700 text-sm space-y-1">
                                <p className="text-slate-400">Mevcut Stok: <strong className="text-white">{selectedStockMaterial?.stock || 0} {selectedStockMaterial?.unit}</strong></p>
                                {selectedStockMaterial?.total_cost && selectedStockMaterial?.initial_stock ? (
                                    <p className="text-slate-400">Mevcut Birim Fiyat: <strong className="text-emerald-400">₺{(selectedStockMaterial.total_cost / selectedStockMaterial.initial_stock).toFixed(2)} / {selectedStockMaterial.unit}</strong></p>
                                ) : null}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Eklenen Miktar ({selectedStockMaterial?.unit})</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={stockFormData.add_quantity || ''}
                                        onChange={(e) => setStockFormData({ ...stockFormData, add_quantity: parseFloat(e.target.value) || 0 })}
                                        required
                                        className="bg-slate-800 border-slate-600 text-white"
                                        placeholder={`Örn: 5 ${selectedStockMaterial?.unit}`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Tedarikçi</Label>
                                    <Input
                                        value={stockFormData.supplier}
                                        onChange={(e) => setStockFormData({ ...stockFormData, supplier: e.target.value })}
                                        className="bg-slate-800 border-slate-600 text-white"
                                        placeholder="Firma / Tedarikçi adı..."
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Birim Fiyat (₺/{selectedStockMaterial?.unit})</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={stockFormData.unit_price || ''}
                                        onChange={(e) => {
                                            const up = parseFloat(e.target.value) || 0
                                            setStockFormData({
                                                ...stockFormData,
                                                unit_price: up,
                                                total_cost: stockFormData.add_quantity ? up * stockFormData.add_quantity : stockFormData.total_cost
                                            })
                                        }}
                                        className="bg-slate-800 border-slate-600 text-white"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-300">Toplam Alım Tutarı (₺)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={stockFormData.total_cost || ''}
                                        onChange={(e) => setStockFormData({ ...stockFormData, total_cost: parseFloat(e.target.value) || 0 })}
                                        className="bg-slate-800 border-slate-600 text-white"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setStockDialogOpen(false)} className="text-slate-400">
                                    İptal
                                </Button>
                                <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium disabled:opacity-50">
                                    {submitting ? 'İşleniyor...' : 'Stok Ekle'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* ─── Purchase History / Alış Geçmişi Modal ─────────────────── */}
                <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
                    <DialogContent className="bg-paper border-hairline w-full max-w-[95vw] sm:max-w-2xl overflow-x-hidden overflow-y-auto max-h-[90vh] p-4 sm:p-6 mx-auto text-ink">
                        <DialogHeader>
                            <DialogTitle className="text-ink text-xl font-bold flex items-center gap-2">
                                <History className="w-5 h-5 text-rust" />
                                {historyMaterial?.name} — Alış Geçmişi & Tedarikçiler
                            </DialogTitle>
                        </DialogHeader>

                        {historyMaterial && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-ink/5 border border-hairline text-xs">
                                    <div>
                                        <span className="text-sand block">Mevcut Stok:</span>
                                        <strong className="text-ink text-sm font-semibold">{historyMaterial.stock} {historyMaterial.unit}</strong>
                                    </div>
                                    <div>
                                        <span className="text-sand block">Birim Fiyat:</span>
                                        <strong className="text-moss text-sm font-semibold">
                                            ₺{((historyMaterial.total_cost || 0) / (historyMaterial.initial_stock || historyMaterial.stock || 1)).toFixed(2)} / {historyMaterial.unit}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-sand block">Toplam Harcama:</span>
                                        <strong className="text-ink text-sm font-semibold">₺{(historyMaterial.total_cost || 0).toLocaleString()}</strong>
                                    </div>
                                    <div>
                                        <span className="text-sand block">Son Tedarikçi:</span>
                                        <strong className="text-ink text-sm font-semibold">{historyMaterial.supplier || '—'}</strong>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-2">
                                    <h3 className="font-semibold text-sm text-ink">Tüm Alış Kayıtları & Fiyat Hareketleri</h3>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setHistoryModalOpen(false)
                                            setSelectedStockMaterial(historyMaterial)
                                            setStockFormData({
                                                add_quantity: 0,
                                                total_cost: 0,
                                                unit_price: 0,
                                                supplier: historyMaterial.supplier || '',
                                                purchase_date: new Date().toISOString().split('T')[0],
                                                notes: '',
                                            })
                                            setStockDialogOpen(true)
                                        }}
                                        className="bg-moss hover:bg-moss/90 text-paper text-xs h-8"
                                    >
                                        + Yeni Alış Kaydet
                                    </Button>
                                </div>

                                <div className="rounded-md border border-hairline overflow-x-auto max-h-[40vh] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="bg-ink/5">
                                            <TableRow className="border-hairline">
                                                <TableHead className="text-sand text-xs">Tarih</TableHead>
                                                <TableHead className="text-sand text-xs">Tedarikçi</TableHead>
                                                <TableHead className="text-sand text-xs text-right">Alınan Miktar</TableHead>
                                                <TableHead className="text-sand text-xs text-right">Birim Fiyat</TableHead>
                                                <TableHead className="text-sand text-xs text-right">Toplam Tutar</TableHead>
                                                <TableHead className="text-sand text-xs">Notlar</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loadingHistory ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center p-4 text-sand text-xs">Geçmiş yükleniyor...</TableCell>
                                                </TableRow>
                                            ) : historyLogs.length > 0 ? (
                                                historyLogs.map((log) => (
                                                    <TableRow key={log.id} className="border-hairline hover:bg-ink/5 text-xs">
                                                        <TableCell className="font-mono text-sand whitespace-nowrap">{formatDate(log.purchase_date)}</TableCell>
                                                        <TableCell className="font-medium text-ink whitespace-nowrap">{log.supplier || '—'}</TableCell>
                                                        <TableCell className="text-right text-ink whitespace-nowrap">{log.quantity} {historyMaterial.unit}</TableCell>
                                                        <TableCell className="text-right text-moss font-semibold whitespace-nowrap">₺{Number(log.unit_cost).toFixed(2)} / {historyMaterial.unit}</TableCell>
                                                        <TableCell className="text-right font-semibold text-ink whitespace-nowrap">₺{Number(log.total_cost).toLocaleString()}</TableCell>
                                                        <TableCell className="text-sand text-xs max-w-xs truncate">{log.notes || '-'}</TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow className="border-hairline hover:bg-ink/5 text-xs">
                                                    <TableCell className="font-mono text-sand whitespace-nowrap">{formatDate(historyMaterial.created_at)}</TableCell>
                                                    <TableCell className="font-medium text-ink whitespace-nowrap">{historyMaterial.supplier || '—'}</TableCell>
                                                    <TableCell className="text-right text-ink whitespace-nowrap">{historyMaterial.initial_stock || historyMaterial.stock} {historyMaterial.unit}</TableCell>
                                                    <TableCell className="text-right text-moss font-semibold whitespace-nowrap">
                                                        ₺{((historyMaterial.total_cost || 0) / (historyMaterial.initial_stock || historyMaterial.stock || 1)).toFixed(2)} / {historyMaterial.unit}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-ink whitespace-nowrap">₺{(historyMaterial.total_cost || 0).toLocaleString()}</TableCell>
                                                    <TableCell className="text-sand text-xs max-w-xs truncate">{historyMaterial.notes || 'İlk Alım Kaydı'}</TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-paper border-hairline hover:border-sand transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-rust/5 text-rust rounded-lg border border-rust/10">
                            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm text-sand font-medium">Toplam Harcama</p>
                            <h3 className="text-2xl font-bold text-ink">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalExpenditure)}
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant={filterType === 'all' ? 'default' : 'ghost'}
                        onClick={() => { setFilterType('all'); setPage(0); }}
                        className={filterType === 'all' ? 'bg-ink text-paper' : 'text-sand hover:text-ink hover:bg-ink/5'}
                        size="sm"
                    >
                        All
                    </Button>
                    {materialTypes.map((type) => {
                        return (
                            <Button
                                key={type}
                                variant={filterType === type ? 'default' : 'ghost'}
                                onClick={() => { setFilterType(type); setPage(0); }}
                                className={filterType === type ? 'bg-ink text-paper' : 'text-sand hover:text-ink hover:bg-ink/5'}
                                size="sm"
                            >
                                <span className="capitalize">{type}</span>
                            </Button>
                        )
                    })}
                </div>
                <div className="w-full sm:w-64">
                    <Input
                        type="text"
                        placeholder="Search materials..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-hairline text-ink placeholder:text-sand/50 focus:border-rust focus:ring-0"
                    />
                </div>
            </div>

            <Card className="bg-paper border-hairline">
                <CardContent className="p-0 overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-sand">Loading...</div>
                    ) : materials.length === 0 ? (
                        <div className="p-8 text-center text-sand">No materials found. Add your first material!</div>
                    ) : (
                        <>
                            {/* Desktop Table (hidden on mobile) */}
                            <div className="hidden md:block overflow-x-auto custom-scrollbar">
                                <Table className="min-w-[850px]">
                                    <TableHeader>
                                        <TableRow className="border-hairline hover:bg-transparent">
                                            <TableHead className="text-sand whitespace-nowrap">Name</TableHead>
                                            <TableHead className="text-sand whitespace-nowrap">Type</TableHead>
                                            <TableHead className="text-sand whitespace-nowrap">Alım Tarihi</TableHead>
                                            <TableHead className="text-sand whitespace-nowrap text-right">Stock</TableHead>
                                            <TableHead className="text-sand whitespace-nowrap text-right">İlk Alım</TableHead>
                                            <TableHead className="text-sand whitespace-nowrap text-right">Total Cost</TableHead>
                                            <TableHead className="text-sand whitespace-nowrap">Supplier</TableHead>
                                            <TableHead className="text-sand whitespace-nowrap text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {groupedMaterials.map((group) => {
                                            const firstMaterial = group[0]
                                            const isGrouped = group.length > 1
                                            const isExpanded = expandedNames.has(firstMaterial.name.trim().toLowerCase())

                                            // Summary values for the group
                                            const totalStock = group.reduce((sum, m) => sum + m.stock, 0)
                                            const totalInitialStock = group.reduce((sum, m) => sum + (m.initial_stock || m.stock), 0)
                                            const totalCost = group.reduce((sum, m) => sum + (m.total_cost || 0), 0)

                                            // Date range
                                            const dates = group.map(m => new Date(m.created_at).getTime())
                                            const minDate = new Date(Math.min(...dates)).toISOString()
                                            const maxDate = new Date(Math.max(...dates)).toISOString()
                                            const dateRangeStr = isGrouped ? `${formatDate(minDate)} - ${formatDate(maxDate)}` : formatDate(firstMaterial.created_at)

                                            // Unique suppliers
                                            const suppliers = Array.from(new Set(group.map(m => m.supplier).filter(Boolean)))
                                            const supplierStr = suppliers.join(', ') || '—'

                                            if (!isGrouped) {
                                                const material = firstMaterial
                                                const isEditing = editingRows.has(material.id)
                                                const isModified = editedData.has(material.id)

                                                if (isEditing) {
                                                    return (
                                                        <TableRow key={material.id} className={`border-hairline ${isModified ? 'bg-rust/5 border-l-2 border-l-rust' : 'hover:bg-ink/5'}`}>
                                                            <TableCell>
                                                                <Input
                                                                    defaultValue={String(getFieldValue(material, 'name'))}
                                                                    onChange={(e) => updateField(material.id, 'name', e.target.value)}
                                                                    className="bg-paper border-hairline text-ink h-8 w-40 focus:border-rust"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={getTypeColor(material.type)}>
                                                                    {material.type}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-sand whitespace-nowrap">
                                                                {formatDate(material.created_at)}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        defaultValue={Number(getFieldValue(material, 'stock'))}
                                                                        onChange={(e) => updateField(material.id, 'stock', parseFloat(e.target.value) || 0)}
                                                                        className="bg-paper border-hairline text-ink h-8 w-20 text-right focus:border-rust"
                                                                    />
                                                                    <span className="text-sand text-xs">{material.unit}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    defaultValue={Number(getFieldValue(material, 'initial_stock')) || ''}
                                                                    onChange={(e) => updateField(material.id, 'initial_stock', parseFloat(e.target.value) || 0)}
                                                                    className="bg-paper border-hairline text-ink h-8 w-20 text-right focus:border-rust"
                                                                    placeholder="—"
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    defaultValue={Number(getFieldValue(material, 'total_cost')) || ''}
                                                                    onChange={(e) => updateField(material.id, 'total_cost', parseFloat(e.target.value) || 0)}
                                                                    className="bg-paper border-hairline text-ink h-8 w-24 text-right focus:border-rust"
                                                                    placeholder="₺"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    defaultValue={String(getFieldValue(material, 'supplier') || '')}
                                                                    onChange={(e) => updateField(material.id, 'supplier', e.target.value || null)}
                                                                    className="bg-paper border-hairline text-ink h-8 w-32 focus:border-rust"
                                                                    placeholder="—"
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right whitespace-nowrap">
                                                                <Button variant="ghost" size="sm" onClick={() => cancelEditing(material.id)} className="text-sand hover:text-ink" title="Cancel">
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(material.id)} className="text-rust hover:text-rust/80" title="Delete">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                }

                                                return (
                                                    <TableRow key={material.id} className="border-hairline hover:bg-ink/5">
                                                        <TableCell className="font-semibold text-ink whitespace-nowrap">{material.name}</TableCell>
                                                        <TableCell className="whitespace-nowrap">
                                                            <Badge variant="outline" className={getTypeColor(material.type)}>
                                                                {material.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sand whitespace-nowrap text-sm">
                                                            {formatDate(material.created_at)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-ink whitespace-nowrap">
                                                            {material.stock.toLocaleString()} {material.unit}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sand whitespace-nowrap">
                                                            {material.initial_stock ? `${material.initial_stock.toLocaleString()} ${material.unit}` : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sand whitespace-nowrap">
                                                            {material.total_cost ? `₺${material.total_cost.toLocaleString()}` : '-'}
                                                            {material.total_cost && material.initial_stock ? (
                                                                <div className="text-xs text-moss font-semibold">
                                                                    ₺{(material.total_cost / material.initial_stock).toFixed(2)}/{material.unit}
                                                                </div>
                                                            ) : null}
                                                        </TableCell>
                                                        <TableCell className="text-sand max-w-xs truncate">{material.supplier || '-'}</TableCell>
                                                        <TableCell className="text-right whitespace-nowrap space-x-1">
                                                            <Button variant="ghost" size="sm" onClick={() => openPurchaseHistory(material)} className="text-moss hover:bg-moss/10 h-8 text-xs px-2" title="Alış Geçmişi & Tedarikçiler">
                                                                <History className="w-3.5 h-3.5 mr-1" />
                                                                Geçmiş
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => startEditing(material.id)} className="text-sand hover:text-ink" title="Edit">
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(material.id)} className="text-rust hover:text-rust/80" title="Delete">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            }

                                            // Render grouped header row
                                            return (
                                                <React.Fragment key={firstMaterial.name.trim().toLowerCase()}>
                                                    <TableRow
                                                        className="border-hairline hover:bg-ink/5 cursor-pointer bg-sand/5"
                                                        onClick={() => toggleExpand(firstMaterial.name)}
                                                    >
                                                        <TableCell className="font-semibold text-ink whitespace-nowrap flex items-center gap-2 select-none">
                                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-rust" /> : <ChevronRight className="w-4 h-4 text-sand" />}
                                                            <span>{firstMaterial.name}</span>
                                                            <Badge variant="outline" className="text-rust border-rust/20 bg-rust/5 text-[10px] py-0 px-1.5 font-normal">
                                                                {group.length} Alım
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="whitespace-nowrap">
                                                            <Badge variant="outline" className={getTypeColor(firstMaterial.type)}>
                                                                {firstMaterial.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sand whitespace-nowrap text-xs">
                                                            {dateRangeStr}
                                                        </TableCell>
                                                        <TableCell className="text-right text-ink font-semibold whitespace-nowrap">
                                                            {totalStock.toLocaleString()} {firstMaterial.unit}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sand whitespace-nowrap">
                                                            {totalInitialStock.toLocaleString()} {firstMaterial.unit}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sand whitespace-nowrap">
                                                            {totalCost ? `₺${totalCost.toLocaleString()}` : '-'}
                                                            {totalCost && totalInitialStock ? (
                                                                <div className="text-xs text-moss font-semibold">
                                                                    ₺{(totalCost / totalInitialStock).toFixed(2)}/{firstMaterial.unit} avg
                                                                </div>
                                                            ) : null}
                                                        </TableCell>
                                                        <TableCell className="text-sand max-w-xs truncate">{supplierStr}</TableCell>
                                                        <TableCell className="text-right whitespace-nowrap">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-rust text-xs hover:bg-rust/5 font-semibold"
                                                                onClick={(e) => { e.stopPropagation(); toggleExpand(firstMaterial.name); }}
                                                            >
                                                                {isExpanded ? 'Gizle' : 'Alımları Gör'}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Expanded batches list */}
                                                    {isExpanded && group.map((material, batchIdx) => {
                                                        const isEditing = editingRows.has(material.id)
                                                        const isModified = editedData.has(material.id)

                                                        if (isEditing) {
                                                            return (
                                                                <TableRow key={material.id} className={`border-hairline pl-8 bg-rust/5 ${isModified ? 'border-l-2 border-l-rust' : ''}`} onClick={(e) => e.stopPropagation()}>
                                                                    <TableCell className="pl-8 text-sand font-mono text-xs whitespace-nowrap">
                                                                        └ Alım #{group.length - batchIdx}
                                                                    </TableCell>
                                                                    <TableCell />
                                                                    <TableCell className="text-sand whitespace-nowrap">
                                                                        {formatDate(material.created_at)}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <div className="flex items-center justify-end gap-1">
                                                                            <Input
                                                                                type="number"
                                                                                step="0.01"
                                                                                defaultValue={Number(getFieldValue(material, 'stock'))}
                                                                                onChange={(e) => updateField(material.id, 'stock', parseFloat(e.target.value) || 0)}
                                                                                className="bg-paper border-hairline text-ink h-8 w-20 text-right focus:border-rust"
                                                                            />
                                                                            <span className="text-sand text-xs">{material.unit}</span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            defaultValue={Number(getFieldValue(material, 'initial_stock')) || ''}
                                                                            onChange={(e) => updateField(material.id, 'initial_stock', parseFloat(e.target.value) || 0)}
                                                                            className="bg-paper border-hairline text-ink h-8 w-20 text-right focus:border-rust"
                                                                            placeholder="—"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            defaultValue={Number(getFieldValue(material, 'total_cost')) || ''}
                                                                            onChange={(e) => updateField(material.id, 'total_cost', parseFloat(e.target.value) || 0)}
                                                                            className="bg-paper border-hairline text-ink h-8 w-24 text-right focus:border-rust"
                                                                            placeholder="₺"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Input
                                                                            defaultValue={String(getFieldValue(material, 'supplier') || '')}
                                                                            onChange={(e) => updateField(material.id, 'supplier', e.target.value || null)}
                                                                            className="bg-paper border-hairline text-ink h-8 w-32 focus:border-rust"
                                                                            placeholder="—"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="text-right whitespace-nowrap">
                                                                        <Button variant="ghost" size="sm" onClick={() => cancelEditing(material.id)} className="text-sand hover:text-ink" title="Cancel">
                                                                            <X className="w-4 h-4" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(material.id)} className="text-rust hover:text-rust/80" title="Delete">
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        }

                                                        return (
                                                            <TableRow key={material.id} className="border-hairline pl-8 bg-paper hover:bg-ink/5" onClick={(e) => e.stopPropagation()}>
                                                                <TableCell className="pl-8 text-sand font-mono text-xs whitespace-nowrap">
                                                                    └ Alım #{group.length - batchIdx}
                                                                </TableCell>
                                                                <TableCell />
                                                                <TableCell className="text-sand whitespace-nowrap text-sm">
                                                                    {formatDate(material.created_at)}
                                                                </TableCell>
                                                                <TableCell className="text-right text-ink whitespace-nowrap">
                                                                    {material.stock.toLocaleString()} {material.unit}
                                                                </TableCell>
                                                                <TableCell className="text-right text-sand whitespace-nowrap">
                                                                    {material.initial_stock ? `${material.initial_stock.toLocaleString()} ${material.unit}` : '—'}
                                                                </TableCell>
                                                                <TableCell className="text-right text-sand whitespace-nowrap">
                                                                    {material.total_cost ? `₺${material.total_cost.toLocaleString()}` : '-'}
                                                                    {material.total_cost && material.initial_stock ? (
                                                                        <div className="text-xs text-moss font-semibold">
                                                                            ₺{(material.total_cost / material.initial_stock).toFixed(2)}/{material.unit}
                                                                        </div>
                                                                    ) : null}
                                                                </TableCell>
                                                                <TableCell className="text-sand max-w-xs truncate">{material.supplier || '-'}</TableCell>
                                                                <TableCell className="text-right whitespace-nowrap">
                                                                    <Button variant="ghost" size="sm" onClick={() => startEditing(material.id)} className="text-sand hover:text-ink" title="Edit">
                                                                        <Pencil className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(material.id)} className="text-rust hover:text-rust/80" title="Delete">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </React.Fragment>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card Layout (hidden on desktop) */}
                            <div className="grid grid-cols-1 gap-4 md:hidden p-4">
                                {groupedMaterials.map((group) => {
                                    const firstMaterial = group[0]
                                    const isGrouped = group.length > 1
                                    const isExpanded = expandedNames.has(firstMaterial.name.trim().toLowerCase())

                                    const totalStock = group.reduce((sum, m) => sum + m.stock, 0)
                                    const totalInitialStock = group.reduce((sum, m) => sum + (m.initial_stock || m.stock), 0)
                                    const totalCost = group.reduce((sum, m) => sum + (m.total_cost || 0), 0)

                                    if (!isGrouped) {
                                        const material = firstMaterial
                                        const isEditing = editingRows.has(material.id)
                                        const isModified = editedData.has(material.id)

                                        return (
                                            <Card key={material.id} className={`bg-paper border border-hairline ${isModified ? 'border-l-2 border-l-rust' : ''}`}>
                                                <CardContent className="p-4 space-y-3">
                                                    {isEditing ? (
                                                        <>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="text-xs text-sand">Name</label>
                                                                    <Input
                                                                        defaultValue={String(getFieldValue(material, 'name'))}
                                                                        onChange={(e) => updateField(material.id, 'name', e.target.value)}
                                                                        className="bg-paper border-hairline text-ink h-8 text-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-sand">Stock ({material.unit})</label>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        defaultValue={Number(getFieldValue(material, 'stock'))}
                                                                        onChange={(e) => updateField(material.id, 'stock', parseFloat(e.target.value) || 0)}
                                                                        className="bg-paper border-hairline text-ink h-8 text-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-sand">İlk Alım ({material.unit})</label>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        defaultValue={Number(getFieldValue(material, 'initial_stock')) || ''}
                                                                        onChange={(e) => updateField(material.id, 'initial_stock', parseFloat(e.target.value) || 0)}
                                                                        className="bg-paper border-hairline text-ink h-8 text-sm"
                                                                        placeholder="—"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-xs text-sand">Maliyet (₺)</label>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        defaultValue={Number(getFieldValue(material, 'total_cost')) || ''}
                                                                        onChange={(e) => updateField(material.id, 'total_cost', parseFloat(e.target.value) || 0)}
                                                                        className="bg-paper border-hairline text-ink h-8 text-sm"
                                                                        placeholder="₺"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                                                                <Button variant="ghost" size="sm" onClick={() => cancelEditing(material.id)} className="text-sand hover:text-ink h-8">
                                                                    <X className="w-4 h-4 mr-1" />
                                                                    İptal
                                                                </Button>
                                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(material.id)} className="text-rust hover:text-rust/80 h-8">
                                                                    <Trash2 className="w-4 h-4 mr-1" />
                                                                    Sil
                                                                </Button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <h3 className="font-semibold text-ink">{material.name}</h3>
                                                                    <div className="mt-1 flex items-center gap-2">
                                                                        <Badge variant="outline" className={getTypeColor(material.type)}>
                                                                            {material.type}
                                                                        </Badge>
                                                                        <span className="text-[10px] text-sand">{formatDate(material.created_at)}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-semibold text-ink">
                                                                        {material.stock.toLocaleString()} {material.unit}
                                                                    </div>
                                                                    <div className="text-xs text-sand">
                                                                        {material.total_cost ? `₺${material.total_cost.toLocaleString()}` : 'Maliyet yok'}
                                                                        {material.total_cost && material.initial_stock ? (
                                                                            <span className="text-moss ml-1 font-semibold">
                                                                                (₺{(material.total_cost / material.initial_stock).toFixed(2)}/{material.unit})
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {material.supplier && (
                                                                <div className="text-sm text-sand flex items-center gap-2">
                                                                    <span className="text-sand/70">Tedarikçi:</span>
                                                                    <span className="truncate">{material.supplier}</span>
                                                                </div>
                                                            )}

                                                            <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                                                                <Button variant="ghost" size="sm" onClick={() => startEditing(material.id)} className="text-sand hover:text-ink h-8">
                                                                    <Pencil className="w-4 h-4 mr-2" />
                                                                    Edit
                                                                </Button>
                                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(material.id)} className="text-rust hover:text-rust/80 h-8">
                                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        </>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        )
                                    }

                                    // Grouped cards for mobile
                                    return (
                                        <Card key={firstMaterial.name} className="bg-paper border border-hairline">
                                            <CardContent className="p-4 space-y-3">
                                                <div
                                                    className="flex justify-between items-start cursor-pointer"
                                                    onClick={() => toggleExpand(firstMaterial.name)}
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-1">
                                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-rust" /> : <ChevronRight className="w-4 h-4 text-sand" />}
                                                            <h3 className="font-semibold text-ink">{firstMaterial.name}</h3>
                                                        </div>
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <Badge variant="outline" className={getTypeColor(firstMaterial.type)}>
                                                                {firstMaterial.type}
                                                            </Badge>
                                                            <Badge variant="outline" className="text-rust border-rust/20 bg-rust/5 text-[10px] py-0 px-1 font-normal">
                                                                {group.length} Alım
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-semibold text-ink">
                                                            {totalStock.toLocaleString()} {firstMaterial.unit}
                                                        </div>
                                                        <div className="text-xs text-sand">
                                                            {totalCost ? `₺${totalCost.toLocaleString()}` : 'Maliyet yok'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className="pt-3 border-t border-hairline space-y-3 pl-2 border-l-2 border-l-rust/30">
                                                        {group.map((material, batchIdx) => {
                                                            const isEditing = editingRows.has(material.id)
                                                            const isModified = editedData.has(material.id)

                                                            return (
                                                                <div key={material.id} className="text-xs space-y-2 bg-sand/5 p-2 rounded">
                                                                    {isEditing ? (
                                                                        <div className="space-y-2">
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                <div>
                                                                                    <label className="text-[10px] text-sand">Stok</label>
                                                                                    <Input
                                                                                        type="number"
                                                                                        step="0.01"
                                                                                        defaultValue={Number(getFieldValue(material, 'stock'))}
                                                                                        onChange={(e) => updateField(material.id, 'stock', parseFloat(e.target.value) || 0)}
                                                                                        className="bg-paper border-hairline text-ink h-7 text-xs"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[10px] text-sand">İlk Alım</label>
                                                                                    <Input
                                                                                        type="number"
                                                                                        step="0.01"
                                                                                        defaultValue={Number(getFieldValue(material, 'initial_stock')) || ''}
                                                                                        onChange={(e) => updateField(material.id, 'initial_stock', parseFloat(e.target.value) || 0)}
                                                                                        className="bg-paper border-hairline text-ink h-7 text-xs"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[10px] text-sand">Maliyet (₺)</label>
                                                                                    <Input
                                                                                        type="number"
                                                                                        step="0.01"
                                                                                        defaultValue={Number(getFieldValue(material, 'total_cost')) || ''}
                                                                                        onChange={(e) => updateField(material.id, 'total_cost', parseFloat(e.target.value) || 0)}
                                                                                        className="bg-paper border-hairline text-ink h-7 text-xs"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex justify-end gap-2 pt-1 border-t border-hairline">
                                                                                <Button variant="ghost" size="sm" onClick={() => cancelEditing(material.id)} className="text-sand h-7">
                                                                                    İptal
                                                                                </Button>
                                                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(material.id)} className="text-rust h-7">
                                                                                    Sil
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <div className="flex justify-between items-start">
                                                                                <div>
                                                                                    <span className="font-semibold text-ink">Alım #{group.length - batchIdx}</span>
                                                                                    <span className="text-[10px] text-sand ml-2">({formatDate(material.created_at)})</span>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <span className="font-semibold text-ink">{material.stock.toLocaleString()} {material.unit}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex justify-between text-[11px] text-sand">
                                                                                <span>Maliyet: {material.total_cost ? `₺${material.total_cost.toLocaleString()}` : '—'}</span>
                                                                                {material.total_cost && material.initial_stock && (
                                                                                    <span className="text-moss">₺{(material.total_cost / material.initial_stock).toFixed(2)}/{material.unit}</span>
                                                                                )}
                                                                            </div>
                                                                            {material.supplier && (
                                                                                <div className="text-[11px] text-sand">Tedarikçi: {material.supplier}</div>
                                                                            )}
                                                                            <div className="flex justify-end gap-2 pt-1 border-t border-hairline/40">
                                                                                <Button variant="ghost" size="sm" onClick={() => startEditing(material.id)} className="text-sand h-7 px-1">
                                                                                    Edit
                                                                                </Button>
                                                                                <Button variant="ghost" size="sm" onClick={() => handleDelete(material.id)} className="text-rust h-7 px-1">
                                                                                    Delete
                                                                                </Button>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>

                            {/* Pagination Controls */}
                            {hasMore && (
                                <div className="p-4 border-t border-hairline flex justify-center">
                                    <Button
                                        variant="outline"
                                        onClick={() => setPage(page + 1)}
                                        className="border-hairline text-sand hover:text-ink hover:bg-ink/5"
                                    >
                                        Load More
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* ── Sticky Save Bar ────────────────────────────────── */}
            {hasUnsavedChanges && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-paper/95 backdrop-blur-sm border-t border-rust/30 p-4 shadow-xl">
                    <div className="max-w-screen-xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-rust animate-pulse" />
                            <span className="text-sand text-sm">
                                <strong className="text-ink">{editedData.size}</strong> değişiklik kaydedilmeyi bekliyor
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => { setEditedData(new Map()); setEditingRows(new Set()); }}
                                className="text-sand hover:text-ink"
                            >
                                İptal
                            </Button>
                            <Button
                                onClick={handleSaveAll}
                                disabled={saving}
                                className="bg-rust hover:bg-rust/90 text-paper px-6"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
