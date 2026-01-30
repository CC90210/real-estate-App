'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Map,
    Building2,
    FileText,
    Users,
    Settings,
    LogOut,
    Menu,
    ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

const navItems = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        label: 'Areas',
        href: '/areas',
        icon: Map,
    },
    {
        label: 'Applications',
        href: '/applications',
        icon: Users,
    },
    {
        label: 'Documents',
        href: '/documents',
        icon: FileText,
    },
    {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
    },
];

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <aside className={cn("flex flex-col h-full bg-[#f8fafc] border-r border-[#e2e8f0]", className)}>
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                        <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">PropFlow</span>
                </div>
            </div>

            <nav className="flex-1 px-4 py-2 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link key={item.href} href={item.href}>
                            <div
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-50 text-blue-600"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-slate-500")} />
                                {item.label}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-200">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50"
                    onClick={handleSignOut}
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </Button>
            </div>
        </aside>
    );
}

export function MobileNav() {
    const [open, setOpen] = useState(false);

    return (
        <div className="lg:hidden flex items-center justify-between p-4 border-b bg-white sticky top-0 z-40 text-slate-900">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold">PropFlow</span>
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="w-6 h-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                    <Sidebar />
                </SheetContent>
            </Sheet>
        </div>
    );
}
