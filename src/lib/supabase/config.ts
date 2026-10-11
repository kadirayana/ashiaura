const BUILD_SUPABASE_URL = 'https://example.supabase.co'
const BUILD_SUPABASE_ANON_KEY = 'build-placeholder-anon-key'

export function getSupabaseConfig(options?: { allowBuildFallback?: boolean }) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (url && anonKey && !url.includes('your-project.supabase.co') && anonKey !== 'your-anon-key') {
        return { url, anonKey }
    }

    if (options?.allowBuildFallback && typeof window === 'undefined') {
        return { url: BUILD_SUPABASE_URL, anonKey: BUILD_SUPABASE_ANON_KEY }
    }

    throw new Error(
        'Supabase environment variables are missing or still use placeholder values. ' +
        'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel and .env.local.'
    )
}
