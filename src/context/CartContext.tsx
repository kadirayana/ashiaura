'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Product } from '@/types/database'
import type { CartItemKind } from '@/lib/pricing'
import { toast } from 'sonner'

export interface CartItem {
    product_id: string
    kind: CartItemKind
    name: string
    bottle_size_ml: number | null
    image_url: string | null
    gender: string | null
    quantity: number
    stock: number
    unit_cost?: number | null
}

type CartProduct = Product | { id: string; name: string; bottle_size_ml?: number | null; image_url?: string | null; gender?: string | null; stock?: number; unit_cost?: number | null }

interface CartContextType {
    items: CartItem[]
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    addToCart: (product: CartProduct, quantity?: number, kind?: CartItemKind) => void
    removeFromCart: (key: string) => void
    updateQuantity: (key: string, quantity: number) => void
    clearCart: () => void
    totalCount: number
    /** Scent chosen for each free tester slot (index = slot) */
    giftTesters: string[]
    setGiftTester: (index: number, scent: string) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'kadir_ayana_perfume_cart'
const GIFT_STORAGE_KEY = 'kadir_ayana_perfume_gift_testers'
const MAX_TESTERS_PER_SCENT = 10

export function cartItemKey(item: { product_id: string; kind?: CartItemKind }) {
    return `${item.product_id}:${item.kind ?? 'bottle'}`
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([])
    const [giftTesters, setGiftTesters] = useState<string[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY)
            if (saved) {
                // Carts saved before testers existed have no kind
                setItems((JSON.parse(saved) as CartItem[]).map(i => ({ ...i, kind: i.kind ?? 'bottle' })))
            }
            const savedGifts = localStorage.getItem(GIFT_STORAGE_KEY)
            if (savedGifts) setGiftTesters(JSON.parse(savedGifts))
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
            localStorage.setItem(GIFT_STORAGE_KEY, JSON.stringify(giftTesters))
        } catch (e) {
            console.error('Failed to save cart to localStorage', e)
        }
    }, [items, giftTesters, isLoaded])

    const addToCart = (product: CartProduct, quantity: number = 1, kind: CartItemKind = 'bottle') => {
        // Testers are filled from essence, not from bottle stock
        const availableStock = kind === 'tester'
            ? MAX_TESTERS_PER_SCENT
            : product.stock !== undefined ? product.stock : 99
        if (availableStock <= 0) {
            toast.error('Bu ürün maalesef stokta tükenmiştir.')
            return
        }

        const label = kind === 'tester' ? `${product.name} (3ml tester)` : product.name

        setItems(prevItems => {
            const key = cartItemKey({ product_id: product.id, kind })
            const existingIndex = prevItems.findIndex(i => cartItemKey(i) === key)
            if (existingIndex > -1) {
                const currentQty = prevItems[existingIndex].quantity
                const newQty = Math.min(currentQty + quantity, availableStock)
                if (currentQty >= availableStock) {
                    toast.info(`Maksimum adede (${availableStock}) ulaştınız.`)
                    return prevItems
                }
                const updated = [...prevItems]
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: newQty,
                    stock: availableStock,
                }
                toast.success(`${label} sepet miktarı artırıldı! (${newQty} adet)`)
                return updated
            } else {
                toast.success(`${label} sepete eklendi!`)
                return [
                    ...prevItems,
                    {
                        product_id: product.id,
                        kind,
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

    const removeFromCart = (key: string) => {
        setItems(prev => prev.filter(i => cartItemKey(i) !== key))
        toast.info('Ürün sepetten çıkarıldı.')
    }

    const updateQuantity = (key: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(key)
            return
        }
        setItems(prev =>
            prev.map(i => {
                if (cartItemKey(i) === key) {
                    const finalQty = Math.min(quantity, i.stock || 99)
                    return { ...i, quantity: finalQty }
                }
                return i
            })
        )
    }

    const setGiftTester = (index: number, scent: string) => {
        setGiftTesters(prev => {
            const next = [...prev]
            next[index] = scent
            return next
        })
    }

    const clearCart = () => {
        setItems([])
        setGiftTesters([])
        try {
            localStorage.removeItem(CART_STORAGE_KEY)
            localStorage.removeItem(GIFT_STORAGE_KEY)
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
                giftTesters,
                setGiftTester,
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
