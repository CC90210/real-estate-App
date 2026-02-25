'use client'

import { NotificationBell } from '@/components/notifications/NotificationBell'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'
import {
    Menu,
    Search,
    LayoutDashboard,
    MapPin,
    Home,
    ClipboardList,
    CheckCircle,
    Calendar,
    FileText,
    Receipt,
    Users,
    Zap,
    Settings,
    LogOut,
    Building2,
    ChevronRight,
    Wrench,
    BookOpen,
    BarChart3,
    Activity,
    Share2
} from 'lucide-react'

const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Areas', href: '/areas', icon: MapPin },
    { name: 'Properties', href: '/properties', icon: Home },
    { name: 'Applications', href: '/applications', icon: ClipboardList },
    { name: 'Approvals', href: '/approvals', icon: CheckCircle },
    { name: 'Leases', href: '/leases', icon: BookOpen },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench },
    { name: 'Showings', href: '/showings', icon: Calendar },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Invoices', href: '/invoices', icon: Receipt },
    { name: 'Landlords', href: '/landlords', icon: Users },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Activity', href: '/activity', icon: Activity },
    { name: 'Automations', href: '/automations', icon: Zap },
    { name: 'Social', href: '/social', icon: Share2 },
    { name: 'Settings', href: '/settings', icon: Settings },
]

interface MobileHeaderProps {
    onQuickFindOpen: () => void
    companyName?: string
    userName?: string
}

export function MobileHeader({ onQuickFindOpen, companyName, userName }: MobileHeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleNavigation = (href: string) => {
        setMenuOpen(false)
        router.push(href)
    }

    return (
        <>
            {/* Fixed Header Bar */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm h-14 px-4 flex items-center justify-between lg:hidden safe-top">

                {/* Left: Hamburger Menu */}
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 -ml-2"
                            aria-label="Open menu"
                        >
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>

                    <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
                        {/* Menu Header */}
                        <SheetHeader className="p-4 border-b bg-gray-50">
                            <SheetTitle className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                    <Building2 className="h-6 w-6 text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold">PropFlow</p>
                                    <p className="text-xs text-gray-500 font-normal">
                                        {companyName || 'Property Management'}
                                    </p>
                                </div>
                            </SheetTitle>
                        </SheetHeader>

                        {/* Navigation Items - Scrollable */}
                        <nav className="flex-1 overflow-y-auto py-2">
                            {navigationItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href ||
                                    (pathname?.startsWith(item.href + '/') || false)

                                return (
                                    <button
                                        key={item.href}
                                        onClick={() => handleNavigation(item.href)}
                                        className={`w-full flex items-center gap-4 px-4 py-4 text-left transition-colors ${isActive
                                            ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                                            : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                                            }`}
                                    >
                                        <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                                        <span className="font-medium">{item.name}</span>
                                        <ChevronRight className={`h-4 w-4 ml-auto ${isActive ? 'text-blue-400' : 'text-gray-300'}`} />
                                    </button>
                                )
                            })}
                        </nav>

                        {/* User Section - Fixed at Bottom */}
                        <div className="border-t p-4 bg-gray-50 safe-bottom">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-11 w-11 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold">
                                        {userName?.[0]?.toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{userName || 'User'}</p>
                                    <p className="text-sm text-gray-500 truncate">{companyName}</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full h-11 justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-4 w-4 mr-3" />
                                Sign Out
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Center: Logo */}
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-lg">PropFlow</span>
                </Link>

                {/* Right: Notifications + Quick Find */}
                <div className="flex items-center gap-1">
                    <NotificationBell />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 -mr-2 bg-blue-50 hover:bg-blue-100"
                        onClick={onQuickFindOpen}
                        aria-label="Quick Find"
                    >
                        <Search className="h-5 w-5 text-blue-600" />
                    </Button>
                </div>
            </header>

            {/* Spacer to push content below fixed header */}
            <div className="h-14 lg:hidden" />
        </>
    )
}
