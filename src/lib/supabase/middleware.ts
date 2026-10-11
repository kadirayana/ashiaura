import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig } from './config'

export async function updateSession(request: NextRequest) {
    const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL
    let config: ReturnType<typeof getSupabaseConfig>
    try {
        config = getSupabaseConfig()
    } catch (error) {
        console.error('[Supabase] Missing runtime configuration:', error)
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        config.url,
        config.anonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname
    const isLoginPage = pathname === '/login'
    const isAuthCallback = pathname.startsWith('/auth')
    const isDashboard = pathname.startsWith('/dashboard')
    const isPublicPage = pathname === '/' || pathname.startsWith('/_next') || pathname.startsWith('/api')

    // Allow auth callbacks
    if (isAuthCallback) {
        return supabaseResponse
    }

    // Public pages are always accessible
    if (isPublicPage && !isDashboard) {
        return supabaseResponse
    }

    const isDev = process.env.NODE_ENV === 'development'

    // If accessing dashboard without login, redirect to login
    if (isDashboard && !user && !isDev) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If user is logged in but email doesn't match, sign them out
    if (user && ALLOWED_EMAIL && user.email !== ALLOWED_EMAIL && isDashboard && !isDev) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'unauthorized')
        return NextResponse.redirect(url)
    }

    // If user is logged in and on login page, redirect to dashboard
    if (user && isLoginPage && !isDev) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
