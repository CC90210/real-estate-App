
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email, password, full_name, role } = await request.json();

        // Create a Supabase client with the SERVICE ROLE key to have admin privileges
        // This allows us to create users with email_confirm: true (bypassing email verification)
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

        // 1. Create the user directly
        const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // AUTO CONFIRM
            user_metadata: {
                full_name,
                role
            }
        });

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 400 });
        }

        if (!user) {
            return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
        }

        // 2. The SQL Trigger (from supabase_setup.sql) should create the profile automatically based on metadata.
        // But for absolute safety in this "production grade" fix, we double check or upsert.
        // Since we are admin, we can insert directly into profiles if needed, but RLS might block if not careful.
        // Actually, trigger listens to auth.users insert. createUser triggers that.
        // So profile should exist.

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
