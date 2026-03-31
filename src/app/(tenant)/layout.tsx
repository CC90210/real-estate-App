'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { TenantSidebar } from '@/components/TenantSidebar'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function TenantLayout({ children }: { children: React.ReactNode }) {
    const supabase = createClient()
    const router = useRouter()

    const { data: userData, isLoading } = useQuery({
        queryKey: ['tenant-data'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            return profile
        }
    })

    useEffect(() => {
        if (!isLoading && userData === null) {
            router.push('/login')
        }
    }, [isLoading, userData, router])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
        )
    }

    if (userData === null) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                    <p className="text-sm text-slate-500">Redirecting...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#fcfdfe]">
            <TenantSidebar />
            <main className="min-h-screen lg:ml-64 transition-all duration-300">
                {children}
            </main>
        </div>
    )
}
