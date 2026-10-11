'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { calculateProduction, calculateProductionCost, calculateIngredientQuantity, convertFromMl, getRawMaterialUnitCost } from '@/lib/calculations'
import { generateBatchNumber, formatNumber } from '@/lib/utils'
import type { Recipe, RecipeIngredient, RawMaterial, ProductionCalculation } from '@/types/database'
import type { CalculatedIngredient } from '@/types/database'
import { LeLaboLabelModal, LabelData } from '@/components/label/LeLaboLabelModal'
import { Check, ChevronsUpDown, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
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

type RecipeWithIngredients = Recipe & {
    recipe_ingredients: (RecipeIngredient & { raw_material: RawMaterial })[]
}

export default function ProductionPage() {
    const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([])
    const [products, setProducts] = useState<{
        id: string
        name: string
        recipe_id: string | null
        stock: number
        unit_cost: number | null
        bottle_size_ml: number | null
        // Metadata fields for inheritance on revision
        fragrantica_score: number | null
        fragrantica_url: string | null
        description: string | null
        top_notes: string | null
        middle_notes: string | null
        base_notes: string | null
        image_url: string | null
        hover_image_url: string | null
    }[]>([])
    const [allMaterials, setAllMaterials] = useState<RawMaterial[]>([])  // All raw material lots (for multi-lot aggregation)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    const [selectedRecipeId, setSelectedRecipeId] = useState<string>('')
    const [selectedBottleId, setSelectedBottleId] = useState<string>('')
    const [bottleSizeMl, setBottleSizeMl] = useState<number>(50)
    const [quantity, setQuantity] = useState<number>(1)
    const [batchNumber, setBatchNumber] = useState<string>('')
    const [notes, setNotes] = useState<string>('')
    const [openRecipe, setOpenRecipe] = useState(false)
    const [openBottle, setOpenBottle] = useState(false)
    const [bottles, setBottles] = useState<RawMaterial[]>([])
    const [labelModalOpen, setLabelModalOpen] = useState(false)
    const [generatedLabelData, setGeneratedLabelData] = useState<LabelData | null>(null)

    const supabase = createClient()

    useEffect(() => {
        fetchData()
        setBatchNumber(generateBatchNumber())
    }, [])

    async function fetchData() {
        setLoading(true)

        const [recipesRes, productsRes, bottlesRes, allMatsRes] = await Promise.all([
            supabase
                .from('recipes')
                .select(`
          *,
          recipe_ingredients (
            *,
            raw_material:raw_materials (*)
          )
        `)
                .eq('is_active', true)
                .order('name'),
            supabase
                .from('products')
                .select('id, name, recipe_id, stock, unit_cost, bottle_size_ml, fragrantica_score, fragrantica_url, description, top_notes, middle_notes, base_notes, image_url, hover_image_url')
                .order('name'),
            supabase
                .from('raw_materials')
                .select('*')
                .eq('type', 'bottle')
                .order('name'),
            // Fetch ALL raw material lots to enable multi-lot stock aggregation
            supabase
                .from('raw_materials')
                .select('*')
                .order('created_at', { ascending: true }),  // FIFO: oldest lot first
        ])

        if (recipesRes.error) {
            toast.error('Failed to load recipes')
        } else {
            setRecipes(recipesRes.data || [])
        }

        if (productsRes.error) {
            toast.error('Failed to load products')
        } else {
            setProducts(productsRes.data || [])
        }

        if (bottlesRes.error) {
            toast.error('Failed to load bottles')
        } else {
            setBottles(bottlesRes.data || [])
        }

        if (!allMatsRes.error && allMatsRes.data) {
            setAllMaterials(allMatsRes.data)
        }

        setLoading(false)
    }

    const selectedRecipe = useMemo(() => {
        return recipes.find(r => r.id === selectedRecipeId)
    }, [recipes, selectedRecipeId])

    const selectedBottle = useMemo(() => {
        return bottles.find(b => b.id === selectedBottleId)
    }, [bottles, selectedBottleId])

    // When recipe is selected, auto-populate ml from recipe default if available
    useEffect(() => {
        if (selectedRecipe?.bottle_size_ml) {
            setBottleSizeMl(selectedRecipe.bottle_size_ml)
        }
    }, [selectedRecipeId])

    const calculation: ProductionCalculation | null = useMemo(() => {
        if (!selectedRecipe || quantity <= 0 || bottleSizeMl <= 0) return null

        // Build a map: materialName (lowercase) -> total combined stock across all lots
        // This fixes the "insufficient" error when a recipe references an old depleted lot
        // while a newer lot of the same material has enough stock.
        const stockByName = new Map<string, number>()
        allMaterials.forEach(mat => {
            const key = mat.name.trim().toLowerCase()
            stockByName.set(key, (stockByName.get(key) ?? 0) + mat.stock)
        })

        // Override the stock on each recipe ingredient's raw_material with the aggregated total
        const patchedIngredients = selectedRecipe.recipe_ingredients.map(ing => {
            if (!ing.raw_material) return ing
            const key = ing.raw_material.name.trim().toLowerCase()
            const totalStock = stockByName.get(key) ?? ing.raw_material.stock
            return {
                ...ing,
                raw_material: { ...ing.raw_material, stock: totalStock },
            }
        })

        const calc = calculateProduction(
            selectedRecipe,
            patchedIngredients,
            quantity,
            bottleSizeMl
        )
        // Add selected bottle to the calculation if it's not already in recipe ingredients
        if (selectedBottle) {
            const alreadyInRecipe = calc.ingredients.some(i => i.material_id === selectedBottle.id)
            if (!alreadyInRecipe) {
                // Also aggregate bottle stock across all same-name lots
                const bottleKey = selectedBottle.name.trim().toLowerCase()
                const totalBottleStock = stockByName.get(bottleKey) ?? selectedBottle.stock
                const bottleIngredient: CalculatedIngredient = {
                    material_id: selectedBottle.id,
                    material_name: selectedBottle.name,
                    required_quantity: quantity,
                    available_stock: totalBottleStock,
                    unit: selectedBottle.unit,
                    is_sufficient: totalBottleStock >= quantity,
                    raw_material: { ...selectedBottle, stock: totalBottleStock },
                }
                calc.ingredients.push(bottleIngredient)
                if (!bottleIngredient.is_sufficient) {
                    calc.insufficient_materials.push(bottleIngredient)
                    calc.can_produce = false
                }
            }
        }
        return calc
    }, [selectedRecipe, quantity, bottleSizeMl, selectedBottle, allMaterials])

    const supplierMixWarnings = useMemo(() => {
        if (!calculation) return []

        return calculation.ingredients.flatMap((ingredient) => {
            const materialName = (ingredient.raw_material?.name ?? ingredient.material_name).trim().toLowerCase()
            const lots = allMaterials.filter((material) =>
                material.name.trim().toLowerCase() === materialName && material.stock > 0
            )
            const suppliers = new Map<string, RawMaterial[]>()
            lots.forEach((lot) => {
                const supplier = (lot.supplier || 'Tedarikçi belirtilmedi').trim()
                suppliers.set(supplier, [...(suppliers.get(supplier) || []), lot])
            })

            const hasSingleSupplierCapacity = Array.from(suppliers.values()).some((supplierLots) =>
                supplierLots.reduce((total, lot) => total + lot.stock, 0) >= ingredient.required_quantity
            )

            if (suppliers.size > 1 && !hasSingleSupplierCapacity) {
                return [`${ingredient.material_name}: ${ingredient.required_quantity} ${ingredient.unit} için birden fazla tedarikçinin lotu karışacak.`]
            }

            return []
        })
    }, [allMaterials, calculation])

    const estimatedCost = useMemo(() => {
        if (!selectedRecipe || quantity <= 0 || bottleSizeMl <= 0) return 0
        let totalCost = 0

        // For each ingredient, simulate FIFO consumption across available raw material lots
        for (const ingredient of selectedRecipe.recipe_ingredients) {
            const requiredQtyMl = calculateIngredientQuantity(
                ingredient,
                bottleSizeMl,
                quantity
            )
            const requiredInUnit = convertFromMl(requiredQtyMl, ingredient.raw_material.unit)

            const matName = ingredient.raw_material?.name?.trim().toLowerCase()
            const matchingLots = allMaterials
                .filter(m => m.name.trim().toLowerCase() === matName && m.stock > 0)
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

            let needed = requiredInUnit
            let ingredientCost = 0

            if (matchingLots.length > 0) {
                for (const lot of matchingLots) {
                    if (needed <= 0) break
                    const take = Math.min(lot.stock, needed)
                    const baseQty = (lot.initial_stock && lot.initial_stock > 0) ? lot.initial_stock : (lot.stock > 0 ? lot.stock : 1)
                    const lotUnitCost = (lot.total_cost && baseQty > 0) ? (lot.total_cost / baseQty) : 0
                    ingredientCost += take * lotUnitCost
                    needed -= take
                }
            }

            // Fallback for remaining needed
            if (needed > 0) {
                const fallbackCost = getRawMaterialUnitCost(ingredient.raw_material)
                ingredientCost += needed * fallbackCost
            }

            totalCost += ingredientCost
        }

        // Add bottle cost (FIFO from bottle lots or selected bottle)
        if (selectedBottle) {
            const alreadyInRecipe = selectedRecipe.recipe_ingredients.some(
                i => i.material_id === selectedBottle.id || i.raw_material?.name?.trim().toLowerCase() === selectedBottle.name.trim().toLowerCase()
            )
            if (!alreadyInRecipe) {
                const bottleName = selectedBottle.name.trim().toLowerCase()
                const bottleLots = allMaterials
                    .filter(m => m.name.trim().toLowerCase() === bottleName && m.stock > 0)
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

                let neededBottles = quantity
                let bottleCost = 0
                if (bottleLots.length > 0) {
                    for (const lot of bottleLots) {
                        if (neededBottles <= 0) break
                        const take = Math.min(lot.stock, neededBottles)
                        const baseQty = (lot.initial_stock && lot.initial_stock > 0) ? lot.initial_stock : (lot.stock > 0 ? lot.stock : 1)
                        const lotUnitCost = (lot.total_cost && baseQty > 0) ? (lot.total_cost / baseQty) : 0
                        bottleCost += take * lotUnitCost
                        neededBottles -= take
                    }
                }
                if (neededBottles > 0) {
                    const fallbackCost = getRawMaterialUnitCost(selectedBottle)
                    bottleCost += neededBottles * fallbackCost
                }
                totalCost += bottleCost
            }
        }
        return totalCost
    }, [selectedRecipe, quantity, bottleSizeMl, selectedBottle, allMaterials])

    async function handleProduction() {
        if (!selectedRecipe || !calculation) return

        // Bug #5: Validate bottle is selected or in recipe
        const hasBottleInRecipe = selectedRecipe.recipe_ingredients.some(
            i => i.raw_material?.type === 'bottle'
        )
        if (!selectedBottle && !hasBottleInRecipe) {
            toast.error('Lütfen bir şişe seçin')
            return
        }

        if (!calculation.can_produce) {
            toast.error('Insufficient materials for production')
            return
        }

        if (supplierMixWarnings.length > 0) {
            const confirmed = window.confirm(
                `Bu üretimde tedarikçi lotları karışacak:\n\n${supplierMixWarnings.join('\n')}\n\n` +
                'Tedarikçi değişimi koku/kalıcılık farkı oluşturabilir. Devam etmek istiyor musunuz?'
            )
            if (!confirmed) return
        }

        setSubmitting(true)

        try {
            // 1. Deduct raw materials (and selected bottle) from inventory using FIFO across lots & calculate EXACT cost
            let totalActualCost = 0
            const detailedDeductions: Array<{
                material_id: string
                material_name: string
                quantity_deducted: number
                unit: string
                unit_cost: number
                total_cost: number
                lot_no: string
                supplier: string | null
            }> = []

            for (const ingredient of calculation.ingredients) {
                // Fetch ALL lots for this ingredient name (FIFO order: oldest created_at first) with stock > 0
                const ingredientName = ingredient.raw_material?.name ?? ingredient.material_name
                const { data: lots } = await supabase
                    .from('raw_materials')
                    .select('id, stock, initial_stock, total_cost, supplier, name, unit, created_at')
                    .eq('name', ingredientName)
                    .gt('stock', 0)
                    .order('created_at', { ascending: true })

                // Fallback to exact ID if name query didn't return lots
                const availableLots = lots || []
                const lotsBySupplier = new Map<string, typeof availableLots>()
                availableLots.forEach((lot) => {
                    const supplier = (lot.supplier || 'Tedarikçi belirtilmedi').trim()
                    lotsBySupplier.set(supplier, [...(lotsBySupplier.get(supplier) || []), lot])
                })
                const singleSupplierLots = Array.from(lotsBySupplier.values()).find((supplierLots) =>
                    supplierLots.reduce((total, lot) => total + lot.stock, 0) >= ingredient.required_quantity
                )
                const fallbackLots = (await supabase
                    .from('raw_materials')
                    .select('id, stock, initial_stock, total_cost, supplier, name, unit, created_at')
                    .eq('id', ingredient.material_id)
                    .gt('stock', 0)).data || []
                const matchedLots = availableLots.length > 0 ? availableLots : fallbackLots
                const lotsToConsume = singleSupplierLots || matchedLots

                if (lotsToConsume.length === 0) {
                    throw new Error(`Hammadde lotu bulunamadı: ${ingredientName}`)
                }

                // FIFO: deduct from oldest lots first
                let remaining = ingredient.required_quantity
                for (const lot of lotsToConsume) {
                    if (remaining <= 0) break
                    const deduct = Math.min(lot.stock, remaining)
                    if (deduct <= 0) continue
                    const newStock = Math.max(0, lot.stock - deduct)

                    // Lot's actual unit cost
                    const baseQty = (lot.initial_stock && lot.initial_stock > 0) ? lot.initial_stock : (lot.stock > 0 ? lot.stock : 1)
                    const lotUnitCost = (lot.total_cost && baseQty > 0) ? (lot.total_cost / baseQty) : 0
                    const lotConsumedCost = deduct * lotUnitCost
                    totalActualCost += lotConsumedCost

                    const { error } = await supabase
                        .from('raw_materials')
                        .update({ stock: newStock })
                        .eq('id', lot.id)
                    if (error) throw new Error(`Failed to update lot of ${ingredientName}`)

                    detailedDeductions.push({
                        material_id: lot.id,
                        material_name: lot.name,
                        quantity_deducted: Number(deduct.toFixed(3)),
                        unit: lot.unit,
                        unit_cost: Number(lotUnitCost.toFixed(4)),
                        total_cost: Number(lotConsumedCost.toFixed(2)),
                        lot_no: `LOT-${lot.id.substring(0, 8).toUpperCase()}`,
                        supplier: lot.supplier || 'Belirtilmedi'
                    })

                    remaining -= deduct
                }

                if (remaining > 0.0001) {
                    throw new Error(`${ingredientName} için yeterli stok üretim sırasında kalmadı.`)
                }
            }

            // Actual Unit Cost for THIS produced batch
            const batchUnitCost = quantity > 0 ? Number((totalActualCost / quantity).toFixed(2)) : 0

            // 3. Find or create product for this recipe
            let productId: string
            // First try exact match (recipe + size), then fallback to recipe-only match for old products without bottle_size_ml
            const existingProduct = products.find(p => p.recipe_id === selectedRecipe.id && p.bottle_size_ml === bottleSizeMl)
                || products.find(p => p.recipe_id === selectedRecipe.id && p.bottle_size_ml === null)

            if (existingProduct) {
                // Update existing product stock & latest batch info
                const updatePayload: any = {
                    stock: existingProduct.stock + quantity,
                    batch_number: batchNumber,
                    production_date: new Date().toISOString().split('T')[0],
                    unit_cost: batchUnitCost,
                };

                // Backfill bottle_size_ml if it was previously null
                if (existingProduct.bottle_size_ml === null) {
                    updatePayload.bottle_size_ml = bottleSizeMl;
                }

                const { error } = await supabase
                    .from('products')
                    .update(updatePayload)
                    .eq('id', existingProduct.id)

                if (error) throw new Error('Failed to update product stock')
                productId = existingProduct.id
            } else {
                // Create new product — include bottle size in name for distinction
                const productName = `${selectedRecipe.name} ${bottleSizeMl}ml`

                // ── Inherit metadata from parent recipe's product (revision chain) ──
                let inheritedMeta: {
                    fragrantica_score?: number | null
                    fragrantica_url?: string | null
                    description?: string | null
                    top_notes?: string | null
                    middle_notes?: string | null
                    base_notes?: string | null
                    image_url?: string | null
                    hover_image_url?: string | null
                } = {}

                if (selectedRecipe.parent_recipe_id) {
                    let parentRecipeId: string | null = selectedRecipe.parent_recipe_id
                    while (parentRecipeId) {
                        const parentProduct = products.find(
                            p => p.recipe_id === parentRecipeId && (p.bottle_size_ml === bottleSizeMl || p.bottle_size_ml === null)
                        )
                        if (parentProduct) {
                            inheritedMeta = {
                                fragrantica_score: parentProduct.fragrantica_score,
                                fragrantica_url: parentProduct.fragrantica_url,
                                description: parentProduct.description ?? selectedRecipe.description,
                                top_notes: parentProduct.top_notes,
                                middle_notes: parentProduct.middle_notes,
                                base_notes: parentProduct.base_notes,
                                image_url: parentProduct.image_url,
                                hover_image_url: parentProduct.hover_image_url,
                            }
                            break
                        }
                        const { data: parentRecipe } = await supabase
                            .from('recipes')
                            .select('parent_recipe_id')
                            .eq('id', parentRecipeId)
                            .single() as { data: { parent_recipe_id: string | null } | null }
                        parentRecipeId = parentRecipe?.parent_recipe_id ?? null
                    }
                }

                const { data, error } = await supabase
                    .from('products')
                    .insert({
                        recipe_id: selectedRecipe.id,
                        name: productName,
                        stock: quantity,
                        unit_cost: batchUnitCost,
                        bottle_size_ml: bottleSizeMl,
                        gender: selectedRecipe.gender || null,
                        batch_number: batchNumber,
                        production_date: new Date().toISOString().split('T')[0],
                        ...inheritedMeta,
                    })
                    .select('id')
                    .single()

                if (error) throw new Error('Failed to create product')
                productId = data.id
            }

            // 4. Create inventory_batches record for this product batch
            const { error: batchError } = await supabase.from('inventory_batches').insert({
                    product_id: productId,
                    lot_no: batchNumber,
                    quantity: quantity,
                    unit_cost: batchUnitCost,
                    arrival_date: new Date().toISOString().split('T')[0],
                    supplier_id: null,
                })
            if (batchError) throw new Error(`Üretim batch'i kaydedilemedi: ${batchError.message}`)

            // 5. Create production batch record for audit with exact FIFO deductions
            const { error: productionBatchError } = await supabase.from('production_batches').insert({
                recipe_id: selectedRecipe.id,
                product_id: productId,
                quantity_produced: quantity,
                batch_number: batchNumber,
                notes: notes || null,
                ingredient_deductions: detailedDeductions,
            })
            if (productionBatchError) throw new Error(`Üretim geçmişi kaydedilemedi: ${productionBatchError.message}`)

            toast.success(`${quantity} adet ${bottleSizeMl}ml ${selectedRecipe.name} üretildi!`)

            // Open Le Labo Label Modal automatically for the produced product
            setGeneratedLabelData({
                productId: productId,
                productName: selectedRecipe.name,
                bottleSizeMl: bottleSizeMl,
                gender: selectedRecipe.gender,
                batchNumber: batchNumber,
                productionDate: new Date().toISOString().split('T')[0],
                version: selectedRecipe.version || 'v1.0',
                description: selectedRecipe.description,
            })
            setLabelModalOpen(true)

            // Reset form
            setSelectedRecipeId('')
            setSelectedBottleId('')
            setBottleSizeMl(50)
            setQuantity(1)
            setBatchNumber(generateBatchNumber())
            setNotes('')

            // Refresh data
            fetchData()

        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Production failed')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-sand">Loading...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-6xl">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-ink">Production</h1>
                <p className="text-sand text-xs sm:text-sm mt-0.5">Produce perfume batches from your recipes</p>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Production Form */}
                <Card className="bg-paper border-hairline">
                    <CardHeader>
                        <CardTitle className="text-ink">New Production Batch</CardTitle>
                        <CardDescription className="text-sand">
                            Select a recipe and quantity to produce
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-ink">Recipe</Label>
                            <Popover open={openRecipe} onOpenChange={setOpenRecipe}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openRecipe}
                                        className="w-full justify-between bg-paper border-hairline text-ink hover:bg-ink/5 hover:text-ink"
                                    >
                                        {selectedRecipeId
                                            ? recipes.find((recipe) => recipe.id === selectedRecipeId)?.name
                                            : "Select a recipe..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-paper border-hairline">
                                    <Command className="bg-paper text-ink">
                                        <CommandInput placeholder="Search recipe..." className="text-ink placeholder:text-sand" />
                                        <CommandList>
                                            <CommandEmpty>No recipe found.</CommandEmpty>
                                            <CommandGroup>
                                                {recipes.map((recipe) => (
                                                    <CommandItem
                                                        key={recipe.id}
                                                        value={recipe.name}
                                                        onSelect={() => {
                                                            setSelectedRecipeId(recipe.id === selectedRecipeId ? "" : recipe.id)
                                                            setOpenRecipe(false)
                                                        }}
                                                        className="text-ink hover:bg-ink/5"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedRecipeId === recipe.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {recipe.name} {recipe.version ? `(${recipe.version})` : ''}{recipe.bottle_size_ml ? ` • ${recipe.bottle_size_ml}ml` : ''}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Bottle Selection */}
                        <div className="space-y-2">
                            <Label className="text-ink">Şişe Seçimi</Label>
                            <Popover open={openBottle} onOpenChange={setOpenBottle}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openBottle}
                                        className="w-full justify-between bg-paper border-hairline text-ink hover:bg-ink/5 hover:text-ink"
                                    >
                                        {selectedBottleId
                                            ? bottles.find((b) => b.id === selectedBottleId)?.name
                                            : "Şişe seçin..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-paper border-hairline">
                                    <Command className="bg-paper text-ink">
                                        <CommandInput placeholder="Şişe ara..." className="text-ink placeholder:text-sand" />
                                        <CommandList>
                                            <CommandEmpty>Şişe bulunamadı.</CommandEmpty>
                                            <CommandGroup>
                                                {bottles.map((bottle) => (
                                                    <CommandItem
                                                        key={bottle.id}
                                                        value={bottle.name}
                                                        onSelect={() => {
                                                            setSelectedBottleId(bottle.id === selectedBottleId ? "" : bottle.id)
                                                            setOpenBottle(false)
                                                        }}
                                                        className="text-ink hover:bg-ink/5"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedBottleId === bottle.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex justify-between w-full">
                                                            <span>{bottle.name}</span>
                                                            <span className="text-sand text-xs">Stok: {bottle.stock}</span>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Bottle Size ML */}
                        <div className="space-y-2">
                            <Label className="text-ink">Dolum Miktarı (ml)</Label>
                            <div className="flex gap-2">
                                <div className="flex gap-1">
                                    <Button
                                        type="button"
                                        variant={bottleSizeMl === 50 ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setBottleSizeMl(50)}
                                        className={bottleSizeMl === 50
                                            ? 'bg-rust text-paper hover:bg-rust/80'
                                            : 'border-hairline text-sand hover:text-ink'
                                        }
                                    >
                                        50ml
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={bottleSizeMl === 100 ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setBottleSizeMl(100)}
                                        className={bottleSizeMl === 100
                                            ? 'bg-rust text-paper hover:bg-rust/80'
                                            : 'border-hairline text-sand hover:text-ink'
                                        }
                                    >
                                        100ml
                                    </Button>
                                </div>
                                <Input
                                    type="number"
                                    min="1"
                                    value={bottleSizeMl}
                                    onChange={(e) => setBottleSizeMl(parseInt(e.target.value) || 50)}
                                    className="bg-paper border-hairline text-ink flex-1"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-ink">Quantity (bottles)</Label>
                            <Input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                className="bg-paper border-hairline text-ink"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-ink">Batch Number</Label>
                            <Input
                                value={batchNumber}
                                onChange={(e) => setBatchNumber(e.target.value)}
                                className="bg-paper border-hairline text-ink"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-ink">Notes (optional)</Label>
                            <Input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Production notes..."
                                className="bg-paper border-hairline text-ink"
                            />
                        </div>

                        <Button
                            onClick={handleProduction}
                            disabled={!selectedRecipe || !calculation?.can_produce || submitting}
                            className="w-full bg-ink text-paper hover:bg-rust disabled:opacity-50"
                        >
                            {submitting ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16z" />
                                    </svg>
                                    Start Production
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Calculation Preview */}
                <Card className="bg-paper border-hairline">
                    <CardHeader>
                        <CardTitle className="text-ink">Production Calculation</CardTitle>
                        <CardDescription className="text-sand">
                            Real-time ingredient requirements
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!selectedRecipe ? (
                            <div className="text-center py-8 text-sand">
                                Select a recipe to see calculations
                            </div>
                        ) : calculation ? (
                            <div className="space-y-4">
                                {/* Summary */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg bg-ink/5">
                                        <p className="text-xs text-sand">Total Volume</p>
                                        <p className="text-lg font-bold text-ink">{formatNumber(calculation.total_volume_ml)} ml</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-ink/5">
                                        <p className="text-xs text-sand">Est. Cost</p>
                                        <p className="text-lg font-bold text-ink">₺{formatNumber(estimatedCost)}</p>
                                    </div>
                                </div>

                                <Separator className="bg-hairline" />

                                {/* Ingredients */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-sand">Required Ingredients</h4>
                                    {calculation.ingredients.length === 0 ? (
                                        <p className="text-sand text-sm">No ingredients defined for this recipe</p>
                                    ) : (
                                        calculation.ingredients.map((ingredient) => (
                                            <div
                                                key={ingredient.material_id}
                                                className={`flex items-center justify-between p-3 rounded-lg ${ingredient.is_sufficient
                                                    ? 'bg-moss/10 border border-moss/20'
                                                    : 'bg-red-500/10 border border-red-500/20'
                                                    }`}
                                            >
                                                <div>
                                                    <p className="font-medium text-ink">{ingredient.material_name}</p>
                                                    <p className="text-sm text-sand">
                                                        Stock: {formatNumber(ingredient.available_stock)} {ingredient.unit}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-bold ${ingredient.is_sufficient ? 'text-moss' : 'text-red-400'}`}>
                                                        -{formatNumber(ingredient.required_quantity)} {ingredient.unit}
                                                    </p>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            ingredient.is_sufficient
                                                                ? 'bg-moss/20 text-moss border-moss/30'
                                                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                                                        }
                                                    >
                                                        {ingredient.is_sufficient ? '✓ Sufficient' : '✗ Insufficient'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Status */}
                                <div
                                    className={`p-4 rounded-lg ${calculation.can_produce
                                        ? 'bg-moss/10 border border-moss/30'
                                        : 'bg-red-500/10 border border-red-500/30'
                                        }`}
                                >
                                    {calculation.can_produce ? (
                                        <div className="flex items-center gap-2 text-moss">
                                            <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                                <polyline points="22 4 12 14.01 9 11.01" />
                                            </svg>
                                            <span className="font-medium">Ready to produce {quantity} bottles</span>
                                        </div>
                                    ) : (
                                        <div className="text-red-400">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <line x1="12" y1="8" x2="12" y2="12" />
                                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                                </svg>
                                                <span className="font-medium">Cannot produce - insufficient materials:</span>
                                            </div>
                                            <ul className="list-disc list-inside text-sm">
                                                {calculation.insufficient_materials.map((m) => (
                                                    <li key={m.material_id}>
                                                        {m.material_name}: need {formatNumber(m.required_quantity - m.available_stock)} more {m.unit}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>
            </div>

            {/* Le Labo Label Generator Modal */}
            <LeLaboLabelModal
                open={labelModalOpen}
                onOpenChange={setLabelModalOpen}
                data={generatedLabelData}
                onSuccess={fetchData}
            />
        </div>
    )
}
