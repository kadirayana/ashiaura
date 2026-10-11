'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from '@/components/ui/sidebar'
import {
    Home,
    FlaskConical,
    Package,
    Factory,
    Users,
    ShoppingCart,
    LogOut,
    MessageSquare,
    List,
    TestTubeDiagonal,
    MapPin,
} from 'lucide-react'

const navigation = [
    {
        title: 'Overview',
        items: [
            { name: 'Dashboard', href: '/dashboard', icon: Home },
        ],
    },
    {
        title: 'Inventory',
        items: [
            { name: 'Raw Materials', href: '/dashboard/inventory', icon: TestTubeDiagonal },
            { name: 'Stock', href: '/dashboard/stock', icon: Package },
            { name: 'Tracker', href: '/dashboard/products-tracker', icon: MapPin },
        ],
    },
    {
        title: 'Formulation',
        items: [
            { name: 'Recipes', href: '/dashboard/recipes', icon: FlaskConical },
            { name: 'Production', href: '/dashboard/production', icon: Factory },
        ],
    },
    {
        title: 'Sales',
        items: [
            { name: 'Customers', href: '/dashboard/customers', icon: Users },
            { name: 'Sales', href: '/dashboard/sales', icon: ShoppingCart },
            { name: 'Requests', href: '/dashboard/requests', icon: MessageSquare },
            { name: 'Essence List', href: '/dashboard/essence-list', icon: List },
        ],
    },
]

export function AppSidebar({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()

    const handleSignOut = async () => {
        try {
            const supabase = createClient()
            await supabase.auth.signOut()
        } catch (err) {
            console.error('Sign out error:', err)
        }
        window.location.href = '/auth/signout'
    }

    return (
        <SidebarProvider>
            <Sidebar className="border-r border-hairline">
                <SidebarHeader className="border-b border-hairline p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rust to-rust/80 flex items-center justify-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-5 h-5 text-paper"
                            >
                                <path d="M12 2C13.1 2 14 2.9 14 4V5.5C14 5.5 18 7 18 12V17L20 19V20H4V19L6 17V12C6 7 10 5.5 10 5.5V4C10 2.9 10.9 2 12 2ZM12 22C10.9 22 10 21.1 10 20H14C14 21.1 13.1 22 12 22Z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="font-semibold text-ink">Kadir Ayana Parfumes</h2>
                            <p className="text-xs text-sand">Yönetim Paneli</p>
                        </div>
                    </div>
                </SidebarHeader>
                <SidebarContent className="p-2">
                    {navigation.map((group) => (
                        <SidebarGroup key={group.title}>
                            <SidebarGroupLabel className="text-sand/70 text-xs font-semibold uppercase tracking-wider px-2">
                                {group.title}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {group.items.map((item) => (
                                        <SidebarMenuItem key={item.name}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={pathname === item.href}
                                                className={cn(
                                                    'transition-colors',
                                                    pathname === item.href
                                                        ? 'bg-rust/10 text-rust font-semibold'
                                                        : 'text-sand hover:text-ink hover:bg-black/5'
                                                )}
                                            >
                                                <Link href={item.href}>
                                                    <item.icon className="w-4 h-4" />
                                                    <span>{item.name}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    ))}
                </SidebarContent>
                <SidebarFooter className="border-t border-hairline p-4">
                    <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="w-full justify-start text-sand hover:text-ink hover:bg-black/5"
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset className="bg-paper text-ink flex flex-col min-w-0">
                <header className="flex h-14 items-center justify-between border-b border-hairline px-3 sm:px-4 md:px-6 sticky top-0 z-30 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <SidebarTrigger className="text-sand hover:text-ink h-9 w-9" />
                        <div className="md:hidden flex items-center gap-2">
                            <span className="font-bold text-sm text-ink font-storefront">Kadir Ayana</span>
                            <span className="text-[10px] uppercase font-mono tracking-wider text-rust bg-rust/10 px-1.5 py-0.5 rounded">ERP</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8 w-full max-w-[1600px] mx-auto min-w-0">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}

