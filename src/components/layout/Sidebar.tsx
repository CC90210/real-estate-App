'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Building2,
    LayoutDashboard,
    Map,
    FileText,
    Settings,
    LogOut,
    ShieldAlert,
    Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/lib/hooks/useUser';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navItems = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['agent', 'landlord', 'admin'],
    },
    {
        title: 'Areas',
        href: '/areas',
        icon: Map,
        roles: ['agent', 'admin'],
    },
    {
        title: 'Applications',
        href: '/applications',
        icon: FileText,
        roles: ['landlord', 'admin', 'agent'],
    },
    {
        title: 'Admin',
        href: '/admin',
        icon: ShieldAlert,
        roles: ['admin'],
    },
    {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        roles: ['agent', 'landlord', 'admin'],
    },
];

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();
    const { role, profile, signOut } = useUser();

    if (!role) return null;

    const filteredNavItems = navItems.filter((item) => item.roles.includes(role));

    return (
        <div className={cn("flex flex-col h-full bg-card border-r", className)}>
            <div className="p-6">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold gradient-text">PropFlow</span>
                </Link>
            </div>

            <div className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
                {filteredNavItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant={isActive ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start gap-3 mb-1",
                                    isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                                {item.title}
                            </Button>
                        </Link>
                    );
                })}
            </div>

            <div className="p-4 border-t mt-auto">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <Avatar>
                        <AvatarImage src={profile?.avatar_url || ''} />
                        <AvatarFallback>{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate capitalize">{role}</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => signOut()}
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </Button>
            </div>
        </div>
    );
}

export function MobileNav() {
    const [open, setOpen] = useState(false);

    return (
        <div className="lg:hidden flex items-center justify-between p-4 border-b bg-background sticky top-0 z-40">
            <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold gradient-text">PropFlow</span>
            </Link>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Menu className="w-6 h-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-80">
                    <Sidebar />
                </SheetContent>
            </Sheet>
        </div>
    );
}
