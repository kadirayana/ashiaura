import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from './config'

export function createClient() {
  const { url, anonKey } = getSupabaseConfig({ allowBuildFallback: true })

  return createBrowserClient(url, anonKey)
}
