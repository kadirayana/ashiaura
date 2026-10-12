'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Product, Recipe, RecipeIngredient, RawMaterial } from '@/types/database'
import { calculateProductionCost } from '@/lib/calculations'
import { Search, Plus, Minus, Edit, Trash2, Camera, Package, Palette, Filter, Settings, X, Save, ChevronDown, ChevronRight, Download, Sparkles } from 'lucide-react'
import { exportToExcel } from '@/lib/excelExport'
import { LeLaboLabelModal, LabelData } from '@/components/label/LeLaboLabelModal'

// ─── Types ────────────────────────────────────────────────────
type RecipeWithIngredients = Recipe & {
    recipe_ingredients: (RecipeIngredient & { raw_material: RawMaterial })[]
}
type ProductWithRecipe = Product & { recipe: RecipeWithIngredients | null }

// Type for tracking inline edits
type EditedProduct = Partial<Pick<Product, 'name' | 'stock' | 'unit_cost' | 'gender'>>

async function optimizeImage(file: File): Promise<{ blob: Blob; extension: string }> {
    const bitmap = await createImageBitmap(file)
    const maxDimension = 1600
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', 0.86)
    )

    if (!blob) {
        return { blob: file, extension: file.name.split('.').pop()?.toLowerCase() || 'jpg' }
    }

    return { blob, extension: 'webp' }
}

// ─── Component ────────────────────────────────────────────────
export default function StockPage() {
    // ─── State ────────────────────────────────────────────────
    const [products, setProducts] = useState<Product[]>([])
    const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [showInStockOnly, setShowInStockOnly] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadingHover, setUploadingHover] = useState(false)
    const [activeTab, setActiveTab] = useState<'inventory' | 'showcase'>('inventory')
    const [page, setPage] = useState(0)
    const [hasMore, setHasMore] = useState(true)
    const PAGE_SIZE = 50
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

    // Le Labo Label Modal state
    const [labelModalOpen, setLabelModalOpen] = useState(false)
    const [generatedLabelData, setGeneratedLabelData] = useState<LabelData | null>(null)

    function openLabelModalForProduct(product: Product) {
        const recipe = recipes.find(r => r.id === product.recipe_id)
        setGeneratedLabelData({
            productId: product.id,
            productName: product.name,
            bottleSizeMl: getSizeMl(product) || product.bottle_size_ml || 50,
            gender: product.gender,
            batchNumber: product.batch_number || `BATCH#${Math.floor(1000 + Math.random() * 9000)}`,
            productionDate: product.production_date || new Date().toISOString().split('T')[0],
            version: recipe?.version || 'v1.0',
            description: product.description || recipe?.description || '',
            topNotes: product.top_notes || '',
            middleNotes: product.middle_notes || '',
            baseNotes: product.base_notes || '',
        })
        setLabelModalOpen(true)
    }

    function getBaseName(name: string) {
        return name.replace(/\s*\d+\s*ml\s*/gi, '').trim()
    }
    function getSizeMl(p: Product): number | null {
        if (p.bottle_size_ml) return p.bottle_size_ml
        const match = p.name.match(/(\d+)\s*ml/i)
        return match ? parseInt(match[1]) : null
    }

    // Inline editing state
    const [editingRows, setEditingRows] = useState<Set<string>>(new Set())
    const [editedData, setEditedData] = useState<Map<string, EditedProduct>>(new Map())
    const [saving, setSaving] = useState(false)

    const hasUnsavedChanges = editedData.size > 0

    const fileInputRef = useRef<HTMLInputElement>(null)
    const hoverFileInputRef = useRef<HTMLInputElement>(null)

    const [formData, setFormData] = useState({
        name: '',
        recipe_id: 'none',
        stock: 0,
        unit_cost: 0,
        image_url: '',
        hover_image_url: '',
        fragrantica_score: '',
        fragrantica_url: '',
        batch_number: '',
        gender: 'kolonya',
        notes: '',
        // ─ Showcase fields ─
        description: '',
        top_notes: '',
        middle_notes: '',
        base_notes: '',
    })

    const supabase = createClient()

    // ─── Data Fetching ────────────────────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
            setPage(0)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    useEffect(() => {
        fetchData(page === 0)
    }, [debouncedSearch, showInStockOnly, page])

    async function fetchData(isNewSearch = false) {
        if (isNewSearch) setLoading(true)

        let query = supabase
            .from('products')
            .select('*', { count: 'exact' })
            .order('stock', { ascending: false })
            .order('name')
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

        if (debouncedSearch) {
            query = query.or(`name.ilike.%${debouncedSearch}%,gender.ilike.%${debouncedSearch}%`)
        }

        if (showInStockOnly) {
            query = query.gt('stock', 0)
        }

        const [productsRes, recipesRes] = await Promise.all([
            query,
            isNewSearch ? supabase.from('recipes').select('*, recipe_ingredients(*, raw_material:raw_materials(*))').eq('is_active', true).order('name') : Promise.resolve({ data: recipes, error: null }),
        ])

        if (productsRes.error) {
            toast.error('Failed to load products')
        } else {
            if (isNewSearch) {
                setProducts(productsRes.data || [])
            } else {
                setProducts(prev => {
                    const existingIds = new Set(prev.map(p => p.id))
                    const newItems = (productsRes.data || []).filter(p => !existingIds.has(p.id))
                    return [...prev, ...newItems]
                })
            }
            setHasMore(productsRes.count !== null && (page + 1) * PAGE_SIZE <= productsRes.count)
        }

        if (recipesRes.data) {
            setRecipes(recipesRes.data)
        }
        if (isNewSearch) setLoading(false)
    }

    // ─── Filtering ────────────────────────────────────────────
    // Client-side filtering removed in favor of scalable server-side querying

    // ─── Form Helpers ─────────────────────────────────────────
    function resetForm() {
        setFormData({
            name: '', recipe_id: 'none', stock: 0, unit_cost: 0,
            image_url: '', hover_image_url: '',
            fragrantica_score: '', fragrantica_url: '',
            batch_number: '', gender: 'kolonya', notes: '',
            description: '', top_notes: '', middle_notes: '', base_notes: '',
        })
        setEditingProduct(null)
        setActiveTab('inventory')
    }

    function openEditDialog(product: Product) {
        setEditingProduct(product)
        // Auto-calculate unit_cost from recipe if product has no manual cost
        let effectiveCost = product.unit_cost || 0
        if (!effectiveCost && product.recipe_id) {
            const recipe = recipes.find(r => r.id === product.recipe_id)
            if (recipe?.recipe_ingredients) {
                const calcCost = calculateProductionCost(
                    recipe.recipe_ingredients,
                    recipe.bottle_size_ml || 50,
                    1
                )
                effectiveCost = Number(calcCost.toFixed(2))
            }
        }
        setFormData({
            name: product.name,
            recipe_id: product.recipe_id || 'none',
            stock: product.stock,
            unit_cost: effectiveCost,
            image_url: product.image_url || '',
            hover_image_url: product.hover_image_url || '',
            fragrantica_score: product.fragrantica_score?.toString() || '',
            fragrantica_url: product.fragrantica_url || '',
            batch_number: product.batch_number || '',
            gender: product.gender || 'kolonya',
            notes: product.notes || '',
            description: product.description || '',
            top_notes: product.top_notes || '',
            middle_notes: product.middle_notes || '',
            base_notes: product.base_notes || '',
        })
        setActiveTab('inventory')
        setDialogOpen(true)
    }

    // ─── Image Upload ─────────────────────────────────────────
    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'main' | 'hover') {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return }
        if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB'); return }

        type === 'main' ? setUploading(true) : setUploadingHover(true)

        try {
            const optimized = await optimizeImage(file)
            const fileName = `${Date.now()}-${type === 'hover' ? 'hover-' : ''}${Math.random().toString(36).substring(7)}.${optimized.extension}`
            const filePath = `products/${fileName}`

            const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, optimized.blob, {
                contentType: optimized.blob.type || file.type,
                upsert: false,
            })
            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath)

            if (type === 'main') {
                setFormData(prev => ({ ...prev, image_url: publicUrl }))
            } else {
                setFormData(prev => ({ ...prev, hover_image_url: publicUrl }))
            }
            toast.success(`${type === 'main' ? 'Main' : 'Hover'} image uploaded!`)
        } catch (error) {
            console.error('Upload error:', error)
            toast.error('Failed to upload image.')
        } finally {
            type === 'main' ? setUploading(false) : setUploadingHover(false)
        }
    }

    // ─── Submit (Create / Update) ─────────────────────────────
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (submitting) return
        setSubmitting(true)

        const productData = {
            name: formData.name,
            recipe_id: formData.recipe_id === 'none' ? null : formData.recipe_id,
            stock: formData.stock,
            unit_cost: formData.unit_cost,
            image_url: formData.image_url || null,
            hover_image_url: formData.hover_image_url || null,
            fragrantica_score: formData.fragrantica_score ? Number(Number(formData.fragrantica_score).toFixed(2)) : null,
            fragrantica_url: formData.fragrantica_url || null,
            batch_number: formData.batch_number || null,
            gender: formData.gender as Product['gender'],
            notes: formData.notes || null,
            description: formData.description || null,
            top_notes: formData.top_notes || null,
            middle_notes: formData.middle_notes || null,
            base_notes: formData.base_notes || null,
        }

        try {
            if (editingProduct) {
                const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id)
                if (error) throw error

                // Propagate main image to all variants in the same product family
                if (productData.image_url && editingProduct.recipe_id) {
                    await supabase
                        .from('products')
                        .update({ image_url: productData.image_url })
                        .eq('recipe_id', editingProduct.recipe_id)
                        .is('image_url', null)  // Only update variants that don't have their own image
                }

                setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p))
                toast.success('Product updated!')
            } else {
                const cleanProdName = productData.name.trim()
                const { data: existingProds } = await supabase
                    .from('products')
                    .select('*')
                    .ilike('name', cleanProdName)
                    .limit(1)

                if (existingProds && existingProds.length > 0) {
                    const existing = existingProds[0]
                    const newStock = (existing.stock || 0) + (productData.stock || 0)
                    const updatedCost = (productData.unit_cost && productData.unit_cost > 0) ? productData.unit_cost : existing.unit_cost

                    const { error: updateErr } = await supabase.from('products').update({
                        stock: newStock,
                        unit_cost: updatedCost,
                        updated_at: new Date().toISOString(),
                    }).eq('id', existing.id)

                    if (updateErr) throw updateErr

                    toast.success(`Mevcut "${existing.name}" ürününe stok eklendi! Yeni stok: ${newStock}`)
                    fetchData()
                } else {
                    const { data: newProduct, error } = await supabase.from('products').insert({
                        ...productData,
                        name: cleanProdName,
                        production_date: new Date().toISOString().split('T')[0],
                    }).select().single()

                    if (error) throw error

                    setProducts(prev => [newProduct, ...prev])
                    toast.success('Product added!')
                }
            }
            setDialogOpen(false)
            resetForm()
        } catch (error: any) {
            console.error('Supabase error:', error?.message || error?.details || JSON.stringify(error))
            toast.error(error?.message || (editingProduct ? 'Failed to update product' : 'Failed to add product'))
        } finally {
            setSubmitting(false)
        }
    }

    // ─── Delete ───────────────────────────────────────────────
    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this product?')) return
        const { error } = await supabase.from('products').delete().eq('id', id)
        if (error) {
            toast.error('Cannot delete product. It may have sales records.')
        } else {
            toast.success('Product deleted')
            setProducts(prev => prev.filter(p => p.id !== id))
            cancelEditing(id)
        }
    }

    // ─── Quick Stock Adjust (Mobile) ──────────────────────────
    async function adjustStock(id: string, currentStock: number, adjustment: number) {
        const newStock = currentStock + adjustment
        if (newStock < 0) { toast.error('Stock cannot be negative'); return }
        const { error } = await supabase.rpc('adjust_product_stock', {
            p_product_id: id,
            p_adjustment: adjustment,
            p_unit_cost: 0,
            p_lot_no: `MANUAL-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`,
        })
        if (error) {
            toast.error(error.message || 'Failed to adjust stock')
            return
        }
        setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p))
    }

    // ─── Inline Editing ────────────────────────────────────────
    function startEditing(productId: string) {
        setEditingRows(prev => new Set(prev).add(productId))
    }

    function cancelEditing(productId: string) {
        setEditingRows(prev => {
            const next = new Set(prev)
            next.delete(productId)
            return next
        })
        setEditedData(prev => {
            const next = new Map(prev)
            next.delete(productId)
            return next
        })
    }

    function updateField(productId: string, field: keyof EditedProduct, value: any) {
        setEditedData(prev => {
            const next = new Map(prev)
            const current = next.get(productId) || {}
            next.set(productId, { ...current, [field]: value })
            return next
        })
    }

    function getFieldValue(product: Product, field: keyof EditedProduct) {
        const edited = editedData.get(product.id)
        if (edited && field in edited) return edited[field]
        return product[field]
    }

    // ─── Batch Save ────────────────────────────────────────────
    async function handleSaveAll() {
        if (editedData.size === 0) return
        setSaving(true)

        try {
            const updates = Array.from(editedData.entries())
            let successCount = 0
            let errorCount = 0
            const successfulIds = new Set<string>()

            for (const [productId, changes] of updates) {
                const product = products.find(p => p.id === productId)
                if (!product) continue

                const { error } = await supabase
                    .from('products')
                    .update(changes)
                    .eq('id', productId)

                if (error) {
                    errorCount++
                    console.error(`Failed to update ${product.name}:`, error)
                } else {
                    successCount++
                    successfulIds.add(productId)
                    // Optimistic update
                    setProducts(prev => prev.map(p =>
                        p.id === productId ? { ...p, ...changes } : p
                    ))
                }
            }

            if (successCount > 0) {
                toast.success(`${successCount} ürün güncellendi`)
            }
            if (errorCount > 0) {
                toast.error(`${errorCount} ürün güncellenemedi`)
            }

            // Clear editing state only for successful saves
            setEditedData(prev => {
                const next = new Map(prev)
                for (const id of successfulIds) next.delete(id)
                return next
            })
            setEditingRows(prev => {
                const next = new Set(prev)
                for (const id of successfulIds) next.delete(id)
                return next
            })
        } finally {
            setSaving(false)
        }
    }

    // ─── Tab Button Component ─────────────────────────────────
    const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab; label: string; icon: React.ElementType }) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex-1 pb-3 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === id
                ? 'border-rust text-rust'
                : 'border-transparent text-sand hover:text-ink'
                }`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    )

    async function handleExportExcel() {
        toast.loading('Supabase veritabanından tüm ürün stokları çekiliyor...', { id: 'excel-export' })
        const { data: allProducts, error } = await supabase
            .from('products')
            .select('*, recipe:recipes(name)')
            .order('name')

        if (error || !allProducts || allProducts.length === 0) {
            toast.error('Aktarılacak ürün kaydı bulunamadı.', { id: 'excel-export' })
            return
        }

        const excelData = allProducts.map(p => {
            const stockVal = p.stock || 0
            const unitCostVal = p.unit_cost || 0
            return {
                'Ürün Adı': p.name,
                'Reçete': p.recipe?.name || '-',
                'Stok Miktarı (Adet)': stockVal,
                'Şişe Hacmi (ml)': p.bottle_size_ml || '-',
                'Ürün Birim Maliyeti (₺)': unitCostVal ? Number(unitCostVal.toFixed(2)) : 0,
                'Toplam Stok Maliyeti (₺)': Number((stockVal * unitCostVal).toFixed(2)),
                'Kategori / Cinsiyet': p.gender === 'men' ? 'Erkek' : p.gender === 'women' ? 'Kadın' : p.gender === 'unisex' ? 'Unisex' : 'Kolonya',
                'Fragrantica Puanı': p.fragrantica_score || '-',
                'Parti No': p.batch_number || '-',
                'Üretim Tarihi': p.production_date || '-',
                'Notlar': p.notes || '-'
            }
        })
        exportToExcel(excelData, 'Urunler_Ve_Stok_Dokumu.xlsx', 'Ürün Stokları')
        toast.success(`${allProducts.length} adet ürün dökümü Supabase DB'den indirildi!`, { id: 'excel-export' })
    }

    // ─── Render ───────────────────────────────────────────────
    return (
        <div className="space-y-6 pb-20 md:pb-0">
            {/* ═══ HEADER ═══ */}
            <div className="bg-paper border-b border-hairline pb-4 flex flex-col lg:flex-row gap-3 sm:gap-4 justify-between items-stretch lg:items-center">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap flex-1">
                    <div>
                        <h1 className="text-2xl font-bold text-ink">Catalog & Stock</h1>
                    </div>
                    <Button variant="outline" onClick={handleExportExcel} className="border-hairline text-ink hover:bg-ink/5 text-xs sm:text-sm h-9 w-fit">
                        <Download className="w-4 h-4 mr-1.5 sm:mr-2" />
                        Excel'e Aktar
                    </Button>
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sand" />
                        <Input
                            placeholder="Ürün ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-paper border-hairline text-ink w-full h-9 text-xs sm:text-sm"
                        />
                    </div>
                    {/* ─ In Stock Only Toggle ─ */}
                    <label className="flex items-center gap-2 cursor-pointer select-none group w-fit">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={showInStockOnly}
                                onChange={(e) => setShowInStockOnly(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-8 h-5 bg-hairline rounded-full peer-checked:bg-moss transition-colors" />
                            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-3" />
                        </div>
                        <span className="text-xs sm:text-sm text-sand group-hover:text-ink transition-colors flex items-center gap-1.5">
                            <Filter className="w-3.5 h-3.5" />
                            Sadece Stoktakiler
                        </span>
                    </label>
                </div>
                <div className="w-full lg:w-auto">
                    <Button onClick={() => { resetForm(); setDialogOpen(true) }} className="w-full sm:w-auto bg-ink text-paper hover:bg-rust h-9 text-xs sm:text-sm">
                        <Plus className="w-4 h-4 mr-1.5 sm:mr-2" /> Add Product
                    </Button>
                </div>
            </div>

            {/* ═══ DESKTOP TABLE ═══ */}
            <div className="hidden md:block">
                <Card className="bg-paper border-hairline">
                    <CardContent className="p-0 overflow-x-auto custom-scrollbar">
                        <Table className="min-w-[850px]">
                            <TableHeader>
                                <TableRow className="border-hairline hover:bg-ink/5">
                                    <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Image</TableHead>
                                    <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Name</TableHead>
                                    <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Boyut</TableHead>
                                    <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Category</TableHead>
                                    <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Rating</TableHead>
                                    <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Stock</TableHead>
                                    <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap">Cost</TableHead>
                                    <TableHead className="text-sand font-storefront-mono text-xs tracking-wide whitespace-nowrap text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-sand">Loading...</TableCell></TableRow>
                                ) : products.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-sand">No products found.</TableCell></TableRow>
                                ) : (() => {
                                    // Group products by base name
                                    const groups = new Map<string, Product[]>()
                                    for (const p of products) {
                                        const key = getBaseName(p.name)
                                        if (!groups.has(key)) groups.set(key, [])
                                        groups.get(key)!.push(p)
                                    }
                                    // Sort groups: groups with stock first, then alphabetically
                                    const sortedGroups = Array.from(groups.entries()).sort(([, a], [, b]) => {
                                        const stockA = a.reduce((s, p) => s + p.stock, 0)
                                        const stockB = b.reduce((s, p) => s + p.stock, 0)
                                        if (stockA > 0 && stockB === 0) return -1
                                        if (stockA === 0 && stockB > 0) return 1
                                        return 0
                                    })

                                    return sortedGroups.flatMap(([baseName, groupProducts]) => {
                                        const isMultiVariant = groupProducts.length > 1
                                        const isCollapsed = collapsedGroups.has(baseName)
                                        const totalStock = groupProducts.reduce((s, p) => s + p.stock, 0)

                                        const rows: React.ReactNode[] = []

                                        // Group header for multi-variant products
                                        if (isMultiVariant) {
                                            rows.push(
                                                <TableRow
                                                    key={`group-${baseName}`}
                                                    className="border-hairline bg-ink/[0.03] cursor-pointer hover:bg-ink/5"
                                                    onClick={() => {
                                                        setCollapsedGroups(prev => {
                                                            const next = new Set(prev)
                                                            if (next.has(baseName)) next.delete(baseName)
                                                            else next.add(baseName)
                                                            return next
                                                        })
                                                    }}
                                                >
                                                    <TableCell colSpan={1} className="py-2">
                                                        {isCollapsed ? <ChevronRight className="w-4 h-4 text-sand" /> : <ChevronDown className="w-4 h-4 text-sand" />}
                                                    </TableCell>
                                                    <TableCell colSpan={2} className="py-2 font-semibold text-rust">
                                                        {baseName}
                                                        <span className="text-sand text-xs ml-2">({groupProducts.length} varyant)</span>
                                                    </TableCell>
                                                    <TableCell colSpan={2} />
                                                    <TableCell className="py-2">
                                                        <span className={`font-mono font-bold ${totalStock < 5 ? 'text-red-400' : 'text-moss'}`}>
                                                            Toplam: {totalStock}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell colSpan={2} />
                                                </TableRow>
                                            )
                                        }

                                        // Product rows (skip if collapsed)
                                        if (!isMultiVariant || !isCollapsed) {
                                            // Sort variants by size
                                            const sorted = [...groupProducts].sort((a, b) => (getSizeMl(a) || 0) - (getSizeMl(b) || 0))
                                            for (const product of sorted) {
                                                const isEditing = editingRows.has(product.id);
                                                const isModified = editedData.has(product.id);

                                                if (isEditing) {
                                                    rows.push(
                                                        <TableRow key={product.id} className={`border-hairline ${isModified ? 'bg-rust/5 border-l-2 border-l-rust' : 'hover:bg-ink/5'}`}>
                                                            <TableCell>
                                                                <div className="w-10 h-10 rounded-lg bg-ink/10 overflow-hidden">
                                                                    {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sand"><Camera className="w-4 h-4" /></div>}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    defaultValue={String(getFieldValue(product, 'name'))}
                                                                    onChange={(e) => updateField(product.id, 'name', e.target.value)}
                                                                    className="bg-paper border-hairline text-ink h-8 w-40"
                                                                />
                                                            </TableCell>
                                                            <TableCell className="whitespace-nowrap">
                                                                <Input
                                                                    type="number"
                                                                    defaultValue={product.bottle_size_ml || ''}
                                                                    onChange={(e) => updateField(product.id, 'bottle_size_ml' as any, parseInt(e.target.value) || null)}
                                                                    className="bg-paper border-hairline text-ink h-8 w-16"
                                                                    placeholder="ml"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Select defaultValue={String(getFieldValue(product, 'gender'))} onValueChange={(v) => updateField(product.id, 'gender', v)}>
                                                                    <SelectTrigger className="bg-paper border-hairline text-ink h-8 w-28">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="bg-paper border-hairline">
                                                                        <SelectItem value="men" className="text-ink">Erkek</SelectItem>
                                                                        <SelectItem value="women" className="text-ink">Kadın</SelectItem>
                                                                        <SelectItem value="unisex" className="text-ink">Unisex</SelectItem>
                                                                        <SelectItem value="kolonya" className="text-ink">Kolonya</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </TableCell>
                                                            <TableCell className="whitespace-nowrap">{product.fragrantica_score && <span className="text-yellow-500 text-sm">★ {product.fragrantica_score}</span>}</TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    step="1"
                                                                    defaultValue={Number(getFieldValue(product, 'stock'))}
                                                                    onChange={(e) => updateField(product.id, 'stock', parseInt(e.target.value) || 0)}
                                                                    className="bg-paper border-hairline text-ink h-8 w-20"
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Input
                                                                    type="number"
                                                                    step="0.01"
                                                                    defaultValue={Number(getFieldValue(product, 'unit_cost')) || ''}
                                                                    onChange={(e) => updateField(product.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                                                                    className="bg-paper border-hairline text-ink h-8 w-24"
                                                                    placeholder="₺"
                                                                />
                                                            </TableCell>
                                                            <TableCell className="text-right whitespace-nowrap">
                                                                <div className="flex justify-end gap-1">
                                                                    <Button size="sm" variant="ghost" className="h-8 text-sand hover:text-ink" onClick={() => cancelEditing(product.id)}>
                                                                        <X className="w-4 h-4 mr-1" /> İptal
                                                                    </Button>
                                                                    <Button size="sm" variant="ghost" className="h-8 text-sand hover:text-ink" onClick={() => openEditDialog(product)} title="Gelişmiş Düzenleme">
                                                                        <Settings className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                } else {

                                                    rows.push(
                                                        <TableRow key={product.id} className="border-hairline hover:bg-ink/5">
                                                            <TableCell className="whitespace-nowrap">
                                                                <div className="w-10 h-10 rounded-lg bg-ink/10 overflow-hidden">
                                                                    {product.image_url
                                                                        ? <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                                                        : <div className="w-full h-full flex items-center justify-center text-sand"><Camera className="w-4 h-4" /></div>
                                                                    }
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="font-medium text-ink whitespace-nowrap">
                                                                {isMultiVariant ? (
                                                                    <span className="pl-4 text-ink/70">{product.name}</span>
                                                                ) : (
                                                                    product.name
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="whitespace-nowrap">
                                                                {getSizeMl(product) ? (
                                                                    <span className="text-rust text-sm font-medium">{getSizeMl(product)}ml</span>
                                                                ) : (
                                                                    <span className="text-sand text-sm">—</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="whitespace-nowrap"><Badge variant="outline" className="text-sand border-hairline capitalize">{product.gender}</Badge></TableCell>
                                                            <TableCell className="whitespace-nowrap">{product.fragrantica_score && <span className="text-yellow-500 text-sm">★ {product.fragrantica_score}</span>}</TableCell>
                                                            <TableCell className="whitespace-nowrap"><span className={`font-mono font-bold ${product.stock < 5 ? 'text-red-400' : 'text-moss'}`}>{product.stock}</span></TableCell>
                                                            <TableCell className="whitespace-nowrap">₺{product.unit_cost?.toFixed(2) || '0.00'}</TableCell>
                                                            <TableCell className="text-right whitespace-nowrap">
                                                                <div className="flex justify-end gap-1">
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-sand hover:text-rust" onClick={() => openLabelModalForProduct(product)} title="Le Labo Etiketi Oluştur / 2. Görsel Yap"><Sparkles className="w-4 h-4 text-rust" /></Button>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-sand hover:text-ink" onClick={() => startEditing(product.id)} title="Hızlı Düzenle"><Edit className="w-4 h-4" /></Button>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500/50 hover:text-red-500" onClick={() => handleDelete(product.id)} title="Sil"><Trash2 className="w-4 h-4" /></Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                }
                                            }
                                        }
                                        return rows
                                    })
                                })()}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* ═══ MOBILE LIST ═══ */}
            <div className="md:hidden space-y-3">
                {loading ? (
                    <div className="text-center py-10 text-sand">Yükleniyor...</div>
                ) : products.length === 0 ? (
                    <div className="text-center py-10 text-sand">Ürün bulunamadı.</div>
                ) : (
                    products.map((product) => {
                        const isEditing = editingRows.has(product.id);
                        const isModified = editedData.has(product.id);

                        if (isEditing) {
                            return (
                                <div key={product.id} className={`bg-paper border rounded-xl p-4 flex flex-col gap-3 ${isModified ? 'border-rust' : 'border-hairline'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-ink/10 overflow-hidden">
                                            {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sand"><Camera className="w-5 h-5" /></div>}
                                        </div>
                                        <div className="flex-grow space-y-2">
                                            <Input
                                                defaultValue={String(getFieldValue(product, 'name'))}
                                                onChange={(e) => updateField(product.id, 'name', e.target.value)}
                                                className="bg-paper border-hairline text-ink h-8 text-sm w-full"
                                                placeholder="İsim"
                                            />
                                            <div className="flex gap-2">
                                                <Select defaultValue={String(getFieldValue(product, 'gender'))} onValueChange={(v) => updateField(product.id, 'gender', v)}>
                                                    <SelectTrigger className="bg-paper border-hairline text-ink h-8 w-full text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-paper border-hairline">
                                                        <SelectItem value="men" className="text-ink">Erkek</SelectItem>
                                                        <SelectItem value="women" className="text-ink">Kadın</SelectItem>
                                                        <SelectItem value="unisex" className="text-ink">Unisex</SelectItem>
                                                        <SelectItem value="kolonya" className="text-ink">Kol</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-xs text-sand">Stok</label>
                                            <Input
                                                type="number"
                                                step="1"
                                                defaultValue={Number(getFieldValue(product, 'stock'))}
                                                onChange={(e) => updateField(product.id, 'stock', parseInt(e.target.value) || 0)}
                                                className="bg-paper border-hairline text-ink h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-sand">Maliyet (₺)</label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                defaultValue={Number(getFieldValue(product, 'unit_cost')) || ''}
                                                onChange={(e) => updateField(product.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                                                className="bg-paper border-hairline text-ink h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
                                        <Button variant="ghost" size="sm" onClick={() => cancelEditing(product.id)} className="text-sand hover:text-ink h-8">
                                            <X className="w-4 h-4 mr-1" /> İptal
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(product)} className="text-sand hover:text-ink h-8" title="Gelişmiş Düzenle">
                                            <Settings className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        }

                        return (
                            <div key={product.id} className="bg-paper border border-hairline rounded-xl p-3 flex flex-col gap-3 active:scale-[0.99] transition-transform">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-ink/10 overflow-hidden relative cursor-pointer" onClick={() => startEditing(product.id)}>
                                        {product.image_url
                                            ? <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center text-sand"><Camera className="w-5 h-5" /></div>
                                        }
                                        {product.stock < 5 && <div className="absolute inset-0 border-2 border-red-500/50 rounded-lg" />}
                                    </div>
                                    <div className="flex-grow min-w-0" onClick={() => startEditing(product.id)}>
                                        <h3 className="text-ink font-medium truncate pr-2">{product.name}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-sand capitalize">{product.gender === 'men' ? 'Erkek' : product.gender === 'women' ? 'Kadın' : product.gender === 'kolonya' ? 'Kolonya' : 'Unisex'}</span>
                                            {product.fragrantica_score && <span className="text-xs text-yellow-500/80">★ {product.fragrantica_score}</span>}
                                            <span className="text-xs text-sand ml-auto">₺{product.unit_cost?.toFixed(2) || '0.00'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center gap-2 pt-2 border-t border-hairline">
                                    <div className="flex items-center bg-paper rounded-lg border border-hairline h-9">
                                        <button onClick={() => adjustStock(product.id, product.stock, -1)} className="p-2 min-w-[36px] flex items-center justify-center text-sand hover:text-red-400 active:bg-ink/5 rounded-l-lg transition-colors"><Minus className="w-4 h-4" /></button>
                                        <span className={`w-8 text-center font-mono font-bold text-sm ${product.stock < 5 ? 'text-red-400' : 'text-moss'}`}>{product.stock}</span>
                                        <button onClick={() => adjustStock(product.id, product.stock, 1)} className="p-2 min-w-[36px] flex items-center justify-center text-sand hover:text-moss active:bg-ink/5 rounded-r-lg transition-colors"><Plus className="w-4 h-4" /></button>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-sand" onClick={() => startEditing(product.id)}><Edit className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500/50" onClick={() => handleDelete(product.id)}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* ═══ PAGINATION CONTROLS ═══ */}
            {hasMore && (
                <div className="p-4 flex justify-center mt-4">
                    <Button
                        variant="outline"
                        onClick={() => setPage(page + 1)}
                        className="bg-paper border-hairline text-sand hover:text-ink"
                    >
                        Load More
                    </Button>
                </div>
            )}

            {/* ═══ MOBILE FAB ═══ */}
            <button
                onClick={() => { resetForm(); setDialogOpen(true) }}
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-ink shadow-xl shadow-ink/20 flex items-center justify-center text-paper active:scale-95 transition-transform z-50"
            >
                <Plus className="w-8 h-8" />
            </button>

            {/* ═══ STICKY SAVE BAR ═══ */}
            {hasUnsavedChanges && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-paper/95 backdrop-blur-sm border-t border-ink p-4 shadow-2xl shadow-ink/10">
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
                                className="bg-ink text-paper hover:bg-rust px-6"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                ADD / EDIT PRODUCT DIALOG (TABBED)
            ═══════════════════════════════════════════════════ */}
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
                <DialogContent className="bg-paper border-hairline w-full max-w-[95vw] sm:max-w-lg h-[90vh] flex flex-col p-0 overflow-x-hidden mx-auto">
                    {/* Dialog Header */}
                    <DialogHeader className="px-6 pt-6 pb-3 border-b border-hairline bg-paper">
                        <DialogTitle className="text-ink text-xl">
                            {editingProduct ? 'Edit Product' : 'Add New Product'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                        {/* ─── Tab Navigation ─── */}
                        <div className="flex px-6 pt-3 bg-paper">
                            <TabButton id="inventory" label="Envanter" icon={Package} />
                            <TabButton id="showcase" label="Vitrin Detayları" icon={Palette} />
                        </div>

                        {/* ─── Tab Content (Scrollable) ─── */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">

                            {/* ══════════════ TAB 1: ENVANTER ══════════════ */}
                            {activeTab === 'inventory' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Product Name */}
                                    <div className="space-y-2">
                                        <Label className="text-ink">Product Name</Label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            className="bg-paper border-hairline text-ink"
                                            placeholder="e.g. Summer Rose 50ml"
                                        />
                                    </div>

                                    {/* Stock & Cost & Batch */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-ink">Stock</Label>
                                            <Input
                                                type="number" min="0"
                                                value={formData.stock}
                                                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                                className="bg-paper border-hairline text-ink"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-ink">Birim Maliyeti (₺)</Label>
                                            <Input
                                                type="number" min="0" step="0.01"
                                                value={formData.unit_cost}
                                                onChange={(e) => setFormData({ ...formData, unit_cost: parseFloat(e.target.value) || 0 })}
                                                className="bg-paper border-hairline text-ink"
                                            />
                                            {(() => {
                                                const selectedRecipe = recipes.find(r => r.id === formData.recipe_id)
                                                if (selectedRecipe?.recipe_ingredients) {
                                                    const calcCost = calculateProductionCost(
                                                        selectedRecipe.recipe_ingredients,
                                                        selectedRecipe.bottle_size_ml || 50,
                                                        1
                                                    )
                                                    if (calcCost > 0) {
                                                        return <p className="text-xs text-sand">Reçeteden hesaplanan: ₺{calcCost.toFixed(2)}</p>
                                                    }
                                                }
                                                return null
                                            })()}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-ink">Batch No</Label>
                                            <Input
                                                value={formData.batch_number}
                                                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                                                className="bg-paper border-hairline text-ink"
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>

                                    {/* Gender */}
                                    <div className="space-y-2">
                                        <Label className="text-ink">Gender</Label>
                                        <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                                            <SelectTrigger className="bg-paper border-hairline text-ink">
                                                <SelectValue placeholder="Select Category" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-paper border-hairline">
                                                <SelectItem value="men" className="text-ink">Erkek</SelectItem>
                                                <SelectItem value="women" className="text-ink">Kadın</SelectItem>
                                                <SelectItem value="unisex" className="text-ink">Unisex</SelectItem>
                                                <SelectItem value="kolonya" className="text-ink">Kolonya</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Recipe */}
                                    <div className="space-y-2">
                                        <Label className="text-ink">Recipe</Label>
                                        <Select value={formData.recipe_id} onValueChange={(v) => setFormData({ ...formData, recipe_id: v })}>
                                            <SelectTrigger className="bg-paper border-hairline text-ink"><SelectValue placeholder="Select recipe..." /></SelectTrigger>
                                            <SelectContent className="bg-paper border-hairline">
                                                <SelectItem value="none" className="text-ink">None (Manual Product)</SelectItem>
                                                {recipes.map((r) => (
                                                    <SelectItem key={r.id} value={r.id} className="text-ink">{r.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Image Uploads */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                        {/* Main Image */}
                                        <div className="space-y-2">
                                            <Label className="text-ink text-xs">Ana Görsel</Label>
                                            <div
                                                className="aspect-square rounded-xl border-2 border-dashed border-hairline bg-paper flex items-center justify-center overflow-hidden cursor-pointer hover:border-ink transition-colors relative"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                {formData.image_url
                                                    ? <img src={formData.image_url} className="w-full h-full object-cover" />
                                                    : <div className="text-center p-2"><Camera className="w-6 h-6 text-sand mx-auto" /><span className="text-[10px] text-sand block mt-1">Upload</span></div>
                                                }
                                                {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs">Uploading...</div>}
                                            </div>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'main')} />
                                            {formData.image_url && (
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setFormData(p => ({ ...p, image_url: '' }))} className="text-red-400 hover:text-red-300 w-full text-xs h-7">Remove</Button>
                                            )}
                                        </div>
                                        {/* Hover Image */}
                                        <div className="space-y-2">
                                            <Label className="text-ink text-xs">Hover Görseli</Label>
                                            <div
                                                className="aspect-square rounded-xl border-2 border-dashed border-hairline bg-paper flex items-center justify-center overflow-hidden cursor-pointer hover:border-rust transition-colors relative"
                                                onClick={() => hoverFileInputRef.current?.click()}
                                            >
                                                {formData.hover_image_url
                                                    ? <img src={formData.hover_image_url} className="w-full h-full object-cover" />
                                                    : <div className="text-center p-2"><Camera className="w-6 h-6 text-sand mx-auto" /><span className="text-[10px] text-sand block mt-1">Upload</span></div>
                                                }
                                                {uploadingHover && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs">Uploading...</div>}
                                            </div>
                                            <input type="file" ref={hoverFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'hover')} />
                                            {formData.hover_image_url && (
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setFormData(p => ({ ...p, hover_image_url: '' }))} className="text-red-400 hover:text-red-300 w-full text-xs h-7">Remove</Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ══════════════ TAB 2: VİTRİN DETAYLARI ══════════════ */}
                            {activeTab === 'showcase' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Description */}
                                    <div className="space-y-2">
                                        <Label className="text-ink">Hikaye / Açıklama</Label>
                                        <Textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="bg-paper border-hairline text-ink min-h-[120px] resize-y"
                                            placeholder="Parfümün hikayesini buraya yazın..."
                                        />
                                    </div>

                                    {/* Scent Profile */}
                                    <div className="space-y-4 border-t border-hairline pt-4">
                                        <h3 className="text-sm font-semibold text-sand uppercase tracking-wider">Koku Profili</h3>
                                        <div className="space-y-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-rust font-medium">Üst Notalar (Top Notes)</Label>
                                                <Input
                                                    value={formData.top_notes}
                                                    onChange={(e) => setFormData({ ...formData, top_notes: e.target.value })}
                                                    className="bg-paper border-hairline text-ink"
                                                    placeholder="örn. Bergamot, Limon, Portakal"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-rust/70 font-medium">Orta Notalar (Middle Notes)</Label>
                                                <Input
                                                    value={formData.middle_notes}
                                                    onChange={(e) => setFormData({ ...formData, middle_notes: e.target.value })}
                                                    className="bg-paper border-hairline text-ink"
                                                    placeholder="örn. Gül, Yasemin, Lavanta"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-sand font-medium">Alt Notalar (Base Notes)</Label>
                                                <Input
                                                    value={formData.base_notes}
                                                    onChange={(e) => setFormData({ ...formData, base_notes: e.target.value })}
                                                    className="bg-paper border-hairline text-ink"
                                                    placeholder="örn. Oud, Vanilya, Sandal Ağacı"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fragrantica & Internal Notes */}
                                    <div className="space-y-4 border-t border-hairline pt-4">
                                        <h3 className="text-sm font-semibold text-sand uppercase tracking-wider">Fragrantica</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-ink text-xs">Puan (0-5)</Label>
                                                <Input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={formData.fragrantica_score}
                                                    onChange={(e) => {
                                                        const val = e.target.value
                                                        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
                                                            setFormData({ ...formData, fragrantica_score: val })
                                                        }
                                                    }}
                                                    className="bg-paper border-hairline text-ink"
                                                    placeholder="örn. 3.85"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-ink text-xs">URL</Label>
                                                <Input
                                                    value={formData.fragrantica_url}
                                                    onChange={(e) => setFormData({ ...formData, fragrantica_url: e.target.value })}
                                                    className="bg-paper border-hairline text-ink"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-ink text-xs">Dahili Notlar (Sadece Admin Görebilir)</Label>
                                            <Input
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                className="bg-paper border-hairline text-ink"
                                                placeholder="Kendi notlarınız..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─── Footer ─── */}
                        <div className="px-6 py-4 border-t border-hairline bg-paper flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); resetForm() }} className="text-sand hover:text-ink">
                                İptal
                            </Button>
                            <Button type="submit" className="bg-ink text-paper hover:bg-rust min-w-[130px]" disabled={uploading || uploadingHover || submitting}>
                                {submitting ? 'İşleniyor...' : (editingProduct ? 'Güncelle' : 'Oluştur')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Le Labo Label Modal */}
            <LeLaboLabelModal
                open={labelModalOpen}
                onOpenChange={setLabelModalOpen}
                data={generatedLabelData}
                onSuccess={() => fetchData(true)}
            />
        </div>
    )
}
