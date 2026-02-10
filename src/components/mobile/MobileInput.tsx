'use client'

import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface MobileInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    prefix?: string
    suffix?: string
}

export const MobileInput = forwardRef<HTMLInputElement, MobileInputProps>(
    ({ label, error, prefix, suffix, className, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {label}
                    </label>
                )}

                <div className={cn(
                    "flex items-center border rounded-xl bg-white overflow-hidden transition-colors",
                    error ? "border-red-500" : "border-gray-300 focus-within:border-blue-500",
                    "focus-within:ring-2 focus-within:ring-blue-500/20"
                )}>
                    {prefix && (
                        <span className="px-4 py-3 bg-gray-50 text-gray-500 font-medium border-r border-gray-300 text-base">
                            {prefix}
                        </span>
                    )}

                    <input
                        ref={ref}
                        className={cn(
                            "flex-1 px-4 py-3 text-base bg-transparent min-h-[48px]",
                            "placeholder:text-gray-400",
                            "focus:outline-none",
                            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                            props.type === 'number' && "font-mono font-semibold text-lg",
                            className
                        )}
                        {...props}
                    />

                    {suffix && (
                        <span className="px-4 py-3 bg-gray-50 text-gray-500 font-medium border-l border-gray-300 text-base">
                            {suffix}
                        </span>
                    )}
                </div>

                {error && (
                    <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
            </div>
        )
    }
)

MobileInput.displayName = 'MobileInput'
