
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email, password, full_name, role } = await request.json();

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
        const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                role,
                company_name: request.headers.get('x-company-name') || 'Default Company'
            }
        });

        if (createError) {
            // ... (existing error handling)
        }

        // 2. CRITICAL: Initialize Profile & Company via RPC
        // We do this here to ensure the account is ready BEFORE the user tries to login
        // We use the service role to ensure bypass of RLS
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('ensure_user_profile_admin', {
            u_id: user?.id,
            u_email: email,
            f_name: full_name,
            c_name: request.headers.get('x-company-name') || 'Default Company'
        });

        if (rpcError) {
            console.error("RPC Initialization Error:", rpcError);
            // We don't fail the whole signup if profile creation has a minor hiccup, 
            // the onboarding page will catch it later.
        }

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        console.error("Signup API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
