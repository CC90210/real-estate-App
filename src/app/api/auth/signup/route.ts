
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

        // 1. Attempt to create user
        const { data: { user }, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name, role }
        });

        if (createError) {
            // Check if user already exists
            if (createError.message.includes('already registered') || createError.status === 422) {
                console.log("User likely exists, attempting to find and force-confirm...");

                const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
                    perPage: 1000
                });

                if (listError) throw listError;

                const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

                if (existingUser) {
                    // Prepare updates. Only update metadata if provided (preserve existing name if logging in)
                    const updates: any = {
                        email_confirm: true,
                        password: password // Always update password to match current attempt
                    };

                    if (full_name || role) {
                        updates.user_metadata = {
                            ...existingUser.user_metadata,
                            ...(full_name && { full_name }),
                            ...(role && { role })
                        };
                    }

                    // 3. Force update to confirm email & update password/meta
                    const { data: { user: updatedUser }, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                        existingUser.id,
                        updates
                    );

                    if (updateError) throw updateError;

                    // Also ensure profile exists
                    await supabaseAdmin.from('profiles').upsert({
                        id: existingUser.id,
                        email,
                        ...(full_name && { full_name }),
                        ...(role && { role })
                    }, { onConflict: 'id' });

                    return NextResponse.json({ success: true, user: updatedUser, message: "Account recovered and confirmed." });
                }
            }
            return NextResponse.json({ error: createError.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        console.error("Signup API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
