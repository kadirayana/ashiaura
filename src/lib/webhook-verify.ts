import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Webhook signature verification utility.
 * Use this to verify that incoming webhook requests are genuine.
 *
 * Supports:
 * - Stripe-style HMAC-SHA256 signatures
 * - Iyzico/generic HMAC signatures
 *
 * Usage:
 * ```ts
 * import { verifyWebhookSignature } from '@/lib/webhook-verify'
 *
 * export async function POST(request: Request) {
 *   const body = await request.text()
 *   const signature = request.headers.get('stripe-signature') || ''
 *   const secret = process.env.STRIPE_WEBHOOK_SECRET!
 *
 *   if (!verifyWebhookSignature(body, signature, secret)) {
 *     return new Response('Invalid signature', { status: 401 })
 *   }
 *
 *   // Process the webhook...
 * }
 * ```
 */

/**
 * Verify a generic HMAC-SHA256 webhook signature.
 */
export function verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm: string = 'sha256'
): boolean {
    if (!payload || !signature || !secret) {
        return false
    }

    try {
        const expectedSignature = createHmac(algorithm, secret)
            .update(payload, 'utf8')
            .digest('hex')

        const sigBuffer = Buffer.from(signature, 'hex')
        const expectedBuffer = Buffer.from(expectedSignature, 'hex')

        if (sigBuffer.length !== expectedBuffer.length) {
            return false
        }

        return timingSafeEqual(sigBuffer, expectedBuffer)
    } catch {
        return false
    }
}

/**
 * Verify a Stripe webhook signature.
 * Stripe signatures have the format: t=timestamp,v1=signature
 */
export function verifyStripeSignature(
    payload: string,
    signatureHeader: string,
    secret: string,
    toleranceSeconds: number = 300 // 5 minutes
): boolean {
    if (!payload || !signatureHeader || !secret) {
        return false
    }

    try {
        const parts = signatureHeader.split(',')
        const timestampPart = parts.find(p => p.startsWith('t='))
        const signaturePart = parts.find(p => p.startsWith('v1='))

        if (!timestampPart || !signaturePart) {
            return false
        }

        const timestamp = parseInt(timestampPart.substring(2), 10)
        const signature = signaturePart.substring(3)

        // Check timestamp tolerance
        const now = Math.floor(Date.now() / 1000)
        if (Math.abs(now - timestamp) > toleranceSeconds) {
            return false
        }

        // Compute expected signature
        const signedPayload = `${timestamp}.${payload}`
        const expectedSignature = createHmac('sha256', secret)
            .update(signedPayload, 'utf8')
            .digest('hex')

        const sigBuffer = Buffer.from(signature, 'hex')
        const expectedBuffer = Buffer.from(expectedSignature, 'hex')

        if (sigBuffer.length !== expectedBuffer.length) {
            return false
        }

        return timingSafeEqual(sigBuffer, expectedBuffer)
    } catch {
        return false
    }
}
