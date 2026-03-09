'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BotFlowIndicator } from '@/components/communication/BotFlowIndicator'
import { QuickReplyTemplates } from '@/components/communication/QuickReplyTemplates'
import {
    MessageSquare,
    Send,
    Bot,
    User,
    AlertCircle,
    Loader2,
    Search,
    Clock,
    Zap,
    ChevronRight,
    Phone,
    Mail,
    ToggleLeft,
    ToggleRight,
    RefreshCw,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Prospect {
    id: string
    name: string
    email: string | null
    phone: string | null
    created_at: string
    // The contacts table may have a notes field or property association
    notes: string | null
}

interface Message {
    id: string
    role: 'bot' | 'agent' | 'prospect'
    content: string
    timestamp: Date
}

interface LeadState {
    botStep: number       // 0–5
    messages: Message[]
    botEnabled: boolean
}

// ---------------------------------------------------------------------------
// Seed bot messages for a given step (simulates auto-sent messages)
// ---------------------------------------------------------------------------
function buildInitialMessages(prospect: Prospect, botStep: number): Message[] {
    const msgs: Message[] = []
    const address = '[property address]'
    const videoUrl = 'https://propflow.app/video/demo'
    const appUrl = 'https://propflow.app/apply/demo'

    const addBot = (content: string, minutesAgo: number) => {
        msgs.push({
            id: `seed-bot-${msgs.length}`,
            role: 'bot',
            content,
            timestamp: new Date(Date.now() - minutesAgo * 60 * 1000),
        })
    }
    const addProspect = (content: string, minutesAgo: number) => {
        msgs.push({
            id: `seed-prospect-${msgs.length}`,
            role: 'prospect',
            content,
            timestamp: new Date(Date.now() - minutesAgo * 60 * 1000),
        })
    }

    if (botStep >= 1) {
        addBot(`Hi ${prospect.name}! The property at ${address} is currently available. Would you like to learn more?`, 120)
    }
    if (botStep >= 2) {
        addProspect('Yes, I am interested!', 100)
        addBot(`Here is a video walkthrough of the property: ${videoUrl}`, 99)
    }
    if (botStep >= 3) {
        addProspect('Looks great, I would love to see it.', 60)
        addBot(`Are you still interested in scheduling a showing at ${address}?`, 58)
    }
    if (botStep >= 4) {
        addProspect('Definitely! This week works for me.', 30)
        addBot('I would love to show you the property in person. What days and times work best for you this week?', 28)
    }
    if (botStep >= 5) {
        addProspect('Monday at 10am would be perfect.', 10)
        addBot(`Ready to take the next step? Here is your application link: ${appUrl}`, 5)
    }

    return msgs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CommunicationPage() {
    const supabase = createClient()
    const { isLoading: authLoading, company } = useAuth()
    const resolvedCompanyId = company?.id
    const { colors } = useAccentColor()

    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
    const [leadStates, setLeadStates] = useState<Record<string, LeadState>>({})
    const [draftMessage, setDraftMessage] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [isSending, setIsSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // -----------------------------------------------------------------------
    // Fetch prospects from contacts table where type = 'prospect'
    // -----------------------------------------------------------------------
    const { data: prospects, isLoading, error, refetch } = useQuery<Prospect[]>({
        queryKey: ['communication-prospects', resolvedCompanyId],
        queryFn: async () => {
            if (!resolvedCompanyId) return []

            const { data, error } = await supabase
                .from('contacts')
                .select('id, name, email, phone, created_at, notes')
                .eq('company_id', resolvedCompanyId)
                .eq('type', 'prospect')
                .order('created_at', { ascending: false })

            if (error) throw error
            return (data || []) as Prospect[]
        },
        enabled: !!resolvedCompanyId,
    })

    // -----------------------------------------------------------------------
    // Initialise lead state when prospects load
    // -----------------------------------------------------------------------
    useEffect(() => {
        if (!prospects) return
        setLeadStates(prev => {
            const next = { ...prev }
            prospects.forEach(p => {
                if (!next[p.id]) {
                    // Assign a random bot step (1–4) so the UI looks populated
                    const step = Math.floor(Math.random() * 4) + 1
                    next[p.id] = {
                        botStep: step,
                        messages: buildInitialMessages(p, step),
                        botEnabled: true,
                    }
                }
            })
            return next
        })
    }, [prospects])

    // Auto-select first lead
    useEffect(() => {
        if (prospects && prospects.length > 0 && !selectedLeadId) {
            setSelectedLeadId(prospects[0].id)
        }
    }, [prospects, selectedLeadId])

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [leadStates, selectedLeadId])

    // -----------------------------------------------------------------------
    // Derived data
    // -----------------------------------------------------------------------
    const filteredProspects = (prospects || []).filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    const selectedLead = prospects?.find(p => p.id === selectedLeadId) ?? null
    const selectedState = selectedLeadId ? leadStates[selectedLeadId] : null

    const pendingFollowUps = Object.values(leadStates).filter(s => s.botStep < 5 && s.botEnabled).length

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------
    const sendMessage = useCallback(() => {
        if (!draftMessage.trim() || !selectedLeadId) return
        setIsSending(true)

        const newMsg: Message = {
            id: `msg-${Date.now()}`,
            role: 'agent',
            content: draftMessage.trim(),
            timestamp: new Date(),
        }

        setLeadStates(prev => ({
            ...prev,
            [selectedLeadId]: {
                ...prev[selectedLeadId],
                messages: [...(prev[selectedLeadId]?.messages || []), newMsg],
            },
        }))
        setDraftMessage('')

        setTimeout(() => {
            setIsSending(false)
            toast.success('Message sent')
        }, 400)
    }, [draftMessage, selectedLeadId])

    const advanceBotStep = useCallback((leadId: string) => {
        setLeadStates(prev => {
            const current = prev[leadId]
            if (!current || current.botStep >= 5) return prev
            const newStep = current.botStep + 1
            const lead = prospects?.find(p => p.id === leadId)
            if (!lead) return prev

            const allBotMsgs = buildInitialMessages(lead, newStep)
            const existingIds = new Set(current.messages.map(m => m.id))
            const newMsgs = allBotMsgs.filter(m => !existingIds.has(m.id))

            return {
                ...prev,
                [leadId]: {
                    ...current,
                    botStep: newStep,
                    messages: [...current.messages, ...newMsgs].sort(
                        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
                    ),
                },
            }
        })
        toast.success('Bot advanced to next step')
    }, [prospects])

    const toggleBot = useCallback((leadId: string) => {
        setLeadStates(prev => ({
            ...prev,
            [leadId]: {
                ...prev[leadId],
                botEnabled: !prev[leadId]?.botEnabled,
            },
        }))
    }, [])

    const handleQuickReply = useCallback((msg: string) => {
        setDraftMessage(msg)
    }, [])

    // -----------------------------------------------------------------------
    // Loading / error guards
    // -----------------------------------------------------------------------
    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className={cn('h-10 w-10 animate-spin', colors.text)} />
            </div>
        )
    }

    if (!resolvedCompanyId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <p className="text-slate-500 font-medium">Unable to load workspace data.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                    Refresh Page
                </button>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="p-6 lg:p-10 space-y-8">
                <Skeleton className="h-10 w-64 rounded-xl" />
                <div className="flex gap-6 h-[600px]">
                    <Skeleton className="w-80 rounded-[2rem] shrink-0" />
                    <Skeleton className="flex-1 rounded-[2rem]" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-10 text-center">
                <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
                <h2 className="text-xl font-black text-slate-900 mb-2">Failed to Load Leads</h2>
                <p className="text-slate-500 mb-6">{(error as Error).message}</p>
                <Button onClick={() => refetch()} className="rounded-xl font-bold">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        )
    }

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <div className="relative p-6 lg:p-10 space-y-8 min-h-screen">
            {/* Background decoration */}
            <div className={cn('absolute top-0 right-0 w-[40rem] h-[40rem] rounded-full blur-[140px] -z-10 opacity-40', colors.bgLight)} />

            {/* Page header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className={cn('flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1', colors.text)}>
                        <MessageSquare className="h-3 w-3" />
                        <span>Phase 4 — Lead Communication</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Communication Center</h1>
                    <p className="text-slate-500 font-medium">
                        Automated prospect outreach and manual follow-up management
                    </p>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 flex-wrap">
                    <StatPill label="Active Leads" value={prospects?.length ?? 0} color="bg-blue-50 text-blue-700" />
                    <StatPill label="Pending Follow-ups" value={pendingFollowUps} color="bg-amber-50 text-amber-700" />
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <Zap className="h-4 w-4 text-emerald-600 fill-emerald-600" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Bot Active</span>
                    </div>
                </div>
            </div>

            {/* Two-panel layout */}
            {!prospects || prospects.length === 0 ? (
                <EmptyLeadsState colors={colors} />
            ) : (
                <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[calc(100vh-260px)]">
                    {/* --------------------------------------------------------
                        LEFT PANEL — Lead list
                    -------------------------------------------------------- */}
                    <div className="w-full lg:w-[320px] lg:shrink-0 flex flex-col gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search leads..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10 h-11 bg-white border-slate-200 rounded-2xl font-medium text-sm"
                            />
                        </div>

                        <Card className="flex-1 bg-white/80 backdrop-blur-xl border-slate-100 rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <span className={cn('text-[10px] font-black uppercase tracking-widest', colors.text)}>
                                    Leads ({filteredProspects.length})
                                </span>
                            </div>
                            <ScrollArea className="h-[300px] lg:h-[calc(100vh-420px)]">
                                <div className="p-3 space-y-1">
                                    <AnimatePresence>
                                        {filteredProspects.map((prospect, idx) => {
                                            const state = leadStates[prospect.id]
                                            const isSelected = selectedLeadId === prospect.id

                                            return (
                                                <motion.button
                                                    key={prospect.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.04 }}
                                                    onClick={() => setSelectedLeadId(prospect.id)}
                                                    className={cn(
                                                        'w-full text-left px-4 py-3 rounded-2xl transition-all duration-200 border',
                                                        isSelected
                                                            ? cn('shadow-md border-transparent', colors.bgLight)
                                                            : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                                                            isSelected ? colors.bg : 'bg-slate-100'
                                                        )}>
                                                            <User className={cn('h-4 w-4', isSelected ? 'text-white' : 'text-slate-400')} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className={cn(
                                                                'text-sm font-black truncate',
                                                                isSelected ? colors.text : 'text-slate-900'
                                                            )}>
                                                                {prospect.name}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-medium truncate">
                                                                {prospect.email || prospect.phone || 'No contact info'}
                                                            </div>
                                                        </div>
                                                        <ChevronRight className={cn('h-3.5 w-3.5 shrink-0', isSelected ? colors.text : 'text-slate-300')} />
                                                    </div>

                                                    {/* Bot step mini-indicator */}
                                                    <div className="mt-2.5 pl-12">
                                                        <BotFlowIndicator
                                                            currentStep={state?.botStep ?? 0}
                                                            compact
                                                        />
                                                    </div>

                                                    {/* Last message time */}
                                                    <div className="mt-1.5 pl-12 flex items-center gap-1">
                                                        <Clock className="h-2.5 w-2.5 text-slate-300" />
                                                        <span className="text-[9px] text-slate-400 font-medium">
                                                            {state?.messages.length
                                                                ? formatDistanceToNow(
                                                                    state.messages[state.messages.length - 1].timestamp,
                                                                    { addSuffix: true }
                                                                )
                                                                : 'No messages yet'}
                                                        </span>
                                                    </div>
                                                </motion.button>
                                            )
                                        })}
                                    </AnimatePresence>
                                </div>
                            </ScrollArea>
                        </Card>
                    </div>

                    {/* --------------------------------------------------------
                        RIGHT PANEL — Conversation view
                    -------------------------------------------------------- */}
                    <div className="flex-1 flex flex-col min-h-[500px] lg:min-h-0">
                        {selectedLead && selectedState ? (
                            <Card className="flex-1 bg-white/80 backdrop-blur-xl border-slate-100 rounded-[2rem] shadow-xl shadow-slate-200/40 flex flex-col overflow-hidden">
                                {/* Conversation header */}
                                <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-4">
                                        <div className={cn('h-11 w-11 rounded-2xl flex items-center justify-center', colors.bg)}>
                                            <User className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black text-slate-900 leading-tight">
                                                {selectedLead.name}
                                            </h2>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                {selectedLead.email && (
                                                    <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                                        <Mail className="h-2.5 w-2.5" />
                                                        {selectedLead.email}
                                                    </span>
                                                )}
                                                {selectedLead.phone && (
                                                    <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                                        <Phone className="h-2.5 w-2.5" />
                                                        {selectedLead.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bot toggle + advance */}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <button
                                            onClick={() => toggleBot(selectedLead.id)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-all"
                                        >
                                            {selectedState.botEnabled ? (
                                                <ToggleRight className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <ToggleLeft className="h-4 w-4 text-slate-400" />
                                            )}
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                                                Bot {selectedState.botEnabled ? 'On' : 'Off'}
                                            </span>
                                        </button>

                                        {selectedState.botStep < 5 && (
                                            <Button
                                                size="sm"
                                                onClick={() => advanceBotStep(selectedLead.id)}
                                                className={cn(
                                                    'h-9 rounded-xl text-white font-black text-[10px] uppercase tracking-wider px-4',
                                                    colors.bg,
                                                    `hover:${colors.bgHover}`
                                                )}
                                            >
                                                <Bot className="h-3.5 w-3.5 mr-1.5" />
                                                Advance Bot
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Bot flow progress bar */}
                                <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <Bot className={cn('h-3.5 w-3.5', colors.text)} />
                                        <span className={cn('text-[10px] font-black uppercase tracking-widest', colors.text)}>
                                            Bot Flow
                                        </span>
                                    </div>
                                    <BotFlowIndicator currentStep={selectedState.botStep} />
                                    <Badge
                                        className={cn(
                                            'text-[9px] font-black uppercase tracking-widest border-none px-2 py-0.5 rounded-lg ml-auto',
                                            selectedState.botStep >= 5
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : colors.bgLight + ' ' + colors.text
                                        )}
                                    >
                                        Step {selectedState.botStep}/5
                                        {selectedState.botStep >= 5 && ' — Complete'}
                                    </Badge>
                                </div>

                                {/* Message history */}
                                <ScrollArea className="flex-1 p-6">
                                    <div className="space-y-4">
                                        <AnimatePresence initial={false}>
                                            {selectedState.messages.map((msg) => (
                                                <motion.div
                                                    key={msg.id}
                                                    initial={{ opacity: 0, y: 8 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className={cn(
                                                        'flex items-end gap-2.5',
                                                        msg.role === 'prospect' ? 'flex-row' : 'flex-row-reverse'
                                                    )}
                                                >
                                                    {/* Avatar */}
                                                    <div className={cn(
                                                        'h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
                                                        msg.role === 'bot'
                                                            ? 'bg-indigo-600'
                                                            : msg.role === 'agent'
                                                                ? cn(colors.bg)
                                                                : 'bg-slate-200'
                                                    )}>
                                                        {msg.role === 'bot' ? (
                                                            <Bot className="h-3.5 w-3.5 text-white" />
                                                        ) : msg.role === 'agent' ? (
                                                            <User className="h-3.5 w-3.5 text-white" />
                                                        ) : (
                                                            <User className="h-3.5 w-3.5 text-slate-500" />
                                                        )}
                                                    </div>

                                                    {/* Bubble */}
                                                    <div className={cn(
                                                        'max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed font-medium',
                                                        msg.role === 'prospect'
                                                            ? 'bg-slate-100 text-slate-800 rounded-bl-none'
                                                            : msg.role === 'bot'
                                                                ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-br-none'
                                                                : cn(colors.bgLight, colors.text, 'rounded-br-none border', colors.border)
                                                    )}>
                                                        {msg.role !== 'prospect' && (
                                                            <div className={cn(
                                                                'text-[9px] font-black uppercase tracking-widest mb-1',
                                                                msg.role === 'bot' ? 'text-indigo-400' : colors.text
                                                            )}>
                                                                {msg.role === 'bot' ? 'PropFlow Bot' : 'You'}
                                                            </div>
                                                        )}
                                                        {msg.content}
                                                        <div className="text-[9px] font-medium mt-1.5 opacity-50">
                                                            {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                        <div ref={messagesEndRef} />
                                    </div>
                                </ScrollArea>

                                {/* Quick replies + composer */}
                                <div className="px-6 py-4 border-t border-slate-100 space-y-3 bg-white/60 backdrop-blur-sm">
                                    <QuickReplyTemplates
                                        onSelect={handleQuickReply}
                                        propertyAddress={selectedLead.notes || undefined}
                                    />

                                    <div className="flex items-end gap-3">
                                        <Textarea
                                            value={draftMessage}
                                            onChange={e => setDraftMessage(e.target.value)}
                                            placeholder="Write a message to this prospect..."
                                            rows={2}
                                            className="flex-1 resize-none bg-slate-50 border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-slate-300 transition-all"
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                                    e.preventDefault()
                                                    sendMessage()
                                                }
                                            }}
                                        />
                                        <Button
                                            onClick={sendMessage}
                                            disabled={!draftMessage.trim() || isSending}
                                            className={cn(
                                                'h-12 w-12 rounded-2xl text-white shadow-lg transition-all hover:scale-105 active:scale-95',
                                                colors.bg,
                                                `hover:${colors.bgHover}`,
                                                colors.shadow
                                            )}
                                        >
                                            {isSending ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-medium text-right">
                                        Ctrl+Enter to send
                                    </p>
                                </div>
                            </Card>
                        ) : (
                            <Card className="flex-1 flex items-center justify-center bg-white/60 border-slate-100 rounded-[2rem]">
                                <div className="text-center space-y-3">
                                    <div className={cn('h-16 w-16 rounded-[2rem] flex items-center justify-center mx-auto', colors.bgLight)}>
                                        <MessageSquare className={cn('h-8 w-8 opacity-30', colors.text)} />
                                    </div>
                                    <p className="text-slate-400 font-medium text-sm">Select a lead to view the conversation</p>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className={cn('flex items-center gap-2 px-4 py-2 rounded-2xl border border-transparent', color)}>
            <span className="text-xl font-black leading-none">{value}</span>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
        </div>
    )
}

function EmptyLeadsState({ colors }: { colors: ReturnType<typeof useAccentColor>['colors'] }) {
    return (
        <div className={cn(
            'flex flex-col items-center justify-center p-20 text-center bg-white/50 backdrop-blur-md rounded-[3rem] border-2 border-dashed border-slate-200'
        )}>
            <div className={cn('h-20 w-20 rounded-[2rem] flex items-center justify-center mb-6', colors.bgLight)}>
                <MessageSquare className={cn('h-10 w-10 opacity-20', colors.text)} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">No Leads Yet</h2>
            <p className="text-slate-500 font-medium max-w-sm">
                Prospects will appear here once contacts with type "prospect" are added to your company.
            </p>
        </div>
    )
}
