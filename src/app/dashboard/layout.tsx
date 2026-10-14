import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google"
import type { Metadata } from "next"
import { AppSidebar } from '@/components/layout/app-sidebar'

export const metadata: Metadata = {
    title: "Yönetim Paneli",
    robots: { index: false, follow: false },
}

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
        <div className={`${spaceGrotesk.variable} ${plexMono.variable} font-storefront bg-paper text-ink min-h-screen`}>
            <AppSidebar>{children}</AppSidebar>
        </div>
    )
}
