'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

interface MobileCardProps {
    title?: string
    subtitle?: string
    icon?: ReactNode
    children?: ReactNode
    onClick?: () => void
    showArrow?: boolean
    badge?: ReactNode
    className?: string
}

export function MobileCard({
    title,
    subtitle,
    icon,
    children,
    onClick,
    showArrow = false,
    badge,
    className,
}: MobileCardProps) {
    const Component = onClick ? 'button' : 'div'

    return (
        <Component
            onClick={onClick}
            className={cn(
                "w-full bg-white rounded-xl border border-gray-200 p-4",
                "transition-all duration-200",
                onClick && "active:scale-[0.98] active:bg-gray-50 cursor-pointer text-left",
                className
            )}
        >
            <div className="flex items-start gap-4">
                {/* Icon */}
                {icon && (
                    <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        {icon}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            {title && (
                                <h4 className="font-semibold text-gray-900 truncate">
                                    {title}
                                </h4>
                            )}
                            {subtitle && (
                                <p className="text-sm text-gray-500 mt-0.5 truncate">
                                    {subtitle}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            {badge}
                            {showArrow && onClick && (
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                            )}
                        </div>
                    </div>

                    {children && (
                        <div className="mt-3">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </Component>
    )
}
