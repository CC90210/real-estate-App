'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

export function Breadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);

    // Skip breadcrumbs on main dashboard page if preferred, or show "Dashboard"
    if (segments.length === 0) return null;

    // Map specific paths to friendly names if needed
    const getFriendlyName = (segment: string) => {
        // This relies on the path. In a real app we might fetch the entity name
        // based on the ID, but for now we format the segment.
        // If it looks like a generic ID (long hyphenated string), we might just show "Details" or truncate it,
        // unless we have a context provider for names.
        // For immediacy, we capitalize and replace dashes.
        if (segment.length > 20 && segment.includes('-')) {
            return 'Details'; // Placeholder for IDs
        }
        return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    };

    return (
        <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-6 bg-white/50 backdrop-blur-sm p-3 rounded-lg border border-slate-200/50 w-fit">
            <Link
                href="/dashboard"
                className="flex items-center hover:text-blue-600 transition-colors"
                title="Dashboard"
            >
                <Home className="w-4 h-4" />
            </Link>

            {segments.map((segment, index) => {
                // If it's the "dashboard" segment itself and it's the first one, we skip 
                // because we already have the Home icon, or we handle it.
                // Our routes are usually /dashboard/something.
                if (segment === 'dashboard') return null;

                const href = `/${segments.slice(0, index + 1).join('/')}`;
                const isLast = index === segments.length - 1;

                return (
                    <Fragment key={href}>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                        {isLast ? (
                            <span className="font-medium text-slate-900">
                                {getFriendlyName(segment)}
                            </span>
                        ) : (
                            <Link
                                href={href}
                                className="hover:text-blue-600 transition-colors"
                            >
                                {getFriendlyName(segment)}
                            </Link>
                        )}
                    </Fragment>
                );
            })}
        </nav>
    );
}
