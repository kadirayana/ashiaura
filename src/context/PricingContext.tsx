'use client'

import React, { createContext, useContext } from 'react'
import type { PriceMap } from '@/lib/pricing'

export interface ScentOption {
    value: string
    label: string
}

interface PricingContextType {
    prices: PriceMap
    /** In-stock scents a customer can pick for gift testers: value = stored base name, label = Ashi name */
    scents: ScentOption[]
    /** Checkout sends the customer to Shopier to pay */
    onlinePayment: boolean
}

const PricingContext = createContext<PricingContextType>({ prices: {}, scents: [], onlinePayment: false })

export function PricingProvider({ prices, scents, onlinePayment, children }: PricingContextType & { children: React.ReactNode }) {
    return (
        <PricingContext.Provider value={{ prices, scents, onlinePayment }}>
            {children}
        </PricingContext.Provider>
    )
}

export function usePricing() {
    return useContext(PricingContext)
}
