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
