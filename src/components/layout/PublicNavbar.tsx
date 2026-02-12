'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, X, ArrowRight, Sparkles, ChevronRight } from 'lucide-react';
import { LogoLink } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';

const navLinks = [
    { label: 'Features', href: '/features', description: 'AI-powered property tools' },
    { label: 'Solutions', href: '/solutions', description: 'Enterprise deployments' },
    { label: 'Pricing', href: '/pricing', description: 'Custom plans & quotes' },
];

export function PublicNavbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on path change
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.top = `-${window.scrollY}px`;
        } else {
            const scrollY = document.body.style.top;
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }

        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
        };
    }, [isOpen]);

    const closeMenu = useCallback(() => setIsOpen(false), []);

    return (
        <>
            <nav
                className={cn(
                    "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                    scrolled ? "bg-white/95 backdrop-blur-xl py-3 shadow-lg shadow-slate-900/5 border-b border-slate-100" : "bg-transparent py-5"
                )}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <LogoLink size="md" />

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600 uppercase tracking-widest">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "hover:text-blue-600 transition-colors",
                                        pathname === link.href && "text-blue-600"
                                    )}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>

                        {/* Desktop CTAs */}
                        <div className="hidden md:flex items-center gap-4">
                            <Link href="/login">
                                <Button variant="ghost" className="font-bold text-slate-600 hover:text-blue-600">
                                    Sign In
                                </Button>
                            </Link>
                            <Link href="/contact">
                                <Button className="font-bold px-6 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 rounded-xl">
                                    Request Access
                                </Button>
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden relative z-[110] w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100/80 text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95"
                            onClick={() => setIsOpen(!isOpen)}
                            aria-label="Toggle Menu"
                        >
                            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* ===== MOBILE FULLSCREEN OVERLAY ===== */}
            {/* This is rendered OUTSIDE the nav to avoid any z-index inheritance issues */}
            <div
                className={cn(
                    "fixed inset-0 z-[100] md:hidden transition-all duration-300",
                    isOpen ? "visible" : "invisible pointer-events-none"
                )}
            >
                {/* Backdrop - solid dark overlay */}
                <div
                    className={cn(
                        "absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300",
                        isOpen ? "opacity-100" : "opacity-0"
                    )}
                    onClick={closeMenu}
                />

                {/* Drawer Panel */}
                <div
                    className={cn(
                        "absolute right-0 top-0 bottom-0 w-full max-w-[340px] bg-white shadow-2xl shadow-slate-900/20 transition-transform duration-300 ease-out flex flex-col",
                        isOpen ? "translate-x-0" : "translate-x-full"
                    )}
                >
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                        <LogoLink size="sm" />
                        <button
                            onClick={closeMenu}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors active:scale-95"
                            aria-label="Close Menu"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Drawer Body - Scrollable */}
                    <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-6">
                        {/* Section Label */}
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-4 px-1">
                            Navigation
                        </p>

                        {/* Nav Links */}
                        <div className="space-y-1 mb-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={closeMenu}
                                    className={cn(
                                        "flex items-center justify-between px-4 py-4 rounded-2xl transition-all active:scale-[0.98]",
                                        pathname === link.href
                                            ? "bg-blue-50 text-blue-700"
                                            : "text-slate-900 hover:bg-slate-50 active:bg-slate-100"
                                    )}
                                >
                                    <div>
                                        <span className="block text-lg font-bold tracking-tight">
                                            {link.label}
                                        </span>
                                        <span className="block text-xs text-slate-400 font-medium mt-0.5">
                                            {link.description}
                                        </span>
                                    </div>
                                    <ChevronRight className={cn(
                                        "h-4 w-4 flex-shrink-0",
                                        pathname === link.href ? "text-blue-400" : "text-slate-300"
                                    )} />
                                </Link>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-slate-100 mb-6" />

                        {/* CTA Buttons */}
                        <div className="space-y-3">
                            <Link href="/contact" onClick={closeMenu} className="block">
                                <Button className="w-full h-14 rounded-2xl font-bold text-base bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200/50 transition-all active:scale-[0.98]">
                                    Request Access
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                            <Link href="/login" onClick={closeMenu} className="block">
                                <Button variant="outline" className="w-full h-14 rounded-2xl font-bold text-base border-2 border-slate-200 text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98]">
                                    Partner Sign In
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Drawer Footer */}
                    <div className="px-6 pb-6 pt-2 mt-auto">
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50">
                            <div className="flex items-center gap-2 text-blue-600 font-bold text-[11px] uppercase tracking-widest mb-2">
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>Enterprise Ready</span>
                            </div>
                            <p className="text-[13px] font-medium text-slate-500 leading-relaxed">
                                Bespoke infrastructure for modern real estate agencies.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
