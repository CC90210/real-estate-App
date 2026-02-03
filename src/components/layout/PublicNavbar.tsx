'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Building2, Menu, X, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const navLinks = [
    { label: 'Features', href: '/features' },
    { label: 'Solutions', href: '/solutions' },
    { label: 'Pricing', href: '/pricing' },
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

    return (
        <nav
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                scrolled || isOpen ? "glass py-4 shadow-lg shadow-blue-500/5" : "bg-transparent py-6"
            )}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 group relative z-50">
                        <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform duration-300">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tight leading-none text-slate-900">PropFlow</span>
                            <span className="text-[10px] uppercase tracking-widest font-bold text-blue-600 opacity-80 mt-1">Intelligence</span>
                        </div>
                    </Link>

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

                    {/* CTAs */}
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
                        className="md:hidden relative z-50 p-2 text-slate-600 hover:text-blue-600 transition-colors"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label="Toggle Menu"
                    >
                        {isOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
                    </button>
                </div>
            </div>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm md:hidden"
                        />

                        {/* Content */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl md:hidden flex flex-col pt-24 px-8 pb-10"
                        >
                            <div className="space-y-8 flex-1">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1">Navigation</p>
                                    {navLinks.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className={cn(
                                                "block text-3xl font-black tracking-tight py-2 transition-colors",
                                                pathname === link.href ? "text-blue-600" : "text-slate-900"
                                            )}
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                </div>

                                <div className="pt-8 border-t border-slate-100 flex flex-col gap-4">
                                    <Link href="/contact" className="w-full">
                                        <Button className="w-full h-16 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 text-lg shadow-xl shadow-blue-200">
                                            Request Access
                                        </Button>
                                    </Link>
                                    <Link href="/login" className="w-full">
                                        <Button variant="ghost" className="w-full h-14 rounded-2xl font-bold text-slate-600">
                                            Partner Sign In
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100/50">
                                    <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-widest mb-2">
                                        <Sparkles className="h-3 w-3" />
                                        <span>Enterprise Ready</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                        Bespoke infrastructure for modern agencies.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </nav>
    );
}
