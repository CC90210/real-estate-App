import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 });

export async function POST(request: Request) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') || 'anonymous'
        try {
            await limiter.check(5, ip) // 5 signups per minute per IP
        } catch (error) {
            return NextResponse.json(
                { error: 'Too many signup attempts. Please try again later.' },
                { status: 429 }
            )
        }

        const { email, password, full_name, role, job_title } = await request.json();
        const companyName = request.headers.get('x-company-name') || 'Default Company';

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
        let { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
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

        // 2. Handle existing user (Smart Recovery)
        if (createError) {
            if (createError.message.includes('already registered') || createError.status === 422) {
                // User exists, let's find them
                const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
                if (listError) throw listError;


                const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
                if (existingUser) {
                    // Update the existing user to match the new password and metadata
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
                    throw new Error("User exists but could not be located.");
                }
            } else {
                throw createError;
            }
        }

        if (!user) {
            throw new Error("Failed to create or recover user account.");
        }

        // 3. CRITICAL: Initialize Profile & Company via RPC (Admin Level)
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('ensure_user_profile_admin', {
            u_id: user.id,
            u_email: email,
            f_name: full_name,
            c_name: companyName,
            j_title: job_title || null
        });

        if (rpcError) {
            console.error("RPC Initialization Error:", rpcError);
            throw new Error(`Profile initialization failed: ${rpcError.message}`);
        }

        if (rpcData?.status === 'error') {
            throw new Error(rpcData.message || "Failed to initialize profile");
        }

        return NextResponse.json({
            success: true,
            user,
            message: createError ? "Account updated and ready." : "Account created."
        });

    } catch (error: any) {
        console.error("Signup API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
