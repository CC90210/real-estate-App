import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Late from '@getlatedev/node';

// Initialize Late client
// It automatically picks up LATE_API_KEY from process.env
const late = new Late();

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Ensure user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { platform } = await request.json();

        if (!platform) {
            return NextResponse.json({ error: 'Platform parameter is required' }, { status: 400 });
        }

        // 1. Check if the agent already has a Late profile in Supabase
        const { data: profileData, error: profileError } = await supabase
            .from('agent_social_profiles')
            .select('late_profile_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error('Supabase fetch error:', profileError);
        }

        let lateProfileId;

        // 2. If they don't have one, create it on the fly
        if (!profileData) {
            console.log("Creating new Late Profile for Agent:", user.id);
            const { profile } = await late.profiles.createProfile({
                name: `PropFlow Agent: ${user.id}`,
                description: 'Real Estate Social Accounts'
            });
            lateProfileId = profile._id;

            // Save it to Supabase
            const { error: insertError } = await supabase.from('agent_social_profiles').insert({
                user_id: user.id,
                late_profile_id: lateProfileId
            });

            if (insertError) {
                console.error('Failed to insert agent profile:', insertError);
                return NextResponse.json({ error: 'Failed to securely link profile in database.' }, { status: 500 });
            }
        } else {
            lateProfileId = profileData.late_profile_id;
        }

        // 3. Get the OAuth link from Late for the specific platform
        const { authUrl } = await late.connect.getConnectUrl({
            platform: platform,
            profileId: lateProfileId
        });

        return NextResponse.json({ authUrl });

    } catch (error) {
        console.error('Social Connect API Error:', error);
        return NextResponse.json({ error: 'Failed to generate secure connection URL' }, { status: 500 });
    }
}
