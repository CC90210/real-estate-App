'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface QuickFindContextType {
    open: boolean
    setOpen: (open: boolean) => void
    toggle: () => void
}

const QuickFindContext = createContext<QuickFindContextType | undefined>(undefined)

export function QuickFindProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)

    const toggle = () => setOpen(prev => !prev)

    // Handle Keyboard Shortcut (Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setOpen(true)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    return (
        <QuickFindContext.Provider value={{ open, setOpen, toggle }}>
            {children}
        </QuickFindContext.Provider>
    )
}

export function useQuickFind() {
    const context = useContext(QuickFindContext)
    if (context === undefined) {
        throw new Error('useQuickFind must be used within a QuickFindProvider')
    }
    return context
}
