import { createServerClient } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiError } from '@/lib/api-response';

export async function POST(request: Request) {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return apiError('Unauthorized', { status: 401 })

    try {
        const body = await request.json();
        const { userId, email, fullName, role, companyName } = body;

        if (!userId || !email) {
            return apiError('Missing required fields', { status: 400, code: 'MISSING_FIELDS' });
        }

        if (user.id !== userId) {
            return apiError('Forbidden', { status: 403 })
        }

        const supabase = createServerClient();

        // Use the Admin RPC to ensure profile and company exist
        // This RPC handles cases where profile exists but company_id is null
        const { data, error } = await supabase.rpc("ensure_user_profile_admin", {
            u_id: userId,
            u_email: email,
            f_name: fullName || "User",
            c_name: companyName || "My Workspace",
            j_title: role || "agent"
        });

        if (error) {
            console.error("[Setup Profile API Error]:", error.message);
            return apiError('Profile setup failed', { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        return apiError('Profile setup failed', { status: 500 });
    }
}
