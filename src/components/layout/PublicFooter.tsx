'use client';

import Link from 'next/link';
import { LogoLink } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';

export function PublicFooter() {
    return (
        <footer className="bg-white border-t border-slate-100 py-16 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center gap-12 md:gap-8">
                    {/* Brand */}
                    <LogoLink size="md" />

                    {/* Navigation Links */}
                    <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <Link href="/features" className="hover:text-blue-600 transition-colors py-2 px-1">Features</Link>
                        <Link href="/solutions" className="hover:text-blue-600 transition-colors py-2 px-1">Solutions</Link>
                        <Link href="/pricing" className="hover:text-blue-600 transition-colors py-2 px-1">Pricing</Link>
                        <Link href="/contact" className="hover:text-blue-600 transition-colors py-2 px-1">Contact</Link>
                        <Link href="/terms" className="hover:text-blue-600 transition-colors py-2 px-1">Terms</Link>
                        <Link href="/privacy" className="hover:text-blue-600 transition-colors py-2 px-1">Privacy</Link>
                    </div>

                    {/* Copyright */}
                    <p className="text-xs font-bold text-slate-400 text-center md:text-right">
                        © 2026 PropFlow Intelligence. <br className="sm:hidden" />
                        Built for high performance.
                    </p>
                </div>
            </div>
        </footer>
    );
}
