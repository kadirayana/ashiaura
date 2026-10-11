'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { submitRequest } from '@/app/actions'

export function RequestPopup() {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [showPulse, setShowPulse] = useState(true)
    const popupRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen) setShowPulse(false)
    }, [isOpen])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    useEffect(() => {
        function handleEscape(e: KeyboardEvent) {
            if (e.key === 'Escape') setIsOpen(false)
        }
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [])

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const result = await submitRequest(formData)
        setLoading(false)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(result.message)
            const form = document.getElementById('request-popup-form') as HTMLFormElement
            form?.reset()
            setTimeout(() => setIsOpen(false), 1500)
        }
    }

    return (
        <div ref={popupRef} className="fixed bottom-5 right-5 z-50" id="request-popup">
            {/*
                The FAB toggle button is placed first in DOM order (before the popup
                panel) so that `document.querySelector('#request-popup button')` —
                used by Navbar's handleRequestClick — resolves to this toggle button
                rather than the panel's inner close/submit buttons. Its explicit
                `relative z-10` keeps it painted above the panel in their small
                overlap zone, preserving the original visual stacking.
            */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative z-10 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center border-2 ${isOpen ? 'bg-paper border-ink' : 'bg-rust border-rust hover:bg-ink hover:border-ink hover:scale-110'
                    }`}
                aria-label="Parfüm Talebi"
            >
                {showPulse && !isOpen && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-rust/30" />
                )}

                {isOpen ? (
                    <svg className="w-6 h-6 text-ink" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6 text-paper" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                )}
            </button>

            <div
                className={`absolute bottom-16 right-0 transition-all duration-300 ease-out origin-bottom-right ${isOpen
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
                    }`}
            >
                <div className="w-[340px] sm:w-[380px] max-h-[calc(100vh-120px)] overflow-y-auto bg-paper border-2 border-ink shadow-xl">
                    <div className="sticky top-0 bg-paper p-5 pb-3 border-b border-ink z-10">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-ink">Parfüm Talebi</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-sand hover:text-ink transition-colors p-1"
                                aria-label="Kapat"
                            >
                                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="font-storefront-mono text-xs text-sand">Hayalinizdeki kokuyu bize anlatın</p>
                    </div>

                    <form id="request-popup-form" action={handleSubmit} className="p-5 space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="popup-customerName" className="font-storefront-mono text-[10px] text-sand tracking-wide">
                                İSİM SOYİSİM
                            </Label>
                            <Input
                                id="popup-customerName"
                                name="customerName"
                                required
                                className="h-10 bg-transparent border-0 border-b border-ink rounded-none px-0 text-ink placeholder:text-sand/60 focus-visible:ring-0 focus-visible:border-rust"
                                placeholder="Örn: Ahmet Yılmaz"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="popup-contactInfo" className="font-storefront-mono text-[10px] text-sand tracking-wide">
                                İLETİŞİM BİLGİSİ
                            </Label>
                            <Input
                                id="popup-contactInfo"
                                name="contactInfo"
                                required
                                className="h-10 bg-transparent border-0 border-b border-ink rounded-none px-0 text-ink placeholder:text-sand/60 focus-visible:ring-0 focus-visible:border-rust"
                                placeholder="Telefon veya E-posta"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="popup-requestDetails" className="font-storefront-mono text-[10px] text-sand tracking-wide">
                                HAYALİNİZDEKİ PARFÜM
                            </Label>
                            <Textarea
                                id="popup-requestDetails"
                                name="requestDetails"
                                required
                                className="bg-transparent border-0 border-b border-ink rounded-none px-0 min-h-[80px] resize-none text-ink placeholder:text-sand/60 focus-visible:ring-0 focus-visible:border-rust"
                                placeholder="Hangi parfümü yapmamızı istersiniz? Nasıl notalar seversiniz?"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 bg-rust hover:bg-ink text-paper font-storefront-mono font-semibold text-sm tracking-wide rounded-none"
                        >
                            {loading ? 'GÖNDERİLİYOR…' : 'TALEBİ GÖNDER →'}
                        </Button>

                        <p className="font-storefront-mono text-[10px] text-center text-sand">
                            Talebiniz ulaştıktan sonra en kısa sürede iletişime geçeceğiz.
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}
