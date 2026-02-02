'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
    LayoutDashboard,
    Building2,
    Users,
    FileText,
    Settings,
    Search,
    Plus,
    Home,
    ShieldCheck,
    CheckSquare,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProperties } from '@/lib/hooks/useProperties';
import { useApplications } from '@/lib/hooks/useApplications';

interface CommandPaletteProps {
    properties?: any[]; // Kept for retro-compatibility if used elsewhere, but we'll prefer hooks
}

export function CommandPalette({ properties: propsProperties = [] }: CommandPaletteProps) {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    // Fetch data for command palette
    const { data: fetchedProperties } = useProperties();
    const { data: applications } = useApplications();

    // Use fetched properties if available, otherwise fall back to props
    const properties = fetchedProperties || propsProperties;

    // Toggle the menu when Cmd+K / Ctrl+K is pressed
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }

            if (e.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = useCallback((command: () => void) => {
        setOpen(false);
        command();
    }, []);

    const navigationItems = [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: ['home', 'overview'] },
        { label: 'Areas', href: '/areas', icon: Building2, keywords: ['portfolio', 'buildings', 'neighborhoods'] },
        { label: 'Applications', href: '/applications', icon: Users, keywords: ['apps', 'tenants', 'applicants'] },
        { label: 'Documents', href: '/documents', icon: FileText, keywords: ['docs', 'files', 'generate'] },
        { label: 'Approvals', href: '/landlord/applications', icon: CheckSquare, keywords: ['review', 'pending'] },
        { label: 'Admin', href: '/admin', icon: ShieldCheck, keywords: ['system', 'settings', 'users'] },
        { label: 'Settings', href: '/settings', icon: Settings, keywords: ['preferences', 'account', 'profile'] },
    ];

    const quickActions = [
        { label: 'New Application', action: () => router.push('/applications?new=true'), icon: Plus },
        { label: 'Generate Document', action: () => router.push('/documents'), icon: FileText },
    ];

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
                onClick={() => setOpen(false)}
            />

            {/* Command Dialog */}
            <div className="absolute left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl px-4">
                <Command
                    className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200"
                    loop
                >
                    <div className="flex items-center border-b border-slate-100 px-4">
                        <Search className="w-5 h-5 text-slate-400 mr-3" />
                        <Command.Input
                            placeholder="Search or type a command..."
                            className="flex-1 h-14 bg-transparent text-base font-medium placeholder:text-slate-400 outline-none"
                            autoFocus
                        />
                        <button
                            onClick={() => setOpen(false)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>

                    <Command.List className="max-h-80 overflow-y-auto p-2">
                        <Command.Empty className="py-8 text-center text-slate-500">
                            No results found.
                        </Command.Empty>

                        {/* Navigation */}
                        <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {navigationItems.map((item) => (
                                <Command.Item
                                    key={item.href}
                                    value={`${item.label} ${item.keywords.join(' ')}`}
                                    onSelect={() => runCommand(() => router.push(item.href))}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 hover:bg-slate-100 data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-600 transition-colors"
                                >
                                    <item.icon className="w-5 h-5 text-slate-400" />
                                    <span className="font-medium">{item.label}</span>
                                </Command.Item>
                            ))}
                        </Command.Group>

                        {/* Quick Actions */}
                        <Command.Group heading="Quick Actions" className="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">
                            {quickActions.map((item) => (
                                <Command.Item
                                    key={item.label}
                                    value={item.label}
                                    onSelect={() => runCommand(item.action)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 hover:bg-slate-100 data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-600 transition-colors"
                                >
                                    <div className="p-1 rounded-lg bg-blue-100">
                                        <item.icon className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <span className="font-medium">{item.label}</span>
                                </Command.Item>
                            ))}
                        </Command.Group>

                        {/* Properties */}
                        {properties && properties.length > 0 && (
                            <Command.Group heading="Properties" className="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">
                                {properties.slice(0, 5).map((property: any) => (
                                    <Command.Item
                                        key={property.id}
                                        value={`property ${property.address}`}
                                        onSelect={() => runCommand(() => router.push(`/properties/${property.id}`))}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 hover:bg-slate-100 data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-600 transition-colors"
                                    >
                                        <Home className="w-5 h-5 text-slate-400" />
                                        <div className="flex-1 min-w-0">
                                            <span className="font-medium truncate block">{property.address}</span>
                                            <span className="text-xs text-slate-400">${property.rent}/mo</span>
                                        </div>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {/* Applications */}
                        {applications && applications.length > 0 && (
                            <Command.Group heading="Applications" className="px-2 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">
                                {applications.slice(0, 5).map((app: any) => (
                                    <Command.Item
                                        key={app.id}
                                        value={`application ${app.applicant_name}`}
                                        onSelect={() => runCommand(() => router.push(`/applications/${app.id}`))}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-700 hover:bg-slate-100 data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-600 transition-colors"
                                    >
                                        <Users className="w-5 h-5 text-slate-400" />
                                        <div className="flex-1 min-w-0">
                                            <span className="font-medium truncate block">{app.applicant_name}</span>
                                            <span className="text-xs text-slate-400">{app.status} • {app.properties?.address}</span>
                                        </div>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}
                    </Command.List>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-mono">Enter</kbd>
                                to select
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-mono">Esc</kbd>
                                to close
                            </span>
                        </div>
                        <span className="font-medium">PropFlow</span>
                    </div>
                </Command>
            </div>
        </div>
    );
}

// Button trigger for opening command palette
export function CommandPaletteTrigger() {
    return (
        <button
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                document.dispatchEvent(event);
            }}
        >
            <Search className="w-4 h-4" />
            <span className="text-slate-400">Search...</span>
            <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-white rounded border border-slate-200">
                {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}K
            </kbd>
        </button>
    );
}
