/**
 * Sanitizes user input by escaping HTML special characters to prevent XSS attacks.
 */
export function escapeHtml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

/**
 * Strips all HTML tags from a string.
 */
export function stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '')
}

/**
 * Sanitizes a string for safe use: trims, strips HTML, limits length.
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
    return stripHtml(input).trim().substring(0, maxLength)
}
