'use client'

import { ReactNode } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    children: ReactNode
    footer?: ReactNode
    className?: string
}

export function MobileDialog({
    open,
    onOpenChange,
    title,
    children,
    footer,
    className,
}: MobileDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    // Mobile: expand fully, Desktop: constraint
                    "sm:max-w-lg",
                    "max-h-[100dvh] sm:max-h-[90vh]",
                    "w-full sm:w-auto",
                    "rounded-none sm:rounded-2xl",
                    "p-0",
                    "flex flex-col",
                    className
                )}
            >
                {/* Header - Sticky */}
                <DialogHeader className="sticky top-0 z-10 bg-white px-4 py-4 border-b flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-semibold">
                            {title}
                        </DialogTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={() => onOpenChange(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </DialogHeader>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-4 py-4 overscroll-contain">
                    {children}
                </div>

                {/* Footer - Sticky */}
                {footer && (
                    <DialogFooter className="sticky bottom-0 z-10 bg-white px-4 py-4 border-t flex-shrink-0 safe-area-bottom">
                        {footer}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
