// Database types for Cloud Perfume ERP
// These types match the Supabase schema

export type MaterialType = 'essence' | 'alcohol' | 'bottle' | 'packaging' | 'other'
export type MaterialUnit = 'ml' | 'gr' | 'pcs' | 'liter' | 'kg'
export type QuantityType = 'percentage' | 'fixed'

export interface RawMaterial {
    id: string
    name: string
    type: MaterialType
    stock: number
    initial_stock: number | null
    unit: MaterialUnit
    unit_cost?: number | null
    total_cost: number | null  // Total cost for all stock (e.g., 850 TL for 11 liters)
    supplier: string | null
    notes: string | null
    created_at: string
    updated_at: string
}

export interface RawMaterialPurchase {
    id: string
    material_id: string
    quantity: number
    unit_cost: number
    total_cost: number
    supplier: string | null
    purchase_date: string
    batch_number: string | null
    notes: string | null
    created_at?: string
}

export interface Recipe {
    id: string
    name: string
    description: string | null
    bottle_size_ml: number | null
    gender: 'men' | 'women' | 'unisex' | 'kolonya' | null
    version: string | null
    revision_notes: string | null
    parent_recipe_id: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface RecipeIngredient {
    id: string
    recipe_id: string
    material_id: string
    quantity_type: QuantityType
    quantity: number
    notes: string | null
    created_at: string
    // Joined data
    raw_material?: RawMaterial
}

export interface Product {
    id: string
    recipe_id: string | null
    name: string
    stock: number
    unit_cost: number | null
    image_url: string | null
    hover_image_url: string | null
    gender: 'men' | 'women' | 'unisex' | 'kolonya' | null
    fragrantica_score: number | null
    fragrantica_url: string | null
    batch_number: string | null
    production_date: string | null
    notes: string | null
    bottle_size_ml: number | null
    description: string | null
    top_notes: string | null
    middle_notes: string | null
    base_notes: string | null
    /** Storefront name (supabase/ashi-names.sql); absent before that migration */
    ashi_name?: string | null
    /** false for Ashi's own scents: no "inspired by" line */
    is_inspired?: boolean
    created_at: string
    updated_at: string
    // Joined data
    recipe?: Recipe
}

export interface Customer {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    balance: number
    notes: string | null
    created_at: string
    updated_at: string
}

export interface Sale {
    id: string
    customer_id: string | null
    product_id: string
    quantity: number
    unit_cost: number | null
    unit_price: number | null
    total_price: number | null
    profit: number | null
    payment_amount: number | null
    sale_date: string
    notes: string | null
    created_at: string
    // Joined data
    customer?: Customer
    product?: Product
}

export interface ProductionBatch {
    id: string
    recipe_id: string
    product_id: string | null
    quantity_produced: number
    batch_number: string | null
    production_date: string
    notes: string | null
    ingredient_deductions: IngredientDeduction[] | null
    created_at: string
    // Joined data
    recipe?: Recipe
    product?: Product
}

export interface IngredientDeduction {
    material_id: string
    material_name: string
    quantity_deducted: number
    unit: MaterialUnit
}

// Form types
export interface RawMaterialFormData {
    name: string
    type: MaterialType
    stock: number
    unit: MaterialUnit
    total_cost?: number  // Total cost for all stock
    supplier?: string
    notes?: string
}

export interface RecipeFormData {
    name: string
    description?: string
    bottle_size_ml?: number | null
    gender?: 'men' | 'women' | 'unisex' | 'kolonya' | null
    version?: string
    revision_notes?: string
    parent_recipe_id?: string | null
    is_active: boolean
    ingredients: RecipeIngredientFormData[]
}

export interface RecipeIngredientFormData {
    material_id: string
    quantity_type: QuantityType
    quantity: number
    notes?: string
}

export interface ProductionFormData {
    recipe_id: string
    quantity: number
    batch_number?: string
    notes?: string
}

export interface SaleFormData {
    customer_id?: string
    product_id: string
    quantity: number
    unit_price?: number
    payment_amount?: number
    notes?: string
}

export interface CustomerFormData {
    name: string
    email?: string
    phone?: string
    address?: string
    balance?: number
    notes?: string
}

// Calculation types
export interface CalculatedIngredient {
    material_id: string
    material_name: string
    required_quantity: number      // In original unit
    required_quantity_ml?: number  // Converted to ml for comparison
    available_stock: number        // In original unit
    available_stock_ml?: number    // Converted to ml for comparison
    unit: MaterialUnit
    is_sufficient: boolean
    raw_material?: RawMaterial
}

export interface ProductionCalculation {
    recipe: Recipe
    quantity: number
    total_volume_ml: number
    ingredients: CalculatedIngredient[]
    can_produce: boolean
    insufficient_materials: CalculatedIngredient[]
}
