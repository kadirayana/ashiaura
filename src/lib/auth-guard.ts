import { createClient } from '@/lib/supabase/server'

/**
 * Verifies that the current request is from an authenticated admin user.
 * Returns the user object if authorized, or an error response object.
 */
export async function requireAdmin(): Promise<
    { authorized: true; user: { id: string; email: string } } |
    { authorized: false; error: string; status: number }
> {
    try {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
            return { authorized: false, error: 'Oturum açmanız gerekiyor.', status: 401 }
        }

        const allowedEmail = process.env.ALLOWED_EMAIL
        if (allowedEmail && user.email !== allowedEmail) {
            return { authorized: false, error: 'Bu işlem için yetkiniz yok.', status: 403 }
        }

        return {
            authorized: true,
            user: { id: user.id, email: user.email || '' }
        }
    } catch {
        return { authorized: false, error: 'Kimlik doğrulama hatası.', status: 500 }
    }
}

/**
 * Checks if the current user has a specific role.
 * Currently uses email-based check; can be extended with Supabase custom claims.
 */
export type UserRole = 'admin' | 'viewer'

export function getUserRole(email: string): UserRole {
    const adminEmail = process.env.ALLOWED_EMAIL
    if (adminEmail && email === adminEmail) {
        return 'admin'
    }
    return 'viewer'
}

export function hasPermission(role: UserRole, action: 'read' | 'write' | 'delete'): boolean {
    const permissions: Record<UserRole, Set<string>> = {
        admin: new Set(['read', 'write', 'delete']),
        viewer: new Set(['read']),
    }
    return permissions[role]?.has(action) ?? false
}
