'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MobileFormSectionProps {
    title?: string
    description?: string
    children: ReactNode
    className?: string
}

export function MobileFormSection({
    title,
    description,
    children,
    className,
}: MobileFormSectionProps) {
    return (
        <div className={cn("space-y-4", className)}>
            {(title || description) && (
                <div className="pb-2 border-b border-gray-100">
                    {title && (
                        <h3 className="text-base font-semibold text-gray-900">
                            {title}
                        </h3>
                    )}
                    {description && (
                        <p className="mt-1 text-sm text-gray-500">
                            {description}
                        </p>
                    )}
                </div>
            )}

            <div className="space-y-4">
                {children}
            </div>
        </div>
    )
}
