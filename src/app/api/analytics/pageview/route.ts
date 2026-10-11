import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { pageviewSchema } from '@/lib/validations'
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const clientIp = getClientIp(request.headers)
        const rateLimitResult = checkRateLimit(`pageview:${clientIp}`, RATE_LIMITS.analytics)
        if (!rateLimitResult.allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        }

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!url || !key) {
            console.error('[Analytics] Supabase env vars missing')
            return NextResponse.json({ error: 'Server config error' }, { status: 500 })
        }

        const supabase = createClient(url, key)
        const body = await request.json()

        // Input validation
        const parseResult = pageviewSchema.safeParse(body)
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
        }

        const { session_id, page_path, referrer, user_agent, screen_width, screen_height } = parseResult.data

        // IP adresini request header'larından al
        const ip_address = clientIp

        const { error } = await supabase.from('page_views').insert({
            session_id,
            ip_address,
            page_path,
            referrer: referrer || null,
            user_agent: user_agent || null,
            screen_width: screen_width || null,
            screen_height: screen_height || null,
        })

        if (error) {
            console.error('[Analytics] pageview insert error:', JSON.stringify(error))
            return NextResponse.json({ error: 'Kayıt hatası.' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[Analytics] pageview exception:', err)
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
}

