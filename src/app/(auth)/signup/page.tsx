'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

import { Loader2, Building2, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@/lib/hooks/useUser'

import { useAuth } from '@/lib/hooks/useAuth'
import { useEffect } from 'react'

export default function SignupPage() {
    const router = useRouter()
    const { signUp } = useUser()
    const { isAuthenticated, isLoading: authLoading } = useAuth()

    // Client-side redirect if already authenticated
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.push('/dashboard')
        }
    }, [isAuthenticated, authLoading, router])

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        companyName: '',
        jobTitle: ''
    })
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (formData.password.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }

        setIsLoading(true)


        try {
            // Use the centralized signUp method which handles API call and auto-login
            const { error: signUpError } = await signUp(
                formData.email.toLowerCase(),
                formData.password,
                formData.fullName,
                'agent',
                formData.companyName,
                formData.jobTitle
            );

            if (signUpError) throw signUpError;

            // Success! One single notification.
            toast.success('Welcome to PropFlow!', {
                description: 'Setting up your workspace...',
                duration: 4000
            });

            router.push('/dashboard');
        } catch (error: any) {
            console.error('Signup error:', error)
            toast.error('Signup Failed', {
                description: error.message || 'Please check your information and try again.',
                duration: 5000,
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
                    <div className="flex items-center gap-3 text-white">
                        <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <span className="text-xl font-bold">PropFlow</span>
                    </div>
                </div>

                <div>
                    <h1 className="text-4xl font-bold text-white mb-6">
                        Start managing properties smarter today.
                    </h1>
                    <p className="text-blue-100 text-lg mb-8">
                        Join thousands of property managers who've simplified their workflow with PropFlow.
                    </p>
                    <div className="space-y-3">
                        <Feature text="14-day free trial" />
                        <Feature text="No credit card required" />
                        <Feature text="Cancel anytime" />
                    </div>
                </div>

                <p className="text-blue-200 text-sm">
                    © 2026 PropFlow Inc. All rights reserved.
                </p>
            </div>

            {/* Right Panel - Signup Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xl font-bold">PropFlow</span>
                    </div>

                    <h2 className="text-2xl font-bold mb-2">Create your account</h2>
                    <p className="text-gray-500 mb-8">
                        Start your 14-day free trial. No credit card required.
                    </p>

                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <Label htmlFor="jobTitle">Job Title</Label>
                                <Input
                                    id="jobTitle"
                                    placeholder="Property Manager"
                                    value={formData.jobTitle}
                                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                                id="companyName"
                                placeholder="Your Real Estate Agency"
                                value={formData.companyName}
                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <Label htmlFor="email">Work Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Min. 8 characters"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    minLength={8}
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

                        <div>
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm your password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                    disabled={isLoading}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? (
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
                                    Creating account...
                                </>
                            ) : (
                                'Start Free Trial'
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Already have an account?{' '}
                        <Link href="/login" className="text-blue-600 hover:underline font-medium">
                            Sign in
                        </Link>
                    </p>

                    <p className="text-center text-xs text-gray-400 mt-4">
                        By signing up, you agree to our{' '}
                        <Link href="/terms" className="underline">Terms of Service</Link>
                        {' '}and{' '}
                        <Link href="/privacy" className="underline">Privacy Policy</Link>
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
