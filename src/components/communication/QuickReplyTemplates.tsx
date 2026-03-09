'use client'

import { cn } from '@/lib/utils'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import {
    CheckCircle,
    Video,
    HelpCircle,
    Calendar,
    FileText,
    Tag,
} from 'lucide-react'

export interface QuickReplyTemplatesProps {
    onSelect: (message: string) => void
    propertyAddress?: string
    videoUrl?: string
    applicationUrl?: string
    monthlyRent?: number
    promoText?: string
    className?: string
}

interface TemplateItem {
    id: string
    label: string
    icon: React.ElementType
    build: (props: QuickReplyTemplatesProps) => string
    color: string
}

const TEMPLATES: TemplateItem[] = [
    {
        id: 'availability',
        label: 'Availability',
        icon: CheckCircle,
        color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-100',
        build: ({ propertyAddress }) =>
            `Hi! The property at ${propertyAddress || '[address]'} is currently available. Would you like to learn more?`,
    },
    {
        id: 'video',
        label: 'Video Tour',
        icon: Video,
        color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100',
        build: ({ propertyAddress, videoUrl }) =>
            `Great news! Here is a video walkthrough of the property at ${propertyAddress || '[address]'}: ${videoUrl || '[video link]'}`,
    },
    {
        id: 'interest',
        label: 'Follow Up',
        icon: HelpCircle,
        color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100',
        build: ({ propertyAddress }) =>
            `Hi! Just following up — are you still interested in ${propertyAddress || '[address]'}? We would love to help you move forward.`,
    },
    {
        id: 'schedule',
        label: 'Schedule Showing',
        icon: Calendar,
        color: 'text-violet-600 bg-violet-50 hover:bg-violet-100 border-violet-100',
        build: () =>
            `I would love to show you the property in person. What days and times work best for you this week?`,
    },
    {
        id: 'application',
        label: 'Application Link',
        icon: FileText,
        color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border-indigo-100',
        build: ({ applicationUrl }) =>
            `Ready to take the next step? Here is your application link: ${applicationUrl || '[application link]'}. It only takes a few minutes to complete.`,
    },
    {
        id: 'pricing',
        label: 'Pricing & Promo',
        icon: Tag,
        color: 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-100',
        build: ({ monthlyRent, promoText }) =>
            `The monthly rent is $${monthlyRent?.toLocaleString() || '[amount]'}. We are currently offering ${promoText || 'one month free'} for new tenants who sign before the end of the month.`,
    },
]

export function QuickReplyTemplates({
    onSelect,
    propertyAddress,
    videoUrl,
    applicationUrl,
    monthlyRent,
    promoText,
    className,
}: QuickReplyTemplatesProps) {
    const { colors } = useAccentColor()

    return (
        <div className={cn('space-y-2', className)}>
            <p className={cn('text-[10px] font-black uppercase tracking-widest', colors.text)}>
                Quick Replies
            </p>
            <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((template) => {
                    const Icon = template.icon
                    const message = template.build({
                        onSelect,
                        propertyAddress,
                        videoUrl,
                        applicationUrl,
                        monthlyRent,
                        promoText,
                    })

                    return (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => onSelect(message)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95',
                                template.color
                            )}
                        >
                            <Icon className="h-3 w-3 shrink-0" />
                            {template.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
