'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Product } from '@/types/database'
import { toast } from 'sonner'

export interface CartItem {
    product_id: string
    name: string
    bottle_size_ml: number | null
    image_url: string | null
    gender: string | null
    quantity: number
    stock: number
    unit_cost?: number | null
}

interface CartContextType {
    items: CartItem[]
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    addToCart: (product: Product | { id: string; name: string; bottle_size_ml?: number | null; image_url?: string | null; gender?: string | null; stock?: number; unit_cost?: number | null }, quantity?: number) => void
    removeFromCart: (productId: string) => void
    updateQuantity: (productId: string, quantity: number) => void
    clearCart: () => void
    totalCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'kadir_ayana_perfume_cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY)
            if (saved) {
                setItems(JSON.parse(saved))
            }
        } catch (e) {
            console.error('Failed to load cart from localStorage', e)
        } finally {
            setIsLoaded(true)
        }
    }, [])

    // Save to localStorage on change
    useEffect(() => {
        if (!isLoaded) return
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
        } catch (e) {
            console.error('Failed to save cart to localStorage', e)
        }
    }, [items, isLoaded])

    const addToCart = (
        product: Product | { id: string; name: string; bottle_size_ml?: number | null; image_url?: string | null; gender?: string | null; stock?: number; unit_cost?: number | null },
        quantity: number = 1
    ) => {
        const availableStock = product.stock !== undefined ? product.stock : 99
        if (availableStock <= 0) {
            toast.error('Bu ürün maalesef stokta tükenmiştir.')
            return
        }

        setItems(prevItems => {
            const existingIndex = prevItems.findIndex(i => i.product_id === product.id)
            if (existingIndex > -1) {
                const currentQty = prevItems[existingIndex].quantity
                const newQty = Math.min(currentQty + quantity, availableStock)
                if (currentQty >= availableStock) {
                    toast.info(`Maksimum stok adedine (${availableStock}) ulaştınız.`)
                    return prevItems
                }
                const updated = [...prevItems]
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: newQty,
                    stock: availableStock,
                }
                toast.success(`${product.name} sepet miktarı artırıldı! (${newQty} adet)`)
                return updated
            } else {
                toast.success(`${product.name} sepete eklendi!`)
                return [
                    ...prevItems,
                    {
                        product_id: product.id,
                        name: product.name,
                        bottle_size_ml: product.bottle_size_ml ?? null,
                        image_url: product.image_url ?? null,
                        gender: product.gender ?? null,
                        quantity: Math.min(quantity, availableStock),
                        stock: availableStock,
                        unit_cost: product.unit_cost ?? null,
                    },
                ]
            }
        })
        setIsOpen(true)
    }

    const removeFromCart = (productId: string) => {
        setItems(prev => prev.filter(i => i.product_id !== productId))
        toast.info('Ürün sepetten çıkarıldı.')
    }

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId)
            return
        }
        setItems(prev =>
            prev.map(i => {
                if (i.product_id === productId) {
                    const finalQty = Math.min(quantity, i.stock || 99)
                    return { ...i, quantity: finalQty }
                }
                return i
            })
        )
    }

    const clearCart = () => {
        setItems([])
        try {
            localStorage.removeItem(CART_STORAGE_KEY)
        } catch (e) {
            console.error(e)
        }
    }

    const totalCount = items.reduce((sum, i) => sum + i.quantity, 0)

    return (
        <CartContext.Provider
            value={{
                items,
                isOpen,
                setIsOpen,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                totalCount,
            }}
        >
            {children}
        </CartContext.Provider>
    )
}

export function useCart() {
    const context = useContext(CartContext)
    if (!context) {
        throw new Error('useCart must be used within a CartProvider')
    }
    return context
}
