'use client'

import Image from 'next/image'

type ThemeLogoProps = {
    className?: string
    priority?: boolean
}

/** Ashi Aura logo from the brand package: ink on light theme, cream on dark */
export function ThemeLogo({ className, priority = false }: ThemeLogoProps) {
    return (
        <>
            <Image
                src="/brand/logo-ink.svg"
                alt="Ashi Aura"
                width={2646}
                height={1480}
                unoptimized
                priority={priority}
                className={`block dark:hidden ${className || ''}`}
            />
            <Image
                src="/brand/logo-cream.svg"
                alt="Ashi Aura"
                width={2646}
                height={1480}
                unoptimized
                priority={priority}
                className={`hidden dark:block ${className || ''}`}
            />
        </>
    )
}
