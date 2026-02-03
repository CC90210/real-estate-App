'use client'

import { useEffect } from 'react'

// Accent color definitions
const accentColors: Record<string, { primary: string; light: string; ring: string }> = {
    blue: { primary: '#3b82f6', light: '#dbeafe', ring: '#93c5fd' },
    indigo: { primary: '#6366f1', light: '#e0e7ff', ring: '#a5b4fc' },
    emerald: { primary: '#10b981', light: '#d1fae5', ring: '#6ee7b7' },
    rose: { primary: '#f43f5e', light: '#ffe4e6', ring: '#fda4af' },
    slate: { primary: '#64748b', light: '#f1f5f9', ring: '#94a3b8' }
}

/**
 * BrandingInitializer - Applies saved branding (accent colors) on app load
 * Reads from localStorage and applies CSS custom properties to :root
 */
export function BrandingInitializer() {
    useEffect(() => {
        // Load branding from localStorage on mount
        try {
            const stored = localStorage.getItem('propflow_branding')
            if (stored) {
                const branding = JSON.parse(stored)
                const colors = accentColors[branding.accent] || accentColors.blue

                document.documentElement.style.setProperty('--accent-primary', colors.primary)
                document.documentElement.style.setProperty('--accent-light', colors.light)
                document.documentElement.style.setProperty('--accent-ring', colors.ring)
            }
        } catch (e) {
            console.warn('BrandingInitializer: Failed to load branding', e)
        }
    }, [])

    // This component renders nothing - it just applies styles
    return null
}
