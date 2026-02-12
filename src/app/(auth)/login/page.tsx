'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('redirect') || '/dashboard'
    const supabase = createClient()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            // Sign in with Supabase Auth
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) throw error

            // Check if profile exists
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, company_id')
                .eq('id', data.user.id)
                .single()

            if (profileError || !profile) {
                // No profile - go to onboarding
                router.push('/onboarding')
                return
            }

            if (!profile.company_id) {
                // No company - go to onboarding
                router.push('/onboarding')
                return
            }

            // Success - go to dashboard or redirect
            toast.success('Welcome back!')
            router.push(redirectTo)
            router.refresh()

        } catch (error: any) {
            console.error('Login error:', error)
            toast.error('Login failed', {
                description: error.message || 'Please check your credentials'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 p-12 flex-col justify-between">
                <div>
                    <Logo theme="light" />
                </div>

                <div>
                    <h1 className="text-4xl font-bold text-white mb-6">
                        Manage your real estate portfolio with confidence.
                    </h1>
                    <p className="text-blue-100 text-lg mb-8">
                        The all-in-one platform for modern property managers.
                        Automate leases, track maintenance, and handle accounting in one place.
                    </p>
                    <div className="space-y-3">
                        <Feature text="Automated Tenant Screening" />
                        <Feature text="AI-Powered Lease Generation" />
                        <Feature text="Instant Financial Reporting" />
                    </div>
                </div>

                <p className="text-blue-200 text-sm">
                    © 2026 PropFlow Inc. All rights reserved.
                </p>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-8">
                        <Logo theme="dark" />
                    </div>

                    <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
                    <p className="text-gray-500 mb-8">
                        Enter your credentials to access your dashboard.
                    </p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <Label htmlFor="email">Work Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <Label htmlFor="password">Password</Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-gray-500" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-gray-500" />
                                    )}
                                    <span className="sr-only">Toggle password visibility</span>
                                </Button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In to Dashboard'
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Don't have an account?{' '}
                        <Link href="/contact" className="text-blue-600 hover:underline font-bold">
                            Request Enterprise Access
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

function Feature({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-2 text-white">
            <svg className="h-5 w-5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {text}
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
