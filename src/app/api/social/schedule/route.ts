import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const Late = (await import('@getlatedev/node')).default;
        const apiKey = process.env.LATE_API_KEY;
        if (!apiKey) return NextResponse.json({ error: 'Social media integration not configured' }, { status: 503 });
        const late = new Late({ apiKey });

        const supabase = await createClient();

        // Ensure user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { content, mediaUrl, scheduledFor, platformAccountIds } = body;

        if (!content || !scheduledFor || !platformAccountIds || platformAccountIds.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Fetch user's Late profile ID
        const { data: profileData, error: profileError } = await supabase
            .from('agent_social_profiles')
            .select('late_profile_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error('Supabase fetch error for agent profile:', profileError);
        }

        if (!profileData) {
            return NextResponse.json({ error: 'Social profile not found. Please connect an account first.' }, { status: 404 });
        }

        // 2. Format payload depending on mediaUrl presence
        const postPayload: any = {
            content: content,
            scheduledFor: scheduledFor, // ISO-8601 string, e.g., '2025-05-16T12:00:00'
            timezone: 'America/New_York', // Consider fetching agent timezone dynamically if available
            platforms: platformAccountIds.map((id: string) => ({
                accountId: id
            }))
        };

        if (mediaUrl) {
            postPayload.mediaUrls = [mediaUrl];
        }

        // 3. Dispatch to Late to schedule the post across connected platforms
        const { post } = await late.posts.createPost(postPayload);

        return NextResponse.json({ success: true, postId: post._id });

    } catch (error) {
        console.error('Social Schedule API Error:', error);
        return NextResponse.json({ error: 'Failed to schedule post via Late API' }, { status: 500 });
    }
}
