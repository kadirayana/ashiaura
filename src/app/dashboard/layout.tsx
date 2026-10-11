import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google"
import { AppSidebar } from '@/components/layout/app-sidebar'

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["400", "500", "700"],
    variable: "--font-space-grotesk",
})

const plexMono = IBM_Plex_Mono({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    variable: "--font-plex-mono",
})

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div 
            className={`${spaceGrotesk.variable} ${plexMono.variable} font-storefront bg-paper text-ink min-h-screen`}
            style={{
                '--sidebar': '#f5f3ec',
                '--sidebar-foreground': '#1d1b16',
                '--sidebar-border': '#b9b4a4',
                '--sidebar-accent': '#e3e0d2',
                '--sidebar-accent-foreground': '#8a1f0e',
            } as React.CSSProperties}
        >
            <AppSidebar>{children}</AppSidebar>
        </div>
    )
}
