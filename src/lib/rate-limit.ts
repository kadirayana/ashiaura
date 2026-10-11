/**
 * Simple in-memory sliding window rate limiter for Next.js edge/server.
 * Suitable for single-instance deployments (Vercel serverless).
 *
 * For multi-instance deployments, consider using Redis-based rate limiting.
 */

interface RateLimitEntry {
    count: number
    resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Periodically clean up expired entries to prevent memory leak
const CLEANUP_INTERVAL_MS = 60_000 // 1 minute
let lastCleanup = Date.now()

function cleanupExpiredEntries() {
    const now = Date.now()
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return

    lastCleanup = now
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key)
        }
    }
}

interface RateLimitConfig {
    /** Maximum number of requests in the window */
    maxRequests: number
    /** Window size in seconds */
    windowSizeSeconds: number
}

interface RateLimitResult {
    allowed: boolean
    remaining: number
    resetTime: number
}

/**
 * Check if a request from the given identifier is within rate limits.
 *
 * @param identifier - Unique identifier for rate limiting (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Result indicating if the request is allowed
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    cleanupExpiredEntries()

    const now = Date.now()
    const windowMs = config.windowSizeSeconds * 1000
    const key = identifier

    const existing = rateLimitStore.get(key)

    if (!existing || now > existing.resetTime) {
        // Start a new window
        const entry: RateLimitEntry = {
            count: 1,
            resetTime: now + windowMs,
        }
        rateLimitStore.set(key, entry)
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetTime: entry.resetTime,
        }
    }

    // Within existing window
    existing.count++

    if (existing.count > config.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetTime: existing.resetTime,
        }
    }

    return {
        allowed: true,
        remaining: config.maxRequests - existing.count,
        resetTime: existing.resetTime,
    }
}

/**
 * Extract client IP from Next.js request headers.
 */
export function getClientIp(headers: Headers): string {
    return (
        headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headers.get('x-real-ip') ||
        headers.get('cf-connecting-ip') ||
        'unknown'
    )
}

// Preset rate limit configurations
export const RATE_LIMITS = {
    /** Login: 5 attempts per 15 minutes */
    login: { maxRequests: 5, windowSizeSeconds: 900 } as RateLimitConfig,
    /** API general: 60 requests per minute */
    api: { maxRequests: 60, windowSizeSeconds: 60 } as RateLimitConfig,
    /** Analytics: 120 requests per minute (higher for pageview/click tracking) */
    analytics: { maxRequests: 120, windowSizeSeconds: 60 } as RateLimitConfig,
} as const
