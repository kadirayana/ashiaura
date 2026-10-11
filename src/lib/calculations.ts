import type { Recipe, RecipeIngredient, RawMaterial, CalculatedIngredient, ProductionCalculation, MaterialUnit } from '@/types/database'

/**
 * Convert a quantity from one unit to ml (for liquids)
 * Base unit for volume: ml, Base unit for weight: gr
 * Assumes 1:1 density for essence/alcohol (ml ≈ gr for perfume calculations)
 */

/**
 * Convert a quantity from one unit to ml (for liquids)
 * Assumes 1:1 density for essence/alcohol (ml ≈ gr for perfume calculations)
 */
export function convertToMl(quantity: number, unit: MaterialUnit): number {
    if (unit === 'ml') return quantity
    if (unit === 'liter') return quantity * 1000
    // For weight units, assume 1:1 density (common approximation for perfume liquids)
    if (unit === 'gr') return quantity
    if (unit === 'kg') return quantity * 1000
    // pcs (adet) has no meaningful ml equivalent — stays as-is for fixed-quantity items
    return quantity
}

/**
 * Convert ml to the target unit
 */
export function convertFromMl(quantityMl: number, targetUnit: MaterialUnit): number {
    if (targetUnit === 'ml') return quantityMl
    if (targetUnit === 'liter') return quantityMl / 1000
    if (targetUnit === 'gr') return quantityMl
    if (targetUnit === 'kg') return quantityMl / 1000
    // pcs (adet) has no meaningful ml equivalent — stays as-is for fixed-quantity items
    return quantityMl
}

/**
 * Get the stock in ml equivalent (for comparison)
 */
export function getStockInMl(stock: number, unit: MaterialUnit): number {
    return convertToMl(stock, unit)
}

/**
 * Calculate the required quantity of a material for production
 * Returns the quantity in ml (base unit)
 */
export function calculateIngredientQuantity(
    ingredient: RecipeIngredient,
    bottleSizeMl: number,
    numberOfBottles: number
): number {
    const totalVolume = bottleSizeMl * numberOfBottles

    if (ingredient.quantity_type === 'percentage') {
        // Percentage mode: quantity is a percentage (0-100)
        // E.g., 20% of 500ml = 100ml
        return (ingredient.quantity / 100) * totalVolume
    } else {
        // Fixed mode: quantity is the amount per bottle in ml
        // E.g., 2ml per bottle × 10 bottles = 20ml
        return ingredient.quantity * numberOfBottles
    }
}

/**
 * Calculate all ingredients needed for a production batch
 * Now with unit conversion support!
 */
export function calculateProduction(
    recipe: Recipe,
    ingredients: (RecipeIngredient & { raw_material: RawMaterial })[],
    quantity: number,
    bottleSizeMlOverride?: number
): ProductionCalculation {
    const bottleSizeMl = bottleSizeMlOverride ?? recipe.bottle_size_ml ?? 50
    const totalVolumeMl = bottleSizeMl * quantity

    const calculatedIngredients: CalculatedIngredient[] = ingredients.map((ingredient) => {
        // Required quantity is always in ml (calculated from percentage or fixed)
        const requiredQuantityMl = calculateIngredientQuantity(
            ingredient,
            bottleSizeMl,
            quantity
        )

        // Convert stock to ml for comparison
        const stockInMl = getStockInMl(
            ingredient.raw_material.stock,
            ingredient.raw_material.unit
        )

        // Check if sufficient (compare in same unit - ml)
        const isSufficient = stockInMl >= requiredQuantityMl

        // Convert required quantity back to material's original unit for display
        const requiredInOriginalUnit = convertFromMl(
            requiredQuantityMl,
            ingredient.raw_material.unit
        )

        return {
            material_id: ingredient.material_id,
            material_name: ingredient.raw_material.name,
            required_quantity: requiredInOriginalUnit,
            required_quantity_ml: requiredQuantityMl,
            available_stock: ingredient.raw_material.stock,
            available_stock_ml: stockInMl,
            unit: ingredient.raw_material.unit,
            is_sufficient: isSufficient,
            raw_material: ingredient.raw_material,
        }
    })

    const insufficientMaterials = calculatedIngredients.filter((i) => !i.is_sufficient)
    const canProduce = insufficientMaterials.length === 0

    return {
        recipe,
        quantity,
        total_volume_ml: totalVolumeMl,
        ingredients: calculatedIngredients,
        can_produce: canProduce,
        insufficient_materials: insufficientMaterials,
    }
}

/**
 * Calculate fixed unit cost of a raw material (per its native unit, e.g., per ml, gr, pcs, liter, kg)
 * Uses unit_cost if stored, otherwise total_cost / initial_stock (or stock if initial_stock unavailable).
 * Preserves stable unit cost as stock is consumed during production.
 */
export function getRawMaterialUnitCost(material: RawMaterial): number {
    const baseQuantity = (material.initial_stock && material.initial_stock > 0)
        ? material.initial_stock
        : (material.stock > 0 ? material.stock : 1)
    const totalCost = material.total_cost ?? 0
    return baseQuantity > 0 ? totalCost / baseQuantity : 0
}

/**
 * Validate that percentage ingredients sum to 100%
 */
export function validatePercentageIngredients(
    ingredients: (RecipeIngredient & { raw_material?: RawMaterial })[]
): { valid: boolean; sum: number; message?: string } {
    // Only filter ingredients that are percentage-based and belong to liquid phase (essence, alcohol, other liquid)
    const percentageIngredients = ingredients.filter(
        (i) => i.quantity_type === 'percentage' && (!i.raw_material || i.raw_material.type !== 'bottle' && i.raw_material.type !== 'packaging')
    )

    if (percentageIngredients.length === 0) {
        return { valid: true, sum: 0 }
    }

    const sum = percentageIngredients.reduce((acc, i) => acc + i.quantity, 0)

    if (Math.abs(sum - 100) > 0.01) {
        return {
            valid: false,
            sum,
            message: `Sıvı formülasyon yüzdesi %${sum.toFixed(2)} oldu (%100 olmalıdır)`,
        }
    }

    return { valid: true, sum }
}

/**
 * Calculate the cost of producing a batch
 * Uses stable unit cost per raw material unit to avoid inflation on stock consumption
 */
export function calculateProductionCost(
    ingredients: (RecipeIngredient & { raw_material: RawMaterial })[],
    bottleSizeMl: number,
    quantity: number
): number {
    return ingredients.reduce((total, ingredient) => {
        // Get required quantity in ml first (internal calculation unit)
        const requiredQuantityMl = calculateIngredientQuantity(
            ingredient,
            bottleSizeMl,
            quantity
        )

        // Convert required quantity from ml back to the material's original unit
        const requiredInOriginalUnit = convertFromMl(
            requiredQuantityMl,
            ingredient.raw_material.unit
        )

        // Calculate cost per original unit cleanly
        const costPerUnit = getRawMaterialUnitCost(ingredient.raw_material)

        return total + requiredInOriginalUnit * costPerUnit
    }, 0)
}
