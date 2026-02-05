'use client'

import { Button } from '@/components/ui/button'
import { Plus, Filter, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface MobilePageHeaderProps {
    title: string
    subtitle?: string
    showBack?: boolean
    backHref?: string
    primaryAction?: {
        label: string
        onClick: () => void
        icon?: React.ReactNode
    }
    secondaryAction?: {
        label: string
        onClick: () => void
        icon?: React.ReactNode
    }
}

export function MobilePageHeader({
    title,
    subtitle,
    showBack,
    backHref,
    primaryAction,
    secondaryAction
}: MobilePageHeaderProps) {
    const router = useRouter()

    return (
        <div className="sticky top-14 z-40 bg-white border-b px-4 py-3 md:hidden safe-top">
            <div className="flex items-center justify-between gap-4">
                {/* Left side - Back button or Title */}
                <div className="flex items-center gap-3 min-w-0">
                    {showBack && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 -ml-2 flex-shrink-0"
                            onClick={() => backHref ? router.push(backHref) : router.back()}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    )}
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold truncate">{title}</h1>
                        {subtitle && (
                            <p className="text-sm text-gray-500 truncate">{subtitle}</p>
                        )}
                    </div>
                </div>

                {/* Right side - Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {secondaryAction && (
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10"
                            onClick={secondaryAction.onClick}
                        >
                            {secondaryAction.icon || <Filter className="h-5 w-5" />}
                        </Button>
                    )}
                    {primaryAction && (
                        <Button
                            size="sm"
                            className="h-10 px-4"
                            onClick={primaryAction.onClick}
                        >
                            {primaryAction.icon || <Plus className="h-4 w-4 mr-1" />}
                            <span className="hidden xs:inline">{primaryAction.label}</span>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
