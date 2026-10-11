'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown, Download, Search } from "lucide-react"
import { exportToExcel } from '@/lib/excelExport'
import { cn } from "@/lib/utils"
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import type { Recipe, RawMaterial, RecipeIngredient, QuantityType } from '@/types/database'
import { SuggestedFormulationsTab } from '@/components/recipes/SuggestedFormulationsTab'

type RecipeWithIngredients = Recipe & {
    recipe_ingredients: (RecipeIngredient & { raw_material: RawMaterial })[]
}

type IngredientEntry = {
    material_id: string
    quantity_type: QuantityType
    quantity: number
}

function MaterialCombobox({
    materials,
    value,
    onChange,
    usedMaterialIds = []
}: {
    materials: RawMaterial[]
    value: string
    onChange: (value: string) => void
    usedMaterialIds?: string[]
}) {
    const [open, setOpen] = useState(false)
    const selectedMaterial = materials.find((m) => m.id === value)
    const availableMaterials = useMemo(() => materials.filter(m => m.id === value || !usedMaterialIds.includes(m.id)), [materials, value, usedMaterialIds])
    const uniqueAvailableMaterials = useMemo(() => {
        const map = new Map<string, RawMaterial>()
        availableMaterials.forEach(m => {
            const key = m.name.trim().toLowerCase()
            // Prefer the lot with the most stock (active lot over depleted old lots)
            const existing = map.get(key)
            if (!existing || m.stock > existing.stock) {
                map.set(key, m)
            }
        })
        return Array.from(map.values())
    }, [availableMaterials])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="flex-1 justify-between bg-paper border-hairline text-ink hover:bg-ink/5 hover:text-ink"
                >
                    {selectedMaterial ? selectedMaterial.name : "Select material..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] max-w-[400px] p-0 bg-paper border-hairline">
                <Command className="bg-paper text-ink">
                    <CommandInput placeholder="Search material..." className="text-ink placeholder:text-sand" />
                    <CommandList>
                        <CommandEmpty>No material found.</CommandEmpty>
                        <CommandGroup>
                            {uniqueAvailableMaterials.map((material) => (
                                <CommandItem
                                    key={material.id}
                                    value={material.name}
                                    onSelect={() => {
                                        onChange(material.id)
                                        setOpen(false)
                                    }}
                                    className="text-ink hover:bg-ink/5 aria-selected:bg-ink/5 data-[selected='true']:bg-ink/5 cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === material.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {material.name}
                                    <span className="ml-2 text-sand text-xs">({material.type})</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

export default function RecipesPage() {
    const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([])
    const [materials, setMaterials] = useState<RawMaterial[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingRecipe, setEditingRecipe] = useState<RecipeWithIngredients | null>(null)
    const [isMounted, setIsMounted] = useState(false)
    const [activeTab, setActiveTab] = useState<'system' | 'suggested'>('system')
    const [searchQuery, setSearchQuery] = useState('')

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        bottle_size_ml: '' as string | number,
        gender: '' as string,
        version: 'v1.0',
        revision_notes: '',
        is_new_revision: false,
        is_active: true,
    })
    const [ingredients, setIngredients] = useState<IngredientEntry[]>([])

    const supabase = createClient()

    useEffect(() => {
        setIsMounted(true)
        fetchData()
    }, [])

    async function fetchData() {
        setLoading(true)

        const [recipesRes, materialsRes] = await Promise.all([
            supabase
                .from('recipes')
                .select(`
          *,
          recipe_ingredients (
            *,
            raw_material:raw_materials (*)
          )
        `)
                .order('name'),
            supabase.from('raw_materials').select('*').order('name'),
        ])

        if (recipesRes.error) {
            toast.error('Failed to load recipes')
        } else {
            setRecipes(recipesRes.data || [])
        }

        if (materialsRes.error) {
            toast.error('Failed to load materials')
        } else {
            setMaterials(materialsRes.data || [])
        }

        setLoading(false)
    }

    function resetForm() {
        setFormData({
            name: '',
            description: '',
            bottle_size_ml: '',
            gender: '',
            version: 'v1.0',
            revision_notes: '',
            is_new_revision: false,
            is_active: true,
        })
        setIngredients([])
        setEditingRecipe(null)
    }

    function bumpVersion(currentVer?: string | null): string {
        if (!currentVer) return 'v1.1'
        const match = currentVer.match(/v?(\d+)\.(\d+)/i)
        if (match) {
            const major = parseInt(match[1])
            const minor = parseInt(match[2]) + 1
            return `v${major}.${minor}`
        }
        return 'v1.1'
    }

    function openEditDialog(recipe: RecipeWithIngredients) {
        setEditingRecipe(recipe)
        setFormData({
            name: recipe.name,
            description: recipe.description || '',
            bottle_size_ml: recipe.bottle_size_ml ?? '',
            gender: recipe.gender || '',
            version: recipe.version || 'v1.0',
            revision_notes: recipe.revision_notes || '',
            is_new_revision: false,
            is_active: recipe.is_active,
        })

        // Deduplicate ingredients if legacy data contains duplicates
        const ingMap = new Map<string, IngredientEntry>()
        let hasDuplicates = false
        recipe.recipe_ingredients.forEach((i) => {
            if (ingMap.has(i.material_id)) {
                ingMap.get(i.material_id)!.quantity += i.quantity
                hasDuplicates = true
            } else {
                ingMap.set(i.material_id, {
                    material_id: i.material_id,
                    quantity_type: i.quantity_type,
                    quantity: i.quantity,
                })
            }
        })
        if (hasDuplicates) {
            toast.warning('Bu reçetede tekrarlanan bileşenler tespit edildi ve miktarları toplandı.')
        }
        setIngredients(Array.from(ingMap.values()))
        setDialogOpen(true)
    }

    function addIngredient() {
        if (materials.length === 0) return
        const usedIds = ingredients.map((i) => i.material_id)
        const available = materials.find((m) => !usedIds.includes(m.id))
        if (!available) {
            toast.error('All materials are already added')
            return
        }
        setIngredients([
            ...ingredients,
            { material_id: available.id, quantity_type: 'percentage', quantity: 0 },
        ])
    }

    function removeIngredient(index: number) {
        setIngredients(ingredients.filter((_, i) => i !== index))
    }

    function updateIngredient(index: number, field: keyof IngredientEntry, value: string | number) {
        const updated = [...ingredients]
        updated[index] = { ...updated[index], [field]: value }

        // Auto-set to 'fixed' when a bottle/packaging material is selected
        if (field === 'material_id') {
            const material = materials.find(m => m.id === value)
            if (material && (material.type === 'bottle' || material.type === 'packaging')) {
                updated[index].quantity_type = 'fixed'
            }
        }

        setIngredients(updated)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (submitting) return
        setSubmitting(true)

        if (ingredients.length === 0) {
            toast.error('Please add at least one ingredient')
            setSubmitting(false)
            return
        }

        // Deduplicate ingredients before saving
        const ingMap = new Map<string, IngredientEntry>()
        ingredients.forEach((i) => {
            if (ingMap.has(i.material_id)) {
                ingMap.get(i.material_id)!.quantity += i.quantity
            } else {
                ingMap.set(i.material_id, { ...i })
            }
        })
        const cleanIngredients = Array.from(ingMap.values())

        try {
            const recipePayload = {
                name: formData.name.trim(),
                description: formData.description?.trim() || null,
                bottle_size_ml: formData.bottle_size_ml !== '' ? Number(formData.bottle_size_ml) : null,
                gender: formData.gender || null,
                is_active: formData.is_active,
            }

            if (editingRecipe && formData.is_new_revision) {
                // ── NEW REVISION: create a new recipe row, deactivate the old one ──
                const newVersion = formData.version && formData.version !== editingRecipe.version
                    ? formData.version
                    : bumpVersion(editingRecipe.version)

                const { data: newRecipe, error: revisionError } = await supabase
                    .from('recipes')
                    .insert({
                        ...recipePayload,
                        version: newVersion,
                        revision_notes: formData.revision_notes?.trim() || null,
                        parent_recipe_id: editingRecipe.id,
                        is_active: true,
                    })
                    .select('id')
                    .single()

                if (revisionError) throw revisionError

                // Insert ingredients for the new revision
                const { error: ingredientsError } = await supabase
                    .from('recipe_ingredients')
                    .insert(
                        cleanIngredients.map((i) => ({
                            recipe_id: newRecipe.id,
                            material_id: i.material_id,
                            quantity_type: i.quantity_type,
                            quantity: i.quantity,
                        }))
                    )

                if (ingredientsError) throw ingredientsError

                // Deactivate the old recipe version
                await supabase
                    .from('recipes')
                    .update({ is_active: false, updated_at: new Date().toISOString() })
                    .eq('id', editingRecipe.id)

                toast.success(`Yeni revizyon oluşturuldu: ${newVersion}`)
            } else if (editingRecipe) {
                // ── EDIT IN PLACE ──
                const { error: recipeError } = await supabase
                    .from('recipes')
                    .update({
                        ...recipePayload,
                        version: formData.version || editingRecipe.version,
                        revision_notes: formData.revision_notes?.trim() || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', editingRecipe.id)

                if (recipeError) throw recipeError

                // Delete existing ingredients and insert new ones
                const { error: deleteError } = await supabase
                    .from('recipe_ingredients')
                    .delete()
                    .eq('recipe_id', editingRecipe.id)

                if (deleteError) throw deleteError

                const { error: ingredientsError } = await supabase
                    .from('recipe_ingredients')
                    .insert(
                        cleanIngredients.map((i) => ({
                            recipe_id: editingRecipe.id,
                            material_id: i.material_id,
                            quantity_type: i.quantity_type,
                            quantity: i.quantity,
                        }))
                    )

                if (ingredientsError) throw ingredientsError

                toast.success('Reçete güncellendi')
            } else {
                // ── CREATE NEW ──
                const { data: newRecipe, error: recipeError } = await supabase
                    .from('recipes')
                    .insert({
                        ...recipePayload,
                        version: formData.version || 'v1.0',
                        revision_notes: formData.revision_notes?.trim() || null,
                    })
                    .select('id')
                    .single()

                if (recipeError) throw recipeError

                // Insert ingredients
                const { error: ingredientsError } = await supabase
                    .from('recipe_ingredients')
                    .insert(
                        cleanIngredients.map((i) => ({
                            recipe_id: newRecipe.id,
                            material_id: i.material_id,
                            quantity_type: i.quantity_type,
                            quantity: i.quantity,
                        }))
                    )

                if (ingredientsError) throw ingredientsError

                toast.success('Reçete başarıyla oluşturuldu')
            }

            fetchData()
            setDialogOpen(false)
            resetForm()
        } catch (error: any) {
            console.error('Error saving recipe:', error)
            toast.error(error?.message || 'Reçete kaydedilirken bir hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const filteredRecipes = useMemo(() => {
        if (!searchQuery.trim()) return recipes
        const q = searchQuery.toLowerCase().trim()
        return recipes.filter((r) =>
            r.name.toLowerCase().includes(q) ||
            (r.gender && r.gender.toLowerCase().includes(q)) ||
            (r.description && r.description.toLowerCase().includes(q)) ||
            (r.revision_notes && r.revision_notes.toLowerCase().includes(q)) ||
            (r.version && r.version.toLowerCase().includes(q)) ||
            r.recipe_ingredients?.some((ing) => ing.raw_material?.name?.toLowerCase().includes(q))
        )
    }, [recipes, searchQuery])

    async function handleDelete(id: string) {
        // First check for related data
        const [
            { data: relatedProducts },
            { data: relatedBatches }
        ] = await Promise.all([
            supabase.from('products').select('id, name').eq('recipe_id', id),
            supabase.from('production_batches').select('id, batch_number').eq('recipe_id', id)
        ])

        const hasProducts = relatedProducts && relatedProducts.length > 0
        const hasBatches = relatedBatches && relatedBatches.length > 0

        if (hasProducts || hasBatches) {
            let message = 'Bu reçete ile ilişkili veriler bulundu:\n\n'

            if (hasProducts) {
                const names = relatedProducts.map(p => p.name).slice(0, 3).join(', ')
                message += `- ${relatedProducts.length} Ürün: ${names}${relatedProducts.length > 3 ? '...' : ''}\n`
            }
            if (hasBatches) {
                message += `- ${relatedBatches.length} Üretim partisi\n`
            }

            message += '\nReçeteyi silmek için bu verilerin de silinmesi gerekiyor.\nDevam etmek istiyor musunuz?'

            if (!confirm(message)) return

            // Delete related sales first (via products)
            if (hasProducts && relatedProducts) {
                const productIds = relatedProducts.map(p => p.id)

                // Reverting customer balance impact is automatically handled by the database trigger on sales deletion

                // Delete sales for these products
                await supabase.from('sales').delete().in('product_id', productIds)
                // Delete products
                await supabase.from('products').delete().in('id', productIds)
            }

            // Delete related batches
            if (hasBatches) {
                await supabase.from('production_batches').delete().eq('recipe_id', id)
            }
        } else {
            if (!confirm('Bu reçeteyi silmek istediğinize emin misiniz?')) return
        }

        // Now delete the recipe
        const { error } = await supabase.from('recipes').delete().eq('id', id)

        if (error) {
            console.error('Delete error:', error)
            toast.error('Reçete silinemedi: ' + error.message)
        } else {
            toast.success('Reçete ve ilişkili veriler silindi')
            fetchData()
        }
    }

    const getMaterialName = (id: string) => materials.find((m) => m.id === id)?.name || 'Unknown'

    const percentageSum = ingredients
        .filter((i) => i.quantity_type === 'percentage')
        .reduce((sum, i) => sum + i.quantity, 0)

    async function handleExportExcel() {
        toast.loading('Supabase veritabanından tüm reçeteler çekiliyor...', { id: 'excel-export' })
        const { data: allRecipes, error } = await supabase
            .from('recipes')
            .select('*, recipe_ingredients(*, raw_material:raw_materials(name, unit))')
            .order('name')

        if (error || !allRecipes || allRecipes.length === 0) {
            toast.error('Aktarılacak reçete kaydı bulunamadı.', { id: 'excel-export' })
            return
        }

        const excelData = allRecipes.map((r: any) => ({
            'Reçete Adı': r.name,
            'Varsayılan Şişe Hacmi (ml)': r.bottle_size_ml || '-',
            'Kategori / Cinsiyet': r.gender === 'men' ? 'Erkek' : r.gender === 'women' ? 'Kadın' : r.gender === 'unisex' ? 'Unisex' : 'Kolonya',
            'Versiyon': r.version || 'v1.0',
            'Bileşen Sayısı': r.recipe_ingredients?.length || 0,
            'İçerik Özet': r.recipe_ingredients?.map((i: any) => `${i.raw_material?.name || 'Malzeme'}: ${i.quantity}${i.quantity_type === 'percentage' ? '%' : ' (' + (i.raw_material?.unit || 'adet') + ')'}`).join(', ') || '-',
            'Revizyon Notları': r.revision_notes || '-',
            'Açıklama': r.description || '-'
        }))
        exportToExcel(excelData, 'Receteler_Ve_Formuller.xlsx', 'Reçeteler')
        toast.success(`${allRecipes.length} adet reçete dökümü Supabase DB'den indirildi!`, { id: 'excel-export' })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-ink">Recipes & Formulations</h1>
                    <p className="text-sand text-xs sm:text-sm mt-0.5">Parfüm reçetelerinizi ve 760 adet hazır önerilen formülasyon kütüphanesini yönetin</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" onClick={handleExportExcel} className="border-hairline text-ink hover:bg-ink/5 text-xs sm:text-sm h-9">
                        <Download className="w-4 h-4 mr-1.5 sm:mr-2" />
                        Excel'e Aktar
                    </Button>
                    {isMounted ? (
                        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                            <DialogTrigger asChild>
                                <Button className="bg-ink text-paper hover:bg-rust text-xs sm:text-sm h-9">
                                    <svg className="w-4 h-4 mr-1.5 sm:mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    New Recipe
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-paper border-hairline w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
                                <DialogHeader>
                                    <DialogTitle className="text-ink">{editingRecipe ? 'Edit Recipe' : 'Create New Recipe'}</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-ink">Name</Label>
                                            <Input
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                className="bg-paper border-hairline text-ink"
                                                placeholder="e.g., Summer Rose"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-ink">Kategori</Label>
                                            <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                                                <SelectTrigger className="bg-paper border-hairline text-ink">
                                                    <SelectValue placeholder="Seçiniz..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-paper border-hairline">
                                                    <SelectItem value="men" className="text-ink">Erkek</SelectItem>
                                                    <SelectItem value="women" className="text-ink">Kadın</SelectItem>
                                                    <SelectItem value="unisex" className="text-ink">Unisex</SelectItem>
                                                    <SelectItem value="kolonya" className="text-ink">Kolonya</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-ink">Varsayılan Şişe Boyutu (ml) <span className="text-sand text-xs">(opsiyonel)</span></Label>
                                            <Input
                                                type="number"
                                                value={formData.bottle_size_ml}
                                                onChange={(e) => setFormData({ ...formData, bottle_size_ml: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                                className="bg-paper border-hairline text-ink"
                                                placeholder="Boş bırakabilirsiniz"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Revizyon Versiyonu</Label>
                                            <Input
                                                value={formData.version}
                                                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                                                className="bg-slate-800 border-slate-600 text-white font-mono"
                                                placeholder="v1.0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-300">Revizyon Notu</Label>
                                            <Input
                                                value={formData.revision_notes}
                                                onChange={(e) => setFormData({ ...formData, revision_notes: e.target.value })}
                                                className="bg-slate-800 border-slate-600 text-white"
                                                placeholder="Örn: Esans oranı yükseltildi"
                                            />
                                        </div>
                                    </div>

                                    {editingRecipe && (
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
                            <div>
                                <span className="text-xs text-purple-300 font-medium">Yeni Revizyon Olarak Sakla</span>
                                {formData.is_new_revision && (
                                    <span className="ml-2 text-xs text-purple-400 font-mono">
                                        ({editingRecipe.version || 'v1.0'} → {formData.version || bumpVersion(editingRecipe.version)})
                                    </span>
                                )}
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={formData.is_new_revision}
                                    onChange={(e) => {
                                        const checked = e.target.checked
                                        setFormData(prev => ({
                                            ...prev,
                                            is_new_revision: checked,
                                            // Auto-bump version when enabling new revision
                                            version: checked ? bumpVersion(editingRecipe.version) : (editingRecipe.version || 'v1.0'),
                                        }))
                                    }}
                                    className="w-4 h-4 accent-purple-600 rounded"
                                />
                                <span className="text-xs text-slate-300">Yeni Revizyon Yayınla</span>
                            </label>
                        </div>
                    )}

                                    <div className="space-y-2">
                                        <Label className="text-ink">Description</Label>
                                        <Input
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="bg-paper border-hairline text-ink"
                                            placeholder="Optional description..."
                                        />
                                    </div>

                                    <Separator className="bg-hairline" />

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-ink">Ingredients</Label>
                                            <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="border-hairline text-sand hover:text-ink">
                                                + Add Ingredient
                                            </Button>
                                        </div>

                                        {percentageSum > 0 && (
                                            <div className={`text-sm ${Math.abs(percentageSum - 100) < 0.01 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                Sıvı Formülasyon Toplamı: %{percentageSum.toFixed(1)}
                                                {Math.abs(percentageSum - 100) >= 0.01 && ' (sıvı bileşenler %100 olmalıdır)'}
                                            </div>
                                        )}

                                        {ingredients.length === 0 ? (
                                            <p className="text-slate-500 text-sm py-4 text-center">No ingredients added yet</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {ingredients.map((ingredient, index) => (
                                                    <div key={index} className="p-3 rounded-lg bg-ink/5 space-y-2">
                                                        {/* Material selector - full width */}
                                                        <div className="flex items-center gap-2">
                                                            <MaterialCombobox
                                                                materials={materials}
                                                                value={ingredient.material_id}
                                                                onChange={(v) => updateIngredient(index, 'material_id', v)}
                                                                usedMaterialIds={ingredients.map(i => i.material_id)}
                                                            />
                                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeIngredient(index)} className="text-red-400 shrink-0">
                                                                ✕
                                                            </Button>
                                                        </div>
                                                        {/* Quantity controls - row */}
                                                        <div className="flex items-center gap-2">
                                                            <Select
                                                                value={ingredient.quantity_type}
                                                                onValueChange={(v) => updateIngredient(index, 'quantity_type', v as QuantityType)}
                                                            >
                                                                <SelectTrigger className="bg-paper border-hairline text-ink w-28 sm:w-32 shrink-0">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="bg-paper border-hairline">
                                                                    <SelectItem value="percentage" className="text-ink">Percentage</SelectItem>
                                                                    <SelectItem value="fixed" className="text-ink">Fixed</SelectItem>
                                                                </SelectContent>
                                                            </Select>

                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={ingredient.quantity}
                                                                onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                                className="bg-paper border-hairline text-ink flex-1 min-w-0"
                                                                placeholder={ingredient.quantity_type === 'percentage' ? '%' : 'qty'}
                                                            />

                                                            <span className="text-sand text-sm shrink-0">
                                                                {ingredient.quantity_type === 'percentage' ? '%' : materials.find(m => m.id === ingredient.material_id)?.unit || ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
                                        <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); resetForm(); }} className="text-sand hover:text-ink">
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={submitting} className="bg-gradient-to-r from-purple-600 to-pink-600 disabled:opacity-50">
                                            {submitting ? 'İşleniyor...' : `${editingRecipe ? (formData.is_new_revision ? 'Yeni Revizyon Yayınla' : 'Güncelle') : 'Reçete Oluştur'}`}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    ) : (
                        <Button className="bg-ink text-paper hover:bg-rust">
                            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            New Recipe
                        </Button>
                    )}
                </div>
            </div>

            {/* Tab & Search Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-3">
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant={activeTab === 'system' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('system')}
                        className={activeTab === 'system' ? 'bg-ink text-paper font-bold' : 'text-sand border-hairline hover:bg-ink/5'}
                    >
                        🧪 Aktif Sistem Reçeteleri ({filteredRecipes.length})
                    </Button>
                    <Button
                        type="button"
                        variant={activeTab === 'suggested' ? 'default' : 'outline'}
                        onClick={() => setActiveTab('suggested')}
                        className={activeTab === 'suggested' ? 'bg-rust text-paper font-bold' : 'text-sand border-hairline hover:bg-ink/5'}
                    >
                        📚 Önerilen Formülasyon Kütüphanesi (760 Formül)
                    </Button>
                </div>
                {activeTab === 'system' && (
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand" />
                        <Input
                            placeholder="Reçete veya içerik ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9 bg-paper border-hairline text-xs sm:text-sm text-ink w-full"
                        />
                    </div>
                )}
            </div>

            {activeTab === 'suggested' ? (
                <SuggestedFormulationsTab onRefreshRecipes={fetchData} />
            ) : loading ? (
                <div className="text-center py-12 text-sand">Loading...</div>
            ) : filteredRecipes.length === 0 ? (
                <Card className="bg-paper border-hairline">
                    <CardContent className="py-12 text-center">
                        <p className="text-sand">
                            {searchQuery ? `"${searchQuery}" ile eşleşen reçete bulunamadı.` : 'No recipes yet. Create your first formulation!'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                    {filteredRecipes.map((recipe) => (
                        <Card key={recipe.id} className="bg-paper border-hairline hover:border-ink/30 transition-colors">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-ink">{recipe.name}</CardTitle>
                                            <Badge variant="outline" className="bg-rust/10 text-rust border-rust/30 text-xs font-mono">
                                                {recipe.version || 'v1.0'}
                                            </Badge>
                                        </div>
                                        <CardDescription className="text-sand mt-1">
                                            {recipe.bottle_size_ml ? `${recipe.bottle_size_ml}ml • ` : ''}{recipe.recipe_ingredients.length} ingredients
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!recipe.bottle_size_ml && (
                                            <Badge variant="outline" className="bg-ink/10 text-ink border-hairline text-xs">
                                                Çok Boyutlu
                                            </Badge>
                                        )}
                                        <Badge variant="outline" className={recipe.is_active ? 'bg-moss/20 text-moss border-moss/30' : 'bg-ink/10 text-sand border-hairline'}>
                                            {recipe.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {recipe.description && (
                                    <p className="text-sm text-sand">{recipe.description}</p>
                                )}
                                {recipe.revision_notes && (
                                    <p className="text-xs text-purple-300/80 bg-purple-500/10 border border-purple-500/20 p-2 rounded">
                                        <strong className="text-purple-300">Revizyon Notu:</strong> {recipe.revision_notes}
                                    </p>
                                )}

                                <div className="space-y-2">
                                    {recipe.recipe_ingredients.slice(0, 3).map((ing) => (
                                        <div key={ing.id} className="flex justify-between text-sm">
                                            <span className="text-sand">{ing.raw_material?.name}</span>
                                            <span className="text-sand">
                                                {ing.quantity}{ing.quantity_type === 'percentage' ? '%' : ` ${ing.raw_material?.unit}`}
                                            </span>
                                        </div>
                                    ))}
                                    {recipe.recipe_ingredients.length > 3 && (
                                        <p className="text-xs text-sand">+{recipe.recipe_ingredients.length - 3} more</p>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(recipe)} className="text-sand hover:text-ink flex-1">
                                        Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(recipe.id)} className="text-red-400 hover:text-red-300">
                                        Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
