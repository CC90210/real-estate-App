'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

export function Breadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length === 0) return null;

    const getFriendlyName = (segment: string) => {
        // UUIDs are long hyphenated strings
        if (segment.length > 20 && segment.includes('-')) {
            return 'Details';
        }
        return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    };

    // Structural segments that don't have their own page
    const nonClickableSegments = ['buildings', 'properties'];

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
                if (segment === 'dashboard') return null;

                const href = `/${segments.slice(0, index + 1).join('/')}`;
                const isLast = index === segments.length - 1;
                const isNonClickable = nonClickableSegments.includes(segment);

                return (
                    <Fragment key={href}>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                        {isLast || isNonClickable ? (
                            <span className={isNonClickable ? "text-slate-400" : "font-medium text-slate-900"}>
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
