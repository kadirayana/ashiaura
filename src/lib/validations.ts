import { z } from 'zod'

/**
 * Zod validation schemas for API input validation.
 * All user inputs are validated before being processed.
 */

// Sales API schema
export const salesSchema = z.object({
    product_id: z.string().uuid('Geçersiz ürün ID formatı.'),
    quantity: z.number().int().positive('Miktar pozitif bir tam sayı olmalı.').max(10000, 'Miktar çok büyük.'),
    customer_id: z.string().uuid('Geçersiz müşteri ID formatı.').nullable().optional(),
    unit_price: z.number().min(0, 'Birim fiyat negatif olamaz.').max(1_000_000, 'Fiyat çok büyük.').optional().default(0),
    payment_amount: z.number().min(0, 'Ödeme tutarı negatif olamaz.').max(1_000_000, 'Tutar çok büyük.').optional().default(0),
    notes: z.string().max(2000, 'Notlar en fazla 2000 karakter olabilir.').optional().default(''),
})

// Product request (storefront) schema
export const productRequestSchema = z.object({
    customerName: z.string().min(2, 'İsim en az 2 karakter olmalı.').max(200, 'İsim çok uzun.'),
    contactInfo: z.string().min(5, 'İletişim bilgisi en az 5 karakter olmalı.').max(500, 'İletişim bilgisi çok uzun.'),
    requestDetails: z.string().min(10, 'İstek detayı en az 10 karakter olmalı.').max(5000, 'İstek detayı çok uzun.'),
})

// Analytics click schema
export const clickEventSchema = z.object({
    session_id: z.string().min(1).max(200),
    page_path: z.string().min(1).max(500),
    element_tag: z.string().min(1).max(50),
    element_text: z.string().max(200).nullable().optional(),
    element_id: z.string().max(200).nullable().optional(),
    x_position: z.number().min(0).max(100000),
    y_position: z.number().min(0).max(100000),
    page_width: z.number().min(0).max(100000).optional().default(0),
    page_height: z.number().min(0).max(100000).optional().default(0),
})

// Analytics pageview schema
export const pageviewSchema = z.object({
    session_id: z.string().min(1).max(200),
    page_path: z.string().min(1).max(500),
    referrer: z.string().max(2000).nullable().optional(),
    user_agent: z.string().max(1000).nullable().optional(),
    screen_width: z.number().min(0).max(100000).nullable().optional(),
    screen_height: z.number().min(0).max(100000).nullable().optional(),
})

// Batch hover upload schema
export const batchHoverUploadSchema = z.object({
    imagePaths: z.record(
        z.string().max(50),
        z.string().max(500).refine(
            (path) => !path.includes('..') && !path.includes('~'),
            'Geçersiz dosya yolu.'
        )
    ),
})

export type SalesInput = z.infer<typeof salesSchema>
export type ProductRequestInput = z.infer<typeof productRequestSchema>
export type ClickEventInput = z.infer<typeof clickEventSchema>
export type PageviewInput = z.infer<typeof pageviewSchema>
