'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    MapPin,
    Home,
    ClipboardList,
    CheckCircle,
    FileText,
    Users,
    Zap,
    Settings,
    LogOut,
    Calendar,
    Receipt,
    Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/hooks/useUser';
import { useAccentColor } from '@/lib/hooks/useAccentColor';

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'agent', 'landlord'] },
    { name: 'Areas', href: '/areas', icon: MapPin, roles: ['admin', 'agent'] },
    { name: 'Properties', href: '/properties', icon: Home, roles: ['admin', 'agent', 'landlord'] },
    { name: 'Applications', href: '/applications', icon: ClipboardList, roles: ['admin', 'agent', 'landlord'] },
    { name: 'Approvals', href: '/approvals', icon: CheckCircle, roles: ['admin', 'landlord'] },
    { name: 'Showings', href: '/showings', icon: Calendar, roles: ['admin', 'agent'] },
    { name: 'Invoices', href: '/invoices', icon: Receipt, roles: ['admin', 'landlord'] },
    { name: 'Documents', href: '/documents', icon: FileText, roles: ['admin', 'agent'] },
    { name: 'Landlords', href: '/landlords', icon: Users, roles: ['admin', 'agent'] },
    { name: 'Automations', href: '/automations', icon: Zap, roles: ['admin', 'agent'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'agent', 'landlord'] },
];

interface DesktopSidebarProps {
    className?: string;
    onQuickFindOpen: () => void;
}

export function DesktopSidebar({ className, onQuickFindOpen }: DesktopSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { role } = useUser();
    const { colors } = useAccentColor();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const userRole = role || 'agent';

    const filteredNavItems = navItems.filter(item =>
        item.roles.includes(userRole)
    );

    return (
        <aside className={cn("hidden lg:flex flex-col h-full w-64 bg-[#fcfdfe] border-r border-slate-200/60 shadow-[1px_0_10px_rgba(0,0,0,0.02)] fixed left-0 top-0 bottom-0 z-30", className)}>
            <div className="p-8 pb-4">
                <Link href="/dashboard" className="flex items-center gap-3 group transition-all mb-6">
                    <div
                        className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform bg-gradient-to-br", colors.gradient, colors.shadow)}
                    >
                        <Zap className="w-6 h-6 text-white fill-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">PropFlow</h1>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70", colors.text)}>Intelligence</p>
                    </div>
                </Link>

                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50"
                    onClick={onQuickFindOpen}
                >
                    <Search className="w-4 h-4" />
                    <span className="flex-1 text-left">Quick Find</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 border border-slate-200 rounded text-slate-500">⌘K</kbd>
                </Button>
            </div>

            <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
                <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Management</div>
                {filteredNavItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                        <Link key={item.href} href={item.href}>
                            <div
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative",
                                    isActive
                                        ? cn("bg-white shadow-sm border border-slate-200/50", colors.text)
                                        : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                                )}
                            >
                                {isActive && (
                                    <div
                                        className="absolute left-0 w-1 h-5 rounded-r-full"
                                        style={{ backgroundColor: colors.primary }}
                                    />
                                )}
                                <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive ? colors.text : "text-slate-400 group-hover:text-slate-600")} />
                                <span>{item.name}</span>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto">
                <div className="p-1 rounded-2xl bg-slate-100/50 border border-slate-200/50">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-slate-500 hover:text-red-600 hover:bg-white rounded-xl font-bold py-6 transition-all"
                        onClick={handleSignOut}
                    >
                        <div className="p-2 rounded-lg bg-white shadow-sm transition-colors group-hover:bg-red-50">
                            <LogOut className="w-4 h-4" />
                        </div>
                        Sign Out
                    </Button>
                </div>
            </div>
        </aside>
    );
}
