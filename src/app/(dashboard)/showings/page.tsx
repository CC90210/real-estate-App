'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Plus, Calendar, Clock, MapPin, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

import { useCompanyId } from '@/lib/hooks/useCompanyId'
import { useAccentColor } from '@/lib/hooks/useAccentColor'
import { cn } from '@/lib/utils'
import { TierGuard } from '@/components/auth/TierGuard'

export default function ShowingsPage() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const { companyId } = useCompanyId()
    const { colors } = useAccentColor()
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [formData, setFormData] = useState({
        property_id: '',
        client_name: '',
        client_email: '',
        client_phone: '',
        scheduled_date: '',
        scheduled_time: '10:00',
        notes: ''
    })

    // Fetch showings
    const { data: showings, isLoading } = useQuery({
        queryKey: ['showings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('showings')
                .select(`
                    *,
                    property:properties(address, unit_number)
                `)
                .eq('company_id', companyId)
                .order('scheduled_date')

            if (error) throw error
            return data || []
        }
    })

    // Fetch properties for dropdown
    const { data: properties } = useQuery({
        queryKey: ['properties-simple'],
        queryFn: async () => {
            const { data } = await supabase
                .from('properties')
                .select('id, address, unit_number')
                .order('address')
            return data || []
        }
    })

    // Create showing
    const createShowing = useMutation({
        mutationFn: async (data: any) => {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user?.id)
                .single()

            const { data: showing, error } = await supabase
                .from('showings')
                .insert({
                    ...data,
                    company_id: profile?.company_id,
                    agent_id: user?.id,
                    status: 'scheduled'
                })
                .select()
                .single()

            if (error) throw error
            return showing
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['showings'] })
            toast.success('Showing scheduled!')
            setDialogOpen(false)
            resetForm()
        },
        onError: (error: any) => {
            toast.error('Failed to schedule', { description: error.message })
        }
    })

    // Convert showings to calendar events
    const calendarEvents = showings?.map(showing => ({
        id: showing.id,
        title: `${showing.client_name} - ${showing.property?.address || 'Property'}`,
        start: `${showing.scheduled_date}T${showing.scheduled_time}`,
        backgroundColor: showing.status === 'completed' ? '#10b981' :
            showing.status === 'cancelled' ? '#ef4444' : (colors.primary || '#3b82f6'),
        extendedProps: showing
    })) || []

    const handleDateClick = (arg: any) => {
        setSelectedDate(arg.dateStr)
        setFormData(prev => ({ ...prev, scheduled_date: arg.dateStr }))
        setDialogOpen(true)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.property_id) {
            toast.error("Please select a property")
            return
        }
        createShowing.mutate(formData)
    }

    const resetForm = () => {
        setFormData({
            property_id: '',
            client_name: '',
            client_email: '',
            client_phone: '',
            scheduled_date: '',
            scheduled_time: '10:00',
            notes: ''
        })
    }

    // Style customization helper
    const renderEventContent = (eventInfo: any) => {
        const time = new Date(eventInfo.event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return (
            <div className="p-1 px-2 text-xs overflow-hidden">
                <div className="font-bold">{time}</div>
                <div className="truncate font-semibold">{eventInfo.event.title}</div>
            </div>
        )
    }

    return (
        <TierGuard feature="showings">
            <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] mb-1", colors.text)}>
                            <Calendar className="h-3 w-3" />
                            <span>Schedule Management</span>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900">Showings Calendar</h1>
                        <p className="text-slate-500 font-medium">
                            Coordinate viewings and client appointments ({showings?.length || 0} scheduled)
                        </p>
                    </div>
                    <Button
                        onClick={() => setDialogOpen(true)}
                        className={cn("h-14 px-8 text-white rounded-2xl shadow-xl gap-2 font-bold transition-all hover:scale-105 active:scale-95", colors.bg, `hover:${colors.bgHover}`, colors.shadow)}
                    >
                        <Plus className="w-5 h-5" />
                        Schedule Showing
                    </Button>
                </div>

                <Card className="rounded-[2.5rem] border-slate-200/60 shadow-xl bg-white overflow-hidden p-6">
                    <CardContent className="p-0 calendar-custom">
                        <style jsx global>{`
                            .fc {
                                font-family: inherit;
                            }
                            .fc-toolbar-title {
                                font-size: 1.5rem !important;
                                font-weight: 800 !important;
                                color: #0f172a;
                            }
                            .fc-button-primary {
                                background-color: #f1f5f9 !important;
                                border-color: transparent !important;
                                color: #475569 !important;
                                font-weight: 700 !important;
                                text-transform: uppercase !important;
                                font-size: 0.75rem !important;
                                letter-spacing: 0.05em !important;
                                padding: 0.75rem 1.25rem !important;
                                border-radius: 0.75rem !important;
                            }
                            .fc-button-primary:hover {
                                background-color: #e2e8f0 !important;
                                color: #1e293b !important;
                            }
                            .fc-button-active {
                                background-color: ${colors.primary} !important;
                                color: white !important;
                            }
                            .fc-daygrid-day-number {
                                font-weight: 600;
                                color: #64748b;
                                padding: 0.5rem !important;
                            }
                            .fc-col-header-cell-cushion {
                                text-transform: uppercase;
                                font-weight: 800;
                                font-size: 0.75rem;
                                letter-spacing: 0.1em;
                                color: #94a3b8;
                                padding: 1rem 0 !important;
                            }
                            .fc-event {
                                border: none !important;
                                border-radius: 6px !important;
                                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
                            }
                        `}</style>
                        {isLoading ? (
                            <div className="space-y-4 p-4">
                                <Skeleton className="h-16 w-full rounded-xl" />
                                <div className="grid grid-cols-7 gap-4 h-[600px]">
                                    {[...Array(35)].map((_, i) => (
                                        <Skeleton key={i} className="h-full w-full rounded-xl" />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <FullCalendar
                                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                initialView="dayGridMonth"
                                headerToolbar={{
                                    left: 'prev,next today',
                                    center: 'title',
                                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                                }}
                                events={calendarEvents}
                                dateClick={handleDateClick}
                                eventContent={renderEventContent}
                                eventClick={(info) => {
                                    toast.info(`Viewing for ${info.event.title} at ${info.event.start?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
                                }}
                                height="auto"
                                aspectRatio={1.8}
                                editable={true} // Allow dragging if we implement update logic later
                                selectable={true}
                            />
                        )}
                    </CardContent>
                </Card>

                {/* Schedule Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="rounded-[2rem] p-8 max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black text-slate-900">Schedule Showing</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                            <div className="space-y-2">
                                <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Property</Label>
                                <Select
                                    value={formData.property_id}
                                    onValueChange={(v) => setFormData({ ...formData, property_id: v })}
                                >
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold">
                                        <SelectValue placeholder="Select property" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {properties?.map(p => (
                                            <SelectItem key={p.id} value={p.id} className="font-bold cursor-pointer py-3">
                                                {p.address}{p.unit_number ? ` #${p.unit_number}` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Client Name</Label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        required
                                        value={formData.client_name}
                                        onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                        placeholder="Full Name"
                                        className="h-12 pl-12 rounded-xl bg-slate-50 border-slate-100 font-semibold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Email</Label>
                                    <Input
                                        type="email"
                                        value={formData.client_email}
                                        onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                                        className="h-12 rounded-xl bg-slate-50 border-slate-100 font-semibold"
                                        placeholder="client@email.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Phone</Label>
                                    <Input
                                        type="tel"
                                        value={formData.client_phone}
                                        onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                                        className="h-12 rounded-xl bg-slate-50 border-slate-100 font-semibold"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Date</Label>
                                    <div className="relative">
                                        <Input
                                            type="date"
                                            required
                                            value={formData.scheduled_date}
                                            onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                                            className="h-12 rounded-xl bg-slate-50 border-slate-100 font-semibold"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="uppercase text-[10px] font-black tracking-widest text-slate-500">Time</Label>
                                    <div className="relative">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            type="time"
                                            required
                                            value={formData.scheduled_time}
                                            onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                                            className="h-12 pl-12 rounded-xl bg-slate-50 border-slate-100 font-semibold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-4">
                                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl font-bold text-slate-500 hover:text-slate-900">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createShowing.isPending} className={cn("text-white rounded-xl font-bold px-8 shadow-lg", colors.bg, `hover:${colors.bgHover}`, colors.shadow)}>
                                    {createShowing.isPending ? 'Scheduling...' : 'Confirm Appointment'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </TierGuard>
    )
}
