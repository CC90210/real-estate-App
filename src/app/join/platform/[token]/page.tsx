'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, Mail, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function PlatformSignupPage({ params }: { params: { token: string } }) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [invite, setInvite] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    // Form State
    const [companyName, setCompanyName] = useState('')
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const supabase = createClient()

    useEffect(() => {
        async function fetchInvite() {
            const { data, error } = await supabase
                .from('platform_invitations')
                .select('label, company_name, assigned_plan, is_enterprise, status, expires_at, max_uses, use_count')
                .eq('token', params.token)
                .single()

            if (error || !data) {
                setError('This invitation link is invalid or does not exist.')
                setLoading(false)
                return
            }

            if (data.status !== 'active') {
                setError('This invitation has already been used or revoked.')
                setLoading(false)
                return
            }

            if (new Date(data.expires_at) < new Date()) {
                setError('This invitation has expired.')
                setLoading(false)
                return
            }

            if (data.use_count >= data.max_uses) {
                setError('This invitation has reached its maximum uses.')
                setLoading(false)
                return
            }

            setInvite(data)
            if (data.company_name) setCompanyName(data.company_name)
            setLoading(false)
        }
        fetchInvite()
    }, [params.token, supabase])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        try {
            const res = await fetch('/api/auth/platform-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: params.token,
                    email,
                    password,
                    fullName,
                    companyName
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to sign up')

            // Authenticate the user manually on the client now that they exist
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) throw signInError

            toast.success('Account created successfully!')
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message)
            toast.error(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" /></div>
    }

    if (error && !invite) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-xl text-center max-w-md w-full border border-gray-100">
                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-600">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 mb-2">Invalid Invitation</h1>
                    <p className="text-gray-500 font-medium mb-8">{error}</p>
                    <Link href="/login" className="block w-full py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-all shadow-lg">
                        Return to Sign In
                    </Link>
                </div>
            </div>
        )
    }

    const badgeText = invite.is_enterprise ? 'Enterprise Access' : `${invite.assigned_plan.replace('_', ' ')} Plan`

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 max-w-5xl w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100">

                {/* Left side: branding/info */}
                <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-12 text-white flex flex-col justify-between hidden md:flex">
                    <div>
                        <div className="flex items-center gap-3 mb-16">
                            <div className="h-10 w-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center">
                                <Building2 className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-2xl font-black tracking-tight">PropFlow</span>
                        </div>

                        <h2 className="text-4xl font-black mb-6 leading-tight">You've been invited<br />to join PropFlow.</h2>
                        <p className="text-blue-100/80 font-medium text-lg leading-relaxed mb-8">
                            Complete your registration to access your custom workspace.
                        </p>

                        <div className="inline-block px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl font-bold tracking-wide uppercase text-xs border border-white/20">
                            Unlocked: {badgeText}
                        </div>
                    </div>
                </div>

                {/* Right side: Form */}
                <div className="p-8 md:p-12">
                    <div className="max-w-sm mx-auto">
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Create Account</h3>
                        <p className="text-gray-500 font-medium text-sm mb-8">Set up your profile and workspace.</p>

                        {error && (
                            <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-xl text-sm font-bold flex items-center gap-2">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Company Name</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        required
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-medium transition-all"
                                        placeholder="Your Real Estate Co."
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-medium transition-all"
                                        placeholder="Jane Doe"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        required
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-medium transition-all"
                                        placeholder="jane@example.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        required
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-medium transition-all"
                                        placeholder="••••••••"
                                        minLength={8}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full h-14 mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? 'Creating Workspace...' : 'Create Account'}
                                {!submitting && <ArrowRight className="h-5 w-5" />}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
