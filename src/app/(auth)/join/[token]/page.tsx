'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function JoinPage() {
    const params = useParams()
    const router = useRouter()
    const token = params.token as string
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [invitation, setInvitation] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({
        fullName: '',
        password: '',
        confirmPassword: ''
    })

    // Fetch invitation details
    useEffect(() => {
        async function fetchInvitation() {
            const { data, error } = await supabase
                .from('team_invitations')
                .select('*, company:companies(name)')
                .eq('token', token)
                .is('accepted_at', null)
                .gt('expires_at', new Date().toISOString())
                .single()

            if (error || !data) {
                setError('This invitation is invalid or has expired.')
            } else {
                setInvitation(data)
            }
            setLoading(false)
        }

        fetchInvitation()
    }, [token, supabase])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (form.password !== form.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (form.password.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }

        setSubmitting(true)

        try {
            const res = await fetch('/api/team/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    fullName: form.fullName,
                    password: form.password,
                }),
            })

            const data = await res.json()

            if (data.error) throw new Error(data.error)

            toast.success(data.message || 'Welcome to the team!')
            router.push('/login?joined=true')

        } catch (err: any) {
            toast.error('Failed to join', { description: err.message })
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50/50">
                <Card className="max-w-md w-full border-red-100 shadow-xl">
                    <CardContent className="pt-8 text-center">
                        <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2 leading-none">Invalid Invitation</h2>
                        <p className="text-slate-500 font-medium mb-8 leading-relaxed px-4">{error}</p>
                        <Button
                            onClick={() => router.push('/login')}
                            className="w-full h-12 bg-slate-900 hover:bg-slate-800 rounded-xl font-bold transition-all"
                        >
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50/50">
            <Card className="max-w-md w-full shadow-2xl shadow-slate-200 border-none rounded-[2rem] overflow-hidden">
                <CardHeader className="text-center pt-10 pb-6 bg-white">
                    <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
                        <Building2 className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tight text-slate-900">Join {invitation?.company?.name}</CardTitle>
                    <p className="text-slate-500 font-medium mt-2">
                        You've been invited as a <span className="text-indigo-600 font-bold uppercase tracking-wider text-xs ml-1">{invitation?.role}</span>
                    </p>
                </CardHeader>
                <CardContent className="px-8 pb-10 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-slate-900 font-bold ml-1">Email</Label>
                            <Input
                                value={invitation?.email}
                                disabled
                                className="h-12 bg-slate-50 border-slate-100 text-slate-500 font-medium rounded-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-900 font-bold ml-1 text-sm uppercase tracking-wide">Full Name</Label>
                            <Input
                                required
                                placeholder="E.g. John Smith"
                                value={form.fullName}
                                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                className="h-12 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-900 font-bold ml-1 text-sm uppercase tracking-wide">Create Password</Label>
                            <Input
                                type="password"
                                required
                                minLength={8}
                                placeholder="Min. 8 characters"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="h-12 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-900 font-bold ml-1 text-sm uppercase tracking-wide">Confirm Password</Label>
                            <Input
                                type="password"
                                required
                                placeholder="Repeat your password"
                                value={form.confirmPassword}
                                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                className="h-12 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase tracking-widest transition-all mt-4 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-slate-200"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Join Team
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
