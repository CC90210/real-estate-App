'use client';

import { NotificationBell } from '@/components/notifications/NotificationBell';

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
    Search,
    Wrench,
    BookOpen,
    BarChart3,
    Activity,
    ShieldAlert,
    Lock,
} from 'lucide-react';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/hooks/useUser';
import { useAccentColor } from '@/lib/hooks/useAccentColor';
import { PLANS, FeatureKey } from '@/lib/plans';
import { Logo } from '@/components/brand/Logo';

const navItems = [
    { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'agent', 'landlord'] },
    { id: 'areas', name: 'Areas', href: '/areas', icon: MapPin, roles: ['admin', 'agent'] },
    { id: 'properties', name: 'Properties', href: '/properties', icon: Home, roles: ['admin', 'agent', 'landlord'] },
    { id: 'applications', name: 'Applications', href: '/applications', icon: ClipboardList, roles: ['admin', 'agent', 'landlord'] },
    { id: 'approvals', name: 'Approvals', href: '/approvals', icon: CheckCircle, roles: ['admin', 'landlord'] },
    { id: 'leases', name: 'Leases', href: '/leases', icon: BookOpen, roles: ['admin', 'agent', 'landlord'] },
    { id: 'maintenance', name: 'Maintenance', href: '/maintenance', icon: Wrench, roles: ['admin', 'agent', 'landlord'] },
    { id: 'showings', name: 'Showings', href: '/showings', icon: Calendar, roles: ['admin', 'agent'] },
    { id: 'invoices', name: 'Invoices', href: '/invoices', icon: Receipt, roles: ['admin', 'landlord'] },
    { id: 'documents', name: 'Documents', href: '/documents', icon: FileText, roles: ['admin', 'agent'] },
    { id: 'landlords', name: 'Landlords', href: '/landlords', icon: Users, roles: ['admin', 'agent'] },
    { id: 'analytics', name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin'] },
    { id: 'activity', name: 'Activity', href: '/activity', icon: Activity, roles: ['admin'] },
    { id: 'automations', name: 'Automations', href: '/automations', icon: Zap, roles: ['admin', 'agent'] },
    { id: 'settings', name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'agent', 'landlord'] },
];

interface DesktopSidebarProps {
    className?: string;
    onQuickFindOpen: () => void;
}

export function DesktopSidebar({ className, onQuickFindOpen }: DesktopSidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { role, isSuperAdmin, plan, planName, hasFullAccess, isPartner } = useUser();
    const { colors } = useAccentColor();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const userRole = role || 'agent';
    const planConfig = PLANS[plan] || PLANS.essentials;

    // Full access users see everything from enterprise nav, otherwise check plan
    const allowedNav = hasFullAccess ? PLANS.enterprise.nav : planConfig.nav;

    const filteredNavItems = navItems.filter(item =>
        item.roles.includes(userRole)
    );

    return (
        <aside className={cn("hidden lg:flex flex-col h-full w-64 bg-[#fcfdfe] border-r border-slate-200/60 shadow-[1px_0_10px_rgba(0,0,0,0.02)] fixed left-0 top-0 bottom-0 z-30", className)}>
            <div className="p-8 pb-4">
                <Logo
                    size="md"
                    className="mb-8"
                />

                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50"
                    onClick={onQuickFindOpen}
                >
                    <Search className="w-4 h-4" />
                    <span className="flex-1 text-left">Quick Find</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 border border-slate-200 rounded text-slate-500">⌘K</kbd>
                </Button>

                <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Alerts</span>
                    <NotificationsPanel />
                </div>
            </div>

            <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
                <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Management</div>
                {filteredNavItems.map((item) => {
                    const isAllowed = allowedNav.includes(item.id as any) || item.id === 'settings';
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

                    if (!isAllowed) {
                        return (
                            <div
                                key={item.href}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 cursor-not-allowed group opacity-60"
                                title="Upgrade plan to access"
                            >
                                <item.icon className="w-5 h-5 text-slate-300" />
                                <span>{item.name}</span>
                                <Lock className="w-3.5 h-3.5 ml-auto text-slate-300" />
                            </div>
                        );
                    }

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
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4">
                    <div className="flex flex-col mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            {hasFullAccess ? 'Access Level' : 'Active Plan'}
                        </span>
                        <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-white border border-slate-200 inline-block", colors.text)}>
                            {isSuperAdmin ? '🔑 Super Admin' :
                                isPartner ? '🤝 Partner' :
                                    planName}
                        </span>
                    </div>
                    {!hasFullAccess && (
                        <Link href="/pricing" className="text-[10px] font-bold text-blue-600 hover:underline mt-2 inline-block">Upgrade membership →</Link>
                    )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                    {isSuperAdmin && (
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/admin')}
                            className="w-full justify-start text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        >
                            <ShieldAlert className="w-4 h-4 mr-3" />
                            Platform Admin
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        onClick={handleSignOut}
                        className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                    </Button>
                </div>
            </div>
        </aside>
    );
}
