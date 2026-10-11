'use client'

import Image from 'next/image'

type ThemeLogoProps = {
    className?: string
    priority?: boolean
}

export function ThemeLogo({ className, priority = false }: ThemeLogoProps) {
    return (
        <>
            <Image
                src="/logo-light.png"
                alt="Ashi Aura"
                width={412}
                height={183}
                priority={priority}
                className={`block dark:hidden ${className || ''}`}
            />
            <Image
                src="/logo-dark.png"
                alt="Ashi Aura"
                width={412}
                height={183}
                priority={priority}
                className={`hidden dark:block ${className || ''}`}
            />
        </>
    )
}
