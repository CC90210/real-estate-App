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
    Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { useUser } from '@/lib/hooks/useUser';

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Areas', href: '/areas', icon: MapPin },
    { name: 'Properties', href: '/properties', icon: Home },
    { name: 'Applications', href: '/applications', icon: ClipboardList },
    { name: 'Approvals', href: '/approvals', icon: CheckCircle },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Landlords', href: '/landlords', icon: Users },
    { name: 'Automations', href: '/automations', icon: Zap },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { role } = useUser();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const filteredNavItems = navItems.filter(item => {
        if (item.name === 'Approvals' && role !== 'landlord' && role !== 'admin') return false;
        // Optionally restrict Landlords or Automations if needed, but per prompt only Approvals was restricted.
        // Prompt says "Only be accessible to admins and landlords" for Approvals.
        // Automations is upsell, so visible to all usually.
        return true;
    });

    return (
        <aside className={cn("flex flex-col h-full bg-[#fcfdfe] border-r border-slate-200/60 shadow-[1px_0_10px_rgba(0,0,0,0.02)]", className)}>
            <div className="p-8">
                <Link href="/dashboard" className="flex items-center gap-3 group transition-all">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
                        <Zap className="w-6 h-6 text-white fill-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">PropFlow</h1>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1 opacity-70">Intelligence</p>
                    </div>
                </Link>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
                <div className="px-3 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Management</div>
                {filteredNavItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                        <Link key={item.href} href={item.href}>
                            <div
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-white text-blue-600 shadow-sm border border-slate-200/50"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 w-1 h-5 bg-blue-600 rounded-r-full" />
                                )}
                                <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                                <span>{item.name}</span>
                                {item.name === 'Applications' && (
                                    <div className="ml-auto px-1.5 py-0.5 rounded-md bg-blue-50 text-[10px] font-black text-blue-600 border border-blue-100">NEW</div>
                                )}
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

export function MobileNav() {
    const [open, setOpen] = useState(false);

    return (
        <div className="lg:hidden flex items-center justify-between p-4 border-b bg-white/80 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md">
                    <Zap className="w-4 h-4 text-white fill-white" />
                </div>
                <span className="text-xl font-black tracking-tight text-slate-900">PropFlow</span>
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover:bg-slate-100 rounded-xl">
                        <Menu className="w-6 h-6 text-slate-600" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 border-none">
                    <Sidebar />
                </SheetContent>
            </Sheet>
        </div>
    );
}
