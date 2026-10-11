'use client'

import React, { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle({ className }: { className?: string }) {
    const [theme, setTheme] = useState<'light' | 'dark'>('light')

    useEffect(() => {
        // Detect initial theme on mount
        const isDark = document.documentElement.classList.contains('dark')
        setTheme(isDark ? 'dark' : 'light')

        // Listen for OS system theme changes dynamically
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        const handleChange = (e: MediaQueryListEvent) => {
            // Only follow system changes if the user has not manually locked a preference
            if (!localStorage.getItem('theme')) {
                if (e.matches) {
                    document.documentElement.classList.add('dark')
                    setTheme('dark')
                } else {
                    document.documentElement.classList.remove('dark')
                    setTheme('light')
                }
            }
        }

        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    const toggleTheme = () => {
        const isDark = document.documentElement.classList.contains('dark')
        if (isDark) {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
            setTheme('light')
        } else {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
            setTheme('dark')
        }
    }

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-md hover:bg-ink/5 text-sand hover:text-ink transition-colors cursor-pointer flex items-center justify-center ${className || ''}`}
            aria-label="Gece modu değiştir"
        >
            {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-rust" />
            ) : (
                <Moon className="w-4 h-4 text-sand" />
            )}
        </button>
    )
}
