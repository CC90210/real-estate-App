'use client'

interface MobileSectionProps {
    title?: string
    action?: {
        label: string
        onClick: () => void
    }
    children: React.ReactNode
    className?: string
}

export function MobileSection({ title, action, children, className = '' }: MobileSectionProps) {
    return (
        <div className={`mb-6 ${className}`}>
            {(title || action) && (
                <div className="flex items-center justify-between px-4 mb-2">
                    {title && (
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {title}
                        </h3>
                    )}
                    {action && (
                        <button
                            onClick={action.onClick}
                            className="text-sm text-blue-600 font-medium"
                        >
                            {action.label}
                        </button>
                    )}
                </div>
            )}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm mx-4">
                {children}
            </div>
        </div>
    )
}
