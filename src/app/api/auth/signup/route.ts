import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 });

// Point 2: Define strict validation schema
const signupSchema = z.object({
    email: z.string().email().max(254),
    password: z.string().min(8).max(100), // Point 4: Password requirements
    full_name: z.string().min(2).max(100),
    role: z.enum(['admin', 'agent', 'landlord']),
    job_title: z.string().max(100).optional().nullable()
});

export async function POST(request: Request) {
    try {
        // Point 3: Rate limiting (IP-based)
        const ip = request.headers.get('x-forwarded-for') || 'anonymous'
        try {
            await limiter.check(10, ip) // 10 signups per minute per IP
        } catch (error) {
            return NextResponse.json(
                { error: 'Too many signup attempts. Please try again later.' },
                { status: 429, headers: { 'Retry-After': '60' } }
            )
        }

        // Point 2: Validate Input
        const body = await request.json();
        const validation = signupSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({
                error: 'Invalid input data',
                details: validation.error.flatten().fieldErrors
            }, { status: 400 });
        }

        const { email, password, full_name, role, job_title } = validation.data;
        const companyName = request.headers.get('x-company-name')?.slice(0, 100) || 'Default Company';

        const supabaseAdmin = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                cookies: {
                    getAll() { return [] },
                    setAll() { }
                }
            }
        );

        // 1. Attempt to create user with auto-confirm
        const signupResult = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                role,
                company_name: companyName,
                job_title: job_title
            }
        });

        let user = signupResult.data.user;
        const signupError = signupResult.error;

        // 2. Handle existing user (Smart Recovery)
        if (signupError) {
            if (signupError.message.includes('already registered') || signupError.status === 422) {
                // User exists, let's find them
                const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                if (listError) throw listError;

                const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
                if (existingUser) {
                    // Update user
                    const { data: { user: updatedUser }, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                        existingUser.id,
                        {
                            password: password,
                            email_confirm: true,
                            user_metadata: {
                                ...existingUser.user_metadata,
                                full_name,
                                role,
                                company_name: companyName,
                                job_title: job_title
                            }
                        }
                    );
                    if (updateError) throw updateError;
                    user = updatedUser;
                } else {
                    throw new Error("User evaluation failed");
                }
            } else {
                throw signupError;
            }
        }

        if (!user) {
            throw new Error("Activation failed");
        }

        // 3. CRITICAL: Initialize Profile via RPC
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('ensure_user_profile_admin', {
            u_id: user.id,
            u_email: email,
            f_name: full_name,
            c_name: companyName,
            j_title: job_title || null
        });

        if (rpcError || rpcData?.status === 'error') {
            console.error("RPC Initialization Error:", rpcError || rpcData?.message);
            throw new Error(`Profile sync failed`);
        }

        return NextResponse.json({
            success: true,
            message: signupError ? "Account updated." : "Account created."
        });

    } catch (error: unknown) {
        // Point 6: Generic Error in production-like responses
        console.error("Signup API Error:", error);
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}
