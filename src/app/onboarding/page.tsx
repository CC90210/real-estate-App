'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertCircle, RefreshCw, Building2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function OnboardingPage() {
    const router = useRouter()
    const supabase = createClient()
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
    const [errorDetails, setErrorDetails] = useState<string | null>(null)
    const [attempts, setAttempts] = useState(0)
    const checkInProgress = useRef(false)

    useEffect(() => {
        // Prevent multiple concurrent checks
        if (checkInProgress.current) return
        checkInProgress.current = true

        const runOnboardingCheck = async () => {
            try {
                // Small delay to allow session to stabilize and prevent race conditions with auth state
                await new Promise(r => setTimeout(r, 500))

                // 1. Get current user
                const { data: { user }, error: userError } = await supabase.auth.getUser()

                if (userError) {
                    // Handle specific abort/network errors gracefully
                    if (userError.message.includes('aborted')) {
                        console.log('User check aborted, retrying...')
                        checkInProgress.current = false
                        return
                    }
                    throw userError
                }

                if (!user) {
                    router.push('/login')
                    return
                }

                // 2. Check if profile exists
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, company_id')
                    .eq('id', user.id)
                    .maybeSingle()

                if (profileError && !profileError.message.includes('aborted')) {
                    throw profileError
                }

                if (profile && profile.company_id) {
                    setStatus('success')
                    router.push('/dashboard')
                    return
                }

                // 3. If no profile, try to run "ensure_user_profile" RPC
                // This is our 'Self-Healing' protocol
                const { data: rpcData, error: rpcError } = await supabase.rpc('ensure_user_profile')

                if (rpcError) {
                    if (rpcError.message.includes('aborted')) {
                        checkInProgress.current = false
                        return
                    }
                    throw new Error(`Self-healing RPC failed: ${rpcError.message}`)
                }

                if (rpcData?.status === 'error') {
                    throw new Error(`Database Error: ${rpcData.message}`)
                }

                // 4. Verification check after RPC
                const { data: verifiedProfile } = await supabase
                    .from('profiles')
                    .select('id, company_id')
                    .eq('id', user.id)
                    .single()

                if (verifiedProfile) {
                    toast.success('Workspace configured successfully!')
                    router.push('/dashboard')
                } else {
                    throw new Error('RPC reported success but profile still not found in database.')
                }

            } catch (err: any) {
                console.error('Onboarding Error:', err)
                // Filter out mundane abort errors from the UI
                if (!err.message?.includes('aborted')) {
                    setErrorDetails(err.message || 'An unknown error occurred')
                    setStatus('error')
                }
            } finally {
                checkInProgress.current = false
            }
        }

        runOnboardingCheck()

        return () => {
            checkInProgress.current = false
        }
    }, [attempts, router, supabase])

    return (
        <div className="min-h-screen bg-[#fdfeff] flex flex-col items-center justify-center p-4 selection:bg-blue-100">
            {/* Background elements */}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute top-[30%] left-[20%] w-[30rem] h-[30rem] bg-blue-50 rounded-full blur-[100px] opacity-60 animate-float" />
                <div className="absolute bottom-[30%] right-[20%] w-[20rem] h-[20rem] bg-indigo-50 rounded-full blur-[80px] opacity-40 animate-float" style={{ animationDelay: '-3s' }} />
            </div>

            <div className="w-full max-w-lg">
                <div className="flex flex-col items-center mb-12">
                    <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-200 mb-6 animate-pulse-soft">
                        <Building2 className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-black tracking-tight leading-none text-slate-900">PropFlow</h1>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-blue-600 opacity-80 mt-1">Intelligence</p>
                    </div>
                </div>

                {status === 'loading' && (
                    <div className="bg-white/70 backdrop-blur-xl border border-slate-200/50 p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
                            <div className="h-full bg-blue-600 animate-[shimmer_2s_infinite]" style={{ width: '40%', backgroundSize: '200% 100%' }} />
                        </div>

                        <div className="flex flex-col items-center">
                            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-6" />
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Configuring your workspace</h2>
                            <p className="text-slate-500 font-medium">
                                We're preparing your elite management dashboard. This takes just a moment.
                            </p>

                            <div className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-blue-600/60 uppercase tracking-widest">
                                <Sparkles className="h-3 w-3" />
                                <span>Self-Healing Protocol Active</span>
                            </div>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-red-100 border border-red-100 relative overflow-hidden">
                        <div className="flex flex-col items-center text-center">
                            <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                                <AlertCircle className="h-8 w-8 text-red-600" />
                            </div>

                            <h2 className="text-2xl font-bold text-slate-900 mb-3">Initialization Failed</h2>
                            <p className="text-slate-500 mb-8 font-medium">
                                We couldn't set up your account. This is usually a temporary database sync issue.
                            </p>

                            <div className="w-full bg-red-50 p-4 rounded-xl mb-8 border border-red-100">
                                <p className="text-[10px] font-mono text-red-800 break-all leading-relaxed">
                                    {errorDetails}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                                <Button
                                    onClick={() => setAttempts(a => a + 1)}
                                    className="px-6 py-6 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl shadow-lg shadow-blue-200"
                                >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Retry
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => router.push('/login')}
                                    className="px-6 py-6 font-bold rounded-xl text-slate-500 hover:text-slate-900"
                                >
                                    Return to Login
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
