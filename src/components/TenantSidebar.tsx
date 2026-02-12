'use client'

import {
    LayoutDashboard,
    FileText,
    MessageSquare,
    Settings,
    LogOut,
    Home,
    Wrench,
    Bell,
    CreditCard
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/hooks/useUser';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import Link from 'next/link';

export function TenantSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { signOut } = useUser();
    const { colors } = useAccentColor();

    const navItems = [
        { label: 'Dashboard', icon: LayoutDashboard, href: '/tenant/dashboard' },
        { label: 'My Lease', icon: FileText, href: '/tenant/lease' },
        { label: 'Maintenance', icon: Wrench, href: '/tenant/maintenance' },
        { label: 'Payments', icon: CreditCard, href: '/tenant/payments' },
        { label: 'Inbox', icon: MessageSquare, href: '/tenant/inbox' },
        { label: 'Settings', icon: Settings, href: '/tenant/settings' },
    ];

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    return (
        <div className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 h-screen fixed left-0 top-0 z-50">
            <div className="p-6">
                <Link href="/tenant/dashboard" className="flex items-center gap-3 group">
                    <div className={cn("p-2 rounded-xl shadow-lg transition-all group-hover:scale-110", colors.bg)}>
                        <Home className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">PropFlow</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Tenant Portal</p>
                    </div>
                </Link>
            </div>

            <nav className="flex-1 px-4 space-y-1 mt-6">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-200",
                                isActive
                                    ? cn("bg-slate-900 text-white shadow-lg shadow-slate-200")
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto">
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 font-bold"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                    </Button>
                </div>
            </div>
        </div>
    );
}
