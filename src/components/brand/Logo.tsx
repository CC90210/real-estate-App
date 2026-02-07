'use client'

import React from 'react'
import Link from 'next/link'

interface LogoProps {
    variant?: 'full' | 'icon' | 'wordmark'
    size?: 'sm' | 'md' | 'lg'
    theme?: 'light' | 'dark'
    className?: string
}

const sizes = {
    sm: { icon: 24, text: 'text-lg' },
    md: { icon: 32, text: 'text-xl' },
    lg: { icon: 40, text: 'text-2xl' },
}

export function Logo({
    variant = 'full',
    size = 'md',
    theme = 'dark',
    className = ''
}: LogoProps) {
    const { icon: iconSize, text: textSize } = sizes[size]
    const textColor = theme === 'dark' ? 'text-gray-900' : 'text-white'

    const LogoIcon = () => (
        <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
        >
            {/* Modern Property Icon with Flow */}
            <rect width="48" height="48" rx="12" fill="#3b82f6" />

            {/* Building Outline */}
            <path
                d="M14 36V20L24 12L34 20V36"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />

            {/* Door */}
            <rect x="20" y="28" width="8" height="8" rx="1" fill="white" />

            {/* Window */}
            <rect x="18" y="20" width="4" height="4" rx="0.5" fill="white" opacity="0.8" />
            <rect x="26" y="20" width="4" height="4" rx="0.5" fill="white" opacity="0.8" />

            {/* Flow Lines */}
            <path
                d="M10 24C10 24 12 26 14 24"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.6"
            />
            <path
                d="M34 24C34 24 36 22 38 24"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.6"
            />
        </svg>
    )

    const Wordmark = () => (
        <span className={`font-bold tracking-tight ${textSize} ${textColor}`}>
            Prop<span className="text-blue-600">Flow</span>
        </span>
    )

    if (variant === 'icon') {
        return <LogoIcon />
    }

    if (variant === 'wordmark') {
        return <Wordmark />
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <LogoIcon />
            <Wordmark />
        </div>
    )
}

// Linked version for navigation
export function LogoLink(props: LogoProps & { href?: string }) {
    const { href = '/', ...logoProps } = props

    return (
        <Link href={href} className="inline-flex items-center">
            <Logo {...logoProps} />
        </Link>
    )
}
