'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, CheckCircle, Shield, User, Building2 } from 'lucide-react'

export default function JoinPage({ params }: { params: { token: string } }) {
    const router = useRouter()
    const supabase = createClient()
    const [invitation, setInvitation] = useState<any>(null)
    const [company, setCompany] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: ''
    })
    const [submitting, setSubmitting] = useState(false)

    // Fetch invitation details
    useEffect(() => {
        async function fetchInvitation() {
            try {
                // Use service role or RPC to fetch by token
                const { data, error } = await supabase
                    .rpc('get_invitation_by_token', { p_token: params.token })

                if (error) throw error
                if (!data || data.length === 0) {
                    setError('Invalid or expired invitation link')
                    return
                }

                const inv = data[0]

                if (inv.status !== 'pending') {
                    setError('This invitation has already been used or expired')
                    return
                }

                if (new Date(inv.expires_at) < new Date()) {
                    setError('This invitation has expired')
                    return
                }

                setInvitation(inv)

                // Fetch company details
                // This might fail if RLS prevents reading companies without auth.
                // However, we usually allow reading company name/logo publicly or minimal RLS.
                // If it fails, we handle gracefully.
                const { data: companyData, error: companyError } = await supabase
                    .from('companies')
                    .select('name, logo_url')
                    .eq('id', inv.company_id)
                    .single()

                if (companyError && companyError.code !== 'PGRST116') {
                    // ignore if not found or RLS error, just don't show company name
                    console.warn('Could not fetch company details:', companyError)
                }
                setCompany(companyData)

                // Pre-fill email if provided
                if (inv.email) {
                    setFormData(prev => ({ ...prev, email: inv.email }))
                }

            } catch (err: any) {
                setError(err.message || 'Failed to load invitation')
            } finally {
                setLoading(false)
            }
        }

        fetchInvitation()
    }, [params.token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            // 1. Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName
                    }
                }
            })

            if (authError) throw authError

            // Determine if we need to manually insert profile or if trigger does it.
            // Earlier steps mentioned a trigger for profile creation.
            // If trigger uses metadata, we are good.
            // However, the prompt's code block manually inserts profile.
            // manual insert might fail if trigger already did it.
            // Safest: try to update profile, if user exists. Upsert.

            const userId = authData.user?.id
            if (!userId) throw new Error("No user ID returned from signup")

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    email: formData.email,
                    full_name: formData.fullName,
                    role: invitation.role,
                    company_id: invitation.company_id
                })

            if (profileError) {
                console.error("Profile creation error", profileError)
                // If trigger created it, maybe we just need update?
                // But upsert handles both.
                throw profileError
            }

            // 3. Mark invitation as accepted
            await supabase
                .from('team_invitations')
                .update({
                    status: 'accepted',
                    accepted_at: new Date().toISOString(),
                    accepted_by: userId
                })
                .eq('id', invitation.id)

            // 4. Log activity
            // This requires RLS allowing insert. Activity log usually RLS is user based.
            await supabase.from('activity_log').insert({
                company_id: invitation.company_id,
                user_id: userId,
                action: 'joined',
                entity_type: 'team',
                metadata: { role: invitation.role }
            })

            toast.success('Account created successfully!')
            router.push('/dashboard')

        } catch (err: any) {
            toast.error('Failed to create account', { description: err.message })
        } finally {
            setSubmitting(false)
        }
    }

    const roleConfig = {
        admin: { icon: Shield, color: 'text-red-600', bg: 'bg-red-100', label: 'Administrator' },
        agent: { icon: User, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Agent' },
        landlord: { icon: Building2, color: 'text-green-600', bg: 'bg-green-100', label: 'Landlord' }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
                        <p className="text-gray-500 mb-4">{error}</p>
                        <Button onClick={() => router.push('/login')}>
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Default to Agent if role is unknown, though it should be known
    const roleKey = invitation.role as keyof typeof roleConfig;
    const role = roleConfig[roleKey] || roleConfig.agent
    const RoleIcon = role.icon

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    {company?.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="h-12 mx-auto mb-4" />
                    ) : (
                        <div className="h-12 w-12 bg-blue-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
                            <span className="text-white text-xl font-bold">{company?.name?.[0] || 'P'}</span>
                        </div>
                    )}
                    <CardTitle>Join {company?.name || 'the team'}</CardTitle>
                    <CardDescription>
                        You've been invited to join as a team member
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {/* Role Badge */}
                    <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${role.bg} mb-6`}>
                        <RoleIcon className={`h-5 w-5 ${role.color}`} />
                        <span className={`font-medium ${role.color}`}>
                            Joining as {role.label}
                        </span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label>Full Name</Label>
                            <Input
                                required
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <Label>Email</Label>
                            <Input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john@example.com"
                                disabled={!!invitation.email}
                            />
                        </div>

                        <div>
                            <Label>Password</Label>
                            <Input
                                type="password"
                                required
                                minLength={8}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="Min. 8 characters"
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                'Create Account & Join'
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-4">
                        Already have an account?{' '}
                        <a href="/login" className="text-blue-600 hover:underline">
                            Sign in
                        </a>
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
