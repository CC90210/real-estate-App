'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { useAutomationSubscription } from '@/lib/hooks/useAutomations'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface AutomationButtonProps {
    actionType: string
    entityType: string
    entityId: string
    label: string
    icon: React.ReactNode
}

export function AutomationButton({
    actionType,
    entityType,
    entityId,
    label,
    icon
}: AutomationButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const { data: subscription } = useAutomationSubscription()
    const supabase = createClient()

    // If no automation subscription, show upgrade prompt behavior
    if (!subscription?.is_active) {
        return (
            <Button variant="outline" disabled className="opacity-50 justify-start w-full sm:w-auto">
                {icon}
                <span className="ml-2">{label}</span>
                <Badge variant="secondary" className="ml-2 text-xs bg-gradient-to-r from-amber-200 to-yellow-400 text-amber-900 border-none">PRO</Badge>
            </Button>
        )
    }

    const handleClick = async () => {
        setIsLoading(true)
        const toastId = toast.loading('Triggering automation...')

        try {
            const response = await fetch('/api/automations/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actionType,
                    entityType,
                    entityId
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error)
            }

            toast.success('Automation started!', { id: toastId })

        } catch (error: any) {
            toast.error(error.message || 'Failed to trigger automation', { id: toastId })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button onClick={handleClick} disabled={isLoading} variant="secondary" className="justify-start w-full sm:w-auto">
            {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <span className="mr-2">{icon}</span>}
            {label}
        </Button>
    )
}
