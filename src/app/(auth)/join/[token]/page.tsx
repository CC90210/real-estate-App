'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface InvitationData {
    email: string
    role: string
    company: {
        id: string
        name: string
        logo_url?: string
    }
}

export default function JoinPage() {
    const params = useParams()
    const router = useRouter()
    const token = params.token as string

    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [invitation, setInvitation] = useState<InvitationData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const [form, setForm] = useState({
        fullName: '',
        password: '',
        confirmPassword: '',
    })

    // Validate invitation on mount using the API
    useEffect(() => {
        async function validateInvitation() {
            try {
                const res = await fetch(`/api/team/validate?token=${token}`)
                const data = await res.json()

                if (!res.ok || !data.valid) {
                    setError(data.error || 'Invalid invitation')
                    return
                }

                setInvitation(data.invitation)
            } catch (err) {
                setError('Failed to validate invitation')
            } finally {
                setLoading(false)
            }
        }

        if (token) {
            validateInvitation()
        } else {
            setError('No invitation token provided')
            setLoading(false)
        }
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (!form.fullName.trim()) {
            toast.error('Please enter your full name')
            return
        }

        if (form.password.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }

        if (form.password !== form.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        setSubmitting(true)

        try {
            const res = await fetch('/api/team/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    fullName: form.fullName.trim(),
                    password: form.password,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create account')
            }

            setSuccess(true)
            toast.success('Account created successfully!')

            // Redirect to login after a moment
            setTimeout(() => {
                router.push('/login?message=Account created. Please sign in.')
            }, 2000)

        } catch (err: any) {
            toast.error(err.message || 'Failed to create account')
        } finally {
            setSubmitting(false)
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Validating invitation...</p>
                </div>
            </div>
        )
    }

    // Error state
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

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50/50">
                <Card className="max-w-md w-full shadow-xl border-green-100">
                    <CardContent className="pt-8 text-center">
                        <div className="h-16 w-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2 leading-none">Account Created!</h2>
                        <p className="text-slate-500 font-medium mb-6 leading-relaxed">
                            Redirecting you to sign in...
                        </p>
                        <Loader2 className="h-5 w-5 animate-spin text-indigo-600 mx-auto" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Form state
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50/50">
            <Card className="max-w-md w-full shadow-2xl shadow-slate-200 border-none rounded-[2rem] overflow-hidden">
                <CardHeader className="text-center pt-10 pb-6 bg-white">
                    {invitation?.company?.logo_url ? (
                        <div className="h-14 w-14 rounded-2xl mx-auto mb-6 overflow-hidden border border-slate-100 bg-white shadow-sm flex items-center justify-center">
                            <img
                                src={invitation.company.logo_url}
                                alt={invitation.company.name}
                                className="object-contain p-2"
                            />
                        </div>
                    ) : (
                        <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
                            <Building2 className="h-7 w-7 text-white" />
                        </div>
                    )}
                    <CardTitle className="text-3xl font-black tracking-tight text-slate-900">
                        Join {invitation?.company?.name}
                    </CardTitle>
                    <p className="text-slate-500 font-medium mt-2">
                        You've been invited as a{' '}
                        <span className="text-indigo-600 font-bold uppercase tracking-wider text-xs ml-1">
                            {invitation?.role}
                        </span>
                    </p>
                </CardHeader>
                <CardContent className="px-8 pb-10 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Locked email display */}
                        <div className="space-y-2">
                            <Label className="text-slate-900 font-bold ml-1">Email</Label>
                            <Input
                                value={invitation?.email || ''}
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
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-900 font-bold ml-1 text-sm uppercase tracking-wide">Create Password</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    minLength={8}
                                    placeholder="Min. 8 characters"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="h-12 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
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
                            Create Account & Join
                        </Button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-sm text-slate-500">
                        Already have an account?{' '}
                        <Link href="/login" className="text-indigo-600 hover:underline font-bold">
                            Sign in
                        </Link>
                    </p>

                    <p className="text-center text-xs text-slate-400 font-medium">
                        By joining, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
