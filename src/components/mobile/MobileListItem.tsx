'use client'

import { ChevronRight } from 'lucide-react'

interface MobileListItemProps {
    title: string
    subtitle?: string
    meta?: string
    icon?: React.ReactNode
    badge?: {
        text: string
        variant: 'default' | 'success' | 'warning' | 'error' | 'info'
    }
    onClick?: () => void
    children?: React.ReactNode
}

const badgeColors = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
}

export function MobileListItem({
    title,
    subtitle,
    meta,
    icon,
    badge,
    onClick,
    children
}: MobileListItemProps) {
    const Component = onClick ? 'button' : 'div'

    return (
        <Component
            onClick={onClick}
            className={`
                w-full flex items-center gap-4 p-4 bg-white text-left
                ${onClick ? 'active:bg-gray-50 cursor-pointer' : ''}
                border-b border-gray-100 last:border-b-0
            `}
        >
            {/* Icon */}
            {icon && (
                <div className="flex-shrink-0">
                    {icon}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{title}</p>
                    {badge && (
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${badgeColors[badge.variant]}`}>
                            {badge.text}
                        </span>
                    )}
                </div>
                {subtitle && (
                    <p className="text-sm text-gray-500 truncate mt-0.5">{subtitle}</p>
                )}
                {meta && (
                    <p className="text-xs text-gray-400 mt-1">{meta}</p>
                )}
                {children}
            </div>

            {/* Arrow */}
            {onClick && (
                <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
            )}
        </Component>
    )
}
