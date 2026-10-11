'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'

function getSessionId(): string {
    if (typeof window === 'undefined') return ''
    const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
    try {
        const stored = localStorage.getItem('analytics_session')
        if (stored) {
            const { id, lastActivity } = JSON.parse(stored)
            if (Date.now() - lastActivity < SESSION_TIMEOUT) {
                // Still active — refresh lastActivity
                localStorage.setItem('analytics_session', JSON.stringify({ id, lastActivity: Date.now() }))
                return id
            }
        }
    } catch {
        // Corrupted data — create new session
    }
    // Create new session
    const newId = crypto.randomUUID()
    localStorage.setItem('analytics_session', JSON.stringify({ id: newId, lastActivity: Date.now() }))
    // Clean up old key if exists
    localStorage.removeItem('analytics_session_id')
    return newId
}

// Güvenilir veri gönderme — sendBeacon destekliyorsa onu kullan
function sendAnalytics(url: string, data: Record<string, unknown>) {
    const body = JSON.stringify(data)

    // sendBeacon sayfa kapatılırken bile veriyi gönderir
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' })
        const sent = navigator.sendBeacon(url, blob)
        if (sent) return
    }

    // Fallback: fetch ile gönder
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true, // Sayfa geçişlerinde isteğin iptal olmasını engeller
    }).catch((err) => {
        console.warn('[Analytics]', url, 'gönderim hatası:', err)
    })
}

export function AnalyticsTracker() {
    const pathname = usePathname()
    const lastTrackedPath = useRef<string | null>(null)
    const clickQueue = useRef<Array<Record<string, unknown>>>([])
    const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Sayfa görüntüleme kaydı
    useEffect(() => {
        // Dashboard ve login sayfalarında çalışma
        if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/login')) return
        // Aynı sayfa tekrar track etme
        if (lastTrackedPath.current === pathname) return
        lastTrackedPath.current = pathname

        const sessionId = getSessionId()
        if (!sessionId) return

        sendAnalytics('/api/analytics/pageview', {
            session_id: sessionId,
            page_path: pathname,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
            screen_width: window.screen.width,
            screen_height: window.screen.height,
        })
    }, [pathname])

    // Tıklama queue'sunu flush et
    const flushClicks = useCallback(() => {
        const queue = clickQueue.current.splice(0)
        if (queue.length === 0) return

        queue.forEach((click) => {
            sendAnalytics('/api/analytics/click', click)
        })
    }, [])

    // Tıklama dinleyicisi
    useEffect(() => {
        if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/login')) return

        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target) return

            const sessionId = getSessionId()
            if (!sessionId) return

            clickQueue.current.push({
                session_id: sessionId,
                page_path: pathname,
                element_tag: target.tagName,
                element_text: (target.textContent || '').trim().substring(0, 200),
                element_id: target.id || null,
                x_position: Math.round(e.pageX),
                y_position: Math.round(e.pageY),
                page_width: document.documentElement.scrollWidth,
                page_height: document.documentElement.scrollHeight,
            })

            if (flushTimer.current) clearTimeout(flushTimer.current)
            flushTimer.current = setTimeout(flushClicks, 1000)
        }

        document.addEventListener('click', handleClick, { passive: true })

        // Sayfa kapatılırken kuyruktaki verileri gönder
        const handleBeforeUnload = () => {
            flushClicks()
        }
        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            document.removeEventListener('click', handleClick)
            window.removeEventListener('beforeunload', handleBeforeUnload)
            if (flushTimer.current) {
                clearTimeout(flushTimer.current)
                flushClicks()
            }
        }
    }, [pathname, flushClicks])

    return null
}
