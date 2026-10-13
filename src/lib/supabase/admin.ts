import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './config'

/**
 * Service-role client for trusted server code that runs without a user session
 * (Shopier webhook, attaching checkout data to an order). Bypasses RLS — never
 * import this from client components.
 */
export function createAdminClient() {
    const { url } = getSupabaseConfig()
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
    }
    return createSupabaseClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
}
