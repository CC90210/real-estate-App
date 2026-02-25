'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [authorized, setAuthorized] = useState(false)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function checkAccess() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.replace('/login')
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'super_admin') {
                router.replace('/dashboard')
                return
            }

            setAuthorized(true)
            setLoading(false)
        }
        checkAccess()
    }, [router, supabase])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        )
    }

    if (!authorized) return null

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Admin header bar */}
            <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between shadow-md z-10 relative">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-mono bg-red-600 px-2 py-0.5 rounded text-xs font-bold tracking-widest">SUPER ADMIN</span>
                    <span className="font-semibold tracking-tight text-lg">PropFlow Platform Admin</span>
                </div>
                <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors duration-200">
                    &larr; Exit to Dashboard
                </Link>
            </header>

            {/* Admin sidebar + content */}
            <div className="flex flex-1 overflow-hidden">
                <aside className="w-64 bg-gray-900 p-4 space-y-2 border-t border-gray-800 shrink-0">
                    <AdminNavLink href="/admin" label="Overview" current={pathname === '/admin'} />
                    <AdminNavLink href="/admin/companies" label="Companies" current={pathname === '/admin/companies'} />
                    <AdminNavLink href="/admin/users" label="Users" current={pathname === '/admin/users'} />
                    <AdminNavLink href="/admin/invites" label="Enterprise Invites" current={pathname === '/admin/invites'} />
                </aside>
                <main className="flex-1 p-8 overflow-y-auto w-full">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}

function AdminNavLink({ href, label, current }: { href: string; label: string; current: boolean }) {
    return (
        <Link
            href={href}
            className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${current ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
        >
            {label}
        </Link>
    )
}
