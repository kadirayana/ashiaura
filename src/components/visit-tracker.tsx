'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UAParser } from 'ua-parser-js'

export function VisitTracker() {
    const pathname = usePathname()

    useEffect(() => {
        const trackVisit = async () => {
            // Get client-side user agent and parse it
            const parser = new UAParser(window.navigator.userAgent);
            const result = parser.getResult();

            const supabase = createClient()

            try {
                await supabase.from('page_visits').insert({
                    path: pathname,
                    device_type: result.device.type || 'desktop',
                    browser: result.browser.name || 'Unknown',
                    os: result.os.name || 'Unknown',
                    user_agent: window.navigator.userAgent,
                })
            } catch (error) {
                console.error('Failed to log visit:', error)
            }
        }

        trackVisit()
    }, [pathname])

    return null
}

