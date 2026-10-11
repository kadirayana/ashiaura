'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'
import { ThemeLogo } from '@/components/theme-logo'
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google"

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["400", "500", "700"],
})

const plexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
})

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError) {
            setError(authError.message === 'Invalid login credentials' ? 'Geçersiz e-posta adresi veya şifre.' : authError.message)
            setLoading(false)
            return
        }

        // Authorization is enforced server-side by middleware
        router.push('/dashboard')
        router.refresh()
    }

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center bg-paper text-ink p-4 relative transition-colors duration-300 ${spaceGrotesk.className}`}>
            {/* Top Right Theme Toggle */}
            <div className="absolute top-4 right-4">
                <ThemeToggle className="border border-hairline/60 bg-paper/50 backdrop-blur-sm" />
            </div>

            {/* Subtle Ledger Grid Background */}
            <div className="absolute inset-0 bg-[radial-gradient(#b9b4a4_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

            <div className="w-full max-w-md z-10">
                <Card className="bg-paper border border-hairline/80 shadow-md rounded-lg overflow-hidden relative">
                    {/* Editorial top accent line */}
                    <div className="h-1 bg-rust w-full" />
                    
                    <CardHeader className="text-center pt-8 pb-4">
                        <div className="mx-auto w-32 h-16 mb-4 border border-hairline/60 bg-paper flex items-center justify-center shadow-inner px-3">
                            <ThemeLogo className="w-full h-auto object-contain" />
                        </div>
                        <CardTitle className="text-xl font-bold tracking-tight text-ink font-storefront uppercase">
                            Kadir Ayana Parfumes
                        </CardTitle>
                        <CardDescription className="text-sand text-xs tracking-widest font-mono uppercase mt-1">
                            Sistem Giriş Yetkilendirmesi
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="px-8 pb-8">
                        {error && (
                            <div className="mb-5 p-3.5 rounded border border-rust/20 bg-rust/5 text-rust text-xs font-medium">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-sand text-xs font-mono uppercase tracking-wider">
                                    E-Posta Adresi
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="ornek@kadirayana.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-paper border-hairline text-ink placeholder:text-sand/50 focus:border-rust focus:ring-1 focus:ring-rust h-10 text-sm rounded transition-colors"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="password" className="text-sand text-xs font-mono uppercase tracking-wider">
                                        Şifre
                                    </Label>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-paper border-hairline text-ink placeholder:text-sand/50 focus:border-rust focus:ring-1 focus:ring-rust h-10 text-sm rounded transition-colors"
                                />
                            </div>

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-rust hover:bg-rust/95 text-paper font-mono uppercase text-xs tracking-wider h-11 transition-all shadow-sm active:translate-y-[1px] disabled:opacity-50 cursor-pointer"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-3.5 w-3.5 text-paper" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Giriş Yapılıyor...
                                        </span>
                                    ) : (
                                        'Yönetim Paneline Giriş'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Footer certificate notice */}
                <p className="text-center text-[10px] text-sand/80 font-mono mt-6 tracking-wide">
                    LOT NO: SECURE-AUTH-2026. TÜM HAKLARI SAKLIDIR.
                </p>
            </div>
        </div>
    )
}
