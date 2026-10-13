'use client'

import React, { createContext, useContext } from 'react'
import type { PriceMap } from '@/lib/pricing'

interface PricingContextType {
    prices: PriceMap
    /** Scent names a customer can pick for testers */
    scents: string[]
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
