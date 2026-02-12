'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Building2, Lock, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [done, setDone] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error
            setDone(true)
            toast.success('Password updated successfully!')
            setTimeout(() => router.push('/login'), 3000)
        } catch (err: any) {
            toast.error(err.message || 'Failed to reset password')
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
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-[0.3em] mt-1">Set New Password</p>
                </div>

                <Card className="border-0 shadow-xl">
                    <CardContent className="p-8">
                        {done ? (
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Password Reset!</h2>
                                <p className="text-sm text-slate-500">
                                    Your password has been updated. Redirecting to login...
                                </p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-bold text-slate-900 mb-2">Create New Password</h2>
                                <p className="text-sm text-slate-500 mb-6">
                                    Enter your new password below.
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                                        <div className="relative mt-1">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="pl-10 pr-10 h-12 rounded-xl"
                                                required
                                                minLength={8}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                                        <div className="relative mt-1">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                className="pl-10 h-12 rounded-xl"
                                                required
                                                minLength={8}
                                            />
                                        </div>
                                    </div>

                                    {password && confirmPassword && password !== confirmPassword && (
                                        <p className="text-xs text-red-500 font-semibold">Passwords do not match</p>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full h-12 font-bold rounded-xl bg-slate-900 hover:bg-slate-800"
                                        disabled={loading || password !== confirmPassword || password.length < 8}
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        Update Password
                                    </Button>
                                </form>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
