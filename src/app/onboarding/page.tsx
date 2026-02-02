'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function OnboardingPage() {
    const router = useRouter()
    const supabase = createClient()
    const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
    const [errorDetails, setErrorDetails] = useState<string | null>(null)
    const [attempts, setAttempts] = useState(0)

    useEffect(() => {
        const runOnboardingCheck = async () => {
            try {
                // 1. Get current user
                const { data: { user }, error: userError } = await supabase.auth.getUser()

                if (userError || !user) {
                    router.push('/login')
                    return
                }

                // 2. Check if profile exists
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, company_id')
                    .eq('id', user.id)
                    .maybeSingle()

                if (profile && profile.company_id) {
                    // All good! redirect to dashboard
                    setStatus('success')
                    router.push('/dashboard')
                    return
                }

                // 3. If no profile, try to run "ensure_user_profile" RPC
                console.log('Profile missing, running self-healing RPC...')
                const { data: rpcData, error: rpcError } = await supabase.rpc('ensure_user_profile')

                if (rpcError) {
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
                    toast.success('Profile initialized successfully!')
                    router.push('/dashboard')
                } else {
                    throw new Error('RPC reported success but profile still not found in database.')
                }

            } catch (err: any) {
                console.error('Onboarding Error:', err)
                setErrorDetails(err.message || 'An unknown error occurred')
                setStatus('error')
            }
        }

        runOnboardingCheck()
    }, [attempts, router, supabase])

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                <h1 className="text-xl font-semibold text-gray-900">Configuring your workspace...</h1>
                <p className="text-gray-500 mt-2 text-center max-w-sm">
                    We're setting up your profile and dashboard. This usually takes just a few seconds.
                </p>
            </div>
        )
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-red-100 max-w-lg w-full">
                    <div className="flex items-center gap-3 text-red-600 mb-4">
                        <AlertCircle className="h-6 w-6" />
                        <h1 className="text-xl font-bold">Initialization Failed</h1>
                    </div>

                    <p className="text-gray-700 mb-6">
                        We encountered a problem setting up your account. This is often due to missing database permissions or schema cache issues.
                    </p>

                    <div className="bg-red-50 p-4 rounded-lg mb-6">
                        <p className="text-xs font-mono text-red-800 break-all">
                            ERROR_CODE: {errorDetails}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={() => setAttempts(a => a + 1)}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry Initialization
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/login')}
                            className="w-full"
                        >
                            Return to Login
                        </Button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-400 italic">
                            Tip: If retrying doesn't work, please screenshot this screen and share it with support.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return null
}
