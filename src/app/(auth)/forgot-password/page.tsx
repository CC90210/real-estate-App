'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) throw error
            setSent(true)
            toast.success('Reset email sent!')
        } catch (err: any) {
            toast.error(err.message || 'Failed to send reset email')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl mb-4">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">PropFlow</h1>
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-[0.3em] mt-1">Password Recovery</p>
                </div>

                <Card className="border-0 shadow-xl">
                    <CardContent className="p-8">
                        {sent ? (
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Check Your Email</h2>
                                <p className="text-sm text-slate-500">
                                    We sent a password reset link to <strong>{email}</strong>.
                                    Check your inbox and follow the link to reset your password.
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => setSent(false)}
                                >
                                    Send Again
                                </Button>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-slate-900 mb-2">Forgot Password?</h2>
                                <p className="text-sm text-slate-500 mb-6">
                                    Enter your email address and we'll send you a link to reset your password.
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                        <div className="relative mt-1">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type="email"
                                                placeholder="you@example.com"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="pl-10 h-12 rounded-xl"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-12 font-bold rounded-xl bg-slate-900 hover:bg-slate-800"
                                        disabled={loading}
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        Send Reset Link
                                    </Button>
                                </form>
                            </>
                        )}

                        <div className="mt-6 text-center">
                            <Link href="/login" className="text-sm font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
                                <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
