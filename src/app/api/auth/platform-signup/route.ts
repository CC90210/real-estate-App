import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-response'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 })

export async function POST(req: Request) {
    try {
        // Rate limit by IP to prevent brute-force token guessing
        const ip = req.headers.get('x-forwarded-for') || 'anonymous'
        try {
            await limiter.check(5, ip)
        } catch {
            return apiError('Too many attempts. Please try again later.', { status: 429 })
        }

        const { token, email, password, fullName, companyName } = await req.json()

        if (!token || !email || !password || !fullName || !companyName) {
            return apiError('All fields are required', { status: 400, code: 'MISSING_FIELDS' })
        }

        // Input validation
        if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return apiError('Invalid email address', { status: 400, code: 'INVALID_EMAIL' })
        }
        if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
            return apiError('Password must be 8-128 characters', { status: 400, code: 'INVALID_PASSWORD' })
        }
        if (typeof fullName !== 'string' || fullName.length > 200 || fullName.trim().length < 1) {
            return apiError('Invalid name', { status: 400, code: 'INVALID_NAME' })
        }
        if (typeof companyName !== 'string' || companyName.length > 200 || companyName.trim().length < 1) {
            return apiError('Invalid company name', { status: 400, code: 'INVALID_COMPANY_NAME' })
        }
        if (typeof token !== 'string' || token.length > 100) {
            return apiError('Invalid token', { status: 400, code: 'INVALID_TOKEN' })
        }

        // 1. Validate the invitation
        const { data: invite, error: inviteError } = await supabaseAdmin
            .from('platform_invitations')
            .select('*')
            .eq('token', token)
            .maybeSingle()

        if (inviteError || !invite) {
            return apiError('Invalid invitation link', { status: 400, code: 'INVALID_INVITATION' })
        }

        if (invite.status !== 'active') {
            return apiError('This invitation has already been used or revoked', { status: 400 })
        }

        if (new Date(invite.expires_at) < new Date()) {
            return apiError('This invitation has expired', { status: 400 })
        }

        if (invite.use_count >= invite.max_uses) {
            return apiError('This invitation has reached its maximum uses', { status: 400 })
        }

        // 2. Create the auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        })

        if (authError) {
            if (authError.message.includes('already registered')) {
                return apiError('An account with this email already exists. Please login instead.', { status: 400 })
            }
            throw authError
        }

        const userId = authData.user.id

        // 3. Create the company
        const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

        const companyData: any = {
            name: companyName,
            slug: slug + '-' + Date.now().toString(36),
            email: email,
            subscription_status: invite.is_enterprise ? 'active' : 'none',
            subscription_plan: invite.is_enterprise ? 'enterprise' : invite.assigned_plan,
        }

        if (invite.is_enterprise) {
            companyData.plan_override = 'enterprise'
            companyData.plan_override_reason = `Enterprise invite: ${invite.label}`
            companyData.plan_override_by = invite.created_by
            companyData.plan_override_at = new Date().toISOString()
        } else if (invite.assigned_plan !== 'none') {
            companyData.plan_override = invite.assigned_plan
            companyData.plan_override_reason = `Platform invite: ${invite.label}`
            companyData.plan_override_by = invite.created_by
            companyData.plan_override_at = new Date().toISOString()
        }

        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .insert(companyData)
            .select()
            .single()

        if (companyError) throw companyError

        // 4. Create the profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: userId,
                company_id: company.id,
                email: email,
                full_name: fullName,
                role: 'admin',
                is_active: true,
            })

        if (profileError) throw profileError

        // 5. Mark the invitation as used
        const updateData: any = {
            use_count: invite.use_count + 1,
            used_by: userId,
            used_at: new Date().toISOString(),
            company_created_id: company.id,
            updated_at: new Date().toISOString(),
        }

        if (invite.max_uses === 1) {
            updateData.status = 'used'
        }

        await supabaseAdmin
            .from('platform_invitations')
            .update(updateData)
            .eq('id', invite.id)

        return NextResponse.json({
            success: true,
            companyId: company.id,
            userId: userId,
            plan: invite.is_enterprise ? 'enterprise' : invite.assigned_plan,
        })
    } catch (error) {
        console.error('Platform signup error:', error)
        return apiError('Signup failed', { status: 500 })
    }
}
