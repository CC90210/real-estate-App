'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Home,
    ClipboardList,
    FileText,
    Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    {
        label: 'Home',
        href: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        label: 'Properties',
        href: '/properties',
        icon: Home,
    },
    {
        label: 'Apps',
        href: '/applications',
        icon: ClipboardList,
    },
    {
        label: 'Docs',
        href: '/documents',
        icon: FileText,
    },
    {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
    },
];

export function MobileBottomNav() {
    const pathname = usePathname();

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg">
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors",
                                isActive
                                    ? "text-blue-600"
                                    : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-xl transition-all duration-200",
                                isActive && "bg-blue-50"
                            )}>
                                <item.icon className={cn(
                                    "w-5 h-5 transition-transform",
                                    isActive && "scale-110"
                                )} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-semibold mt-1 transition-colors",
                                isActive ? "text-blue-600" : "text-slate-500"
                            )}>
                                {item.label}
                            </span>
                            {isActive && (
                                <div className="absolute bottom-0 w-8 h-0.5 bg-blue-600 rounded-t-full" />
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Safe area padding for devices with home indicator */}
            <div className="h-safe-area-inset-bottom bg-white" />
        </nav>
    );
}
