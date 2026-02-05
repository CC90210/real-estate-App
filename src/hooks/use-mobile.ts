'use client'

import { useState, useEffect } from 'react'

export function useMobile(breakpoint: number = 768) {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < breakpoint)
        }

        // Initial check
        checkMobile()

        // Listen for resize
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [breakpoint])

    return isMobile
}

// Also export a hook for tablet detection
export function useTablet() {
    const [isTablet, setIsTablet] = useState(false)

    useEffect(() => {
        const checkTablet = () => {
            const width = window.innerWidth
            setIsTablet(width >= 768 && width < 1024)
        }

        checkTablet()
        window.addEventListener('resize', checkTablet)
        return () => window.removeEventListener('resize', checkTablet)
    }, [])

    return isTablet
}
