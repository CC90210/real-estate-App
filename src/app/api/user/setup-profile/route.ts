import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, email, fullName, role, companyName } = body;

        if (!userId || !email) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabase = createServerClient();

        // Use the Admin RPC to ensure profile and company exist
        // This RPC handles cases where profile exists but company_id is null
        const { data, error } = await supabase.rpc("ensure_user_profile_admin", {
            u_id: userId,
            u_email: email,
            f_name: fullName || "User",
            c_name: companyName || "My Workspace",
            j_title: role || "admin"
        });

        if (error) {
            console.error("[Setup Profile API Error]:", error.message);
            return NextResponse.json({ error: 'Profile setup failed' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        return NextResponse.json({ error: 'Profile setup failed' }, { status: 500 });
    }
}
