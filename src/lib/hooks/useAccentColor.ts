'use client'

import { useEffect, useState } from 'react'

// ==============================================================================
// ACCENT COLOR SYSTEM - Production Grade Implementation
// ==============================================================================

// Accent color definitions with all required shades
export const ACCENT_COLORS = {
    blue: {
        primary: '#3b82f6',
        hover: '#2563eb',
        light: '#dbeafe',
        lighter: '#eff6ff',
        ring: '#93c5fd',
        gradient: 'from-blue-600 to-indigo-700',
        text: 'text-blue-600',
        textHover: 'hover:text-blue-700',
        bg: 'bg-blue-600',
        bgHover: 'hover:bg-blue-700',
        bgLight: 'bg-blue-50',
        bgLighter: 'bg-blue-100/50',
        border: 'border-blue-200',
        borderHover: 'hover:border-blue-300',
        shadow: 'shadow-blue-500/10',
        shadowHover: 'hover:shadow-blue-500/20',
        focusRing: 'focus:ring-blue-500',
    },
    indigo: {
        primary: '#6366f1',
        hover: '#4f46e5',
        light: '#e0e7ff',
        lighter: '#eef2ff',
        ring: '#a5b4fc',
        gradient: 'from-indigo-600 to-violet-700',
        text: 'text-indigo-600',
        textHover: 'hover:text-indigo-700',
        bg: 'bg-indigo-600',
        bgHover: 'hover:bg-indigo-700',
        bgLight: 'bg-indigo-50',
        bgLighter: 'bg-indigo-100/50',
        border: 'border-indigo-200',
        borderHover: 'hover:border-indigo-300',
        shadow: 'shadow-indigo-500/10',
        shadowHover: 'hover:shadow-indigo-500/20',
        focusRing: 'focus:ring-indigo-500',
    },
    emerald: {
        primary: '#10b981',
        hover: '#059669',
        light: '#d1fae5',
        lighter: '#ecfdf5',
        ring: '#6ee7b7',
        gradient: 'from-emerald-600 to-teal-700',
        text: 'text-emerald-600',
        textHover: 'hover:text-emerald-700',
        bg: 'bg-emerald-600',
        bgHover: 'hover:bg-emerald-700',
        bgLight: 'bg-emerald-50',
        bgLighter: 'bg-emerald-100/50',
        border: 'border-emerald-200',
        borderHover: 'hover:border-emerald-300',
        shadow: 'shadow-emerald-500/10',
        shadowHover: 'hover:shadow-emerald-500/20',
        focusRing: 'focus:ring-emerald-500',
    },
    rose: {
        primary: '#f43f5e',
        hover: '#e11d48',
        light: '#ffe4e6',
        lighter: '#fff1f2',
        ring: '#fda4af',
        gradient: 'from-rose-600 to-pink-700',
        text: 'text-rose-600',
        textHover: 'hover:text-rose-700',
        bg: 'bg-rose-600',
        bgHover: 'hover:bg-rose-700',
        bgLight: 'bg-rose-50',
        bgLighter: 'bg-rose-100/50',
        border: 'border-rose-200',
        borderHover: 'hover:border-rose-300',
        shadow: 'shadow-rose-500/10',
        shadowHover: 'hover:shadow-rose-500/20',
        focusRing: 'focus:ring-rose-500',
    },
    slate: {
        primary: '#64748b',
        hover: '#475569',
        light: '#f1f5f9',
        lighter: '#f8fafc',
        ring: '#94a3b8',
        gradient: 'from-slate-600 to-slate-800',
        text: 'text-slate-600',
        textHover: 'hover:text-slate-700',
        bg: 'bg-slate-600',
        bgHover: 'hover:bg-slate-700',
        bgLight: 'bg-slate-50',
        bgLighter: 'bg-slate-100/50',
        border: 'border-slate-200',
        borderHover: 'hover:border-slate-300',
        shadow: 'shadow-slate-500/10',
        shadowHover: 'hover:shadow-slate-500/20',
        focusRing: 'focus:ring-slate-500',
    },
} as const;

export type AccentColorName = keyof typeof ACCENT_COLORS;

// Get stored accent or default
export function getStoredAccent(): AccentColorName {
    if (typeof window === 'undefined') return 'blue';
    try {
        const stored = localStorage.getItem('propflow_branding');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.accent && parsed.accent in ACCENT_COLORS) {
                return parsed.accent as AccentColorName;
            }
        }
    } catch (e) {
        console.warn('Failed to get stored accent:', e);
    }
    return 'blue';
}

// Hook to get current accent color with live updates
export function useAccentColor() {
    const [accent, setAccent] = useState<AccentColorName>('blue');

    useEffect(() => {
        // Load initial value
        setAccent(getStoredAccent());

        // Listen for storage changes (from other tabs or settings page)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'propflow_branding') {
                setAccent(getStoredAccent());
            }
        };

        // Listen for custom event (from same tab)
        const handleBrandingChange = () => {
            setAccent(getStoredAccent());
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('brandingChange', handleBrandingChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('brandingChange', handleBrandingChange);
        };
    }, []);

    return {
        accent,
        colors: ACCENT_COLORS[accent],
        setAccent: (newAccent: AccentColorName) => {
            setAccent(newAccent);
            // Dispatch custom event for same-tab updates
            window.dispatchEvent(new CustomEvent('brandingChange'));
        }
    };
}

// Utility to get accent colors for components that don't use hooks
export function getAccentColors(accent?: AccentColorName) {
    const name = accent || getStoredAccent();
    return ACCENT_COLORS[name];
}
