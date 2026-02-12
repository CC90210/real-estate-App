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
    const textColor = theme === 'dark' ? 'text-slate-900' : 'text-white'

    const LogoIcon = () => (
        <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0 drop-shadow-sm"
        >
            <defs>
                <linearGradient id="logo-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4f46e5" /> {/* Indigo */}
                    <stop offset="50%" stopColor="#3b82f6" /> {/* Blue */}
                    <stop offset="100%" stopColor="#06b6d4" /> {/* Cyan */}
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Stylized Towers forming 'F' */}
            <g filter="url(#glow)">
                {/* Left Tower */}
                <path
                    d="M35 85V40L45 35V85L35 85Z"
                    fill="url(#logo-gradient)"
                    opacity="0.9"
                />
                {/* Center Tall Tower */}
                <path
                    d="M48 85V20L60 15V85L48 85Z"
                    fill="url(#logo-gradient)"
                />
                {/* Right Swoosh forming the 'F' bar */}
                <path
                    d="M62 35C75 35 85 45 85 60C85 75 75 80 60 80L58 75C70 75 78 70 78 60C78 50 70 42 62 42V35Z"
                    fill="url(#logo-gradient)"
                />
            </g>

            {/* Circuit Nodes */}
            <circle cx="45" cy="45" r="3" fill="#06b6d4" />
            <circle cx="60" cy="25" r="4" fill="#06b6d4" />
            <circle cx="85" cy="60" r="2.5" fill="#06b6d4" />

            {/* Connecting Lines */}
            <path
                d="M45 45L45 55"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.5"
            />
            <path
                d="M60 25L60 35"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.5"
            />
        </svg>
    )

    const Wordmark = () => (
        <span className={`font-black tracking-tight ${textSize} ${textColor} italic`}>
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
        <div className={`flex items-center gap-3 ${className}`}>
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
