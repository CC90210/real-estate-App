import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { apiError } from '@/lib/api-response';

const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500, prefix: 'api:social-schedule' });

export async function POST(request: Request) {
    try {
        const Late = (await import('@getlatedev/node')).default;
        const apiKey = process.env.LATE_API_KEY;
        if (!apiKey) return apiError('Social media integration not configured', { status: 503, code: 'SOCIAL_NOT_CONFIGURED' });
        const late = new Late({ apiKey });

        const supabase = await createClient();

        // Ensure user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return apiError('Unauthorized', { status: 401 });
        }

        try {
            await limiter.check(10, user.id);
        } catch {
            return apiError('Too many requests', { status: 429 });
        }

        const body = await request.json();
        const { content, mediaUrl, scheduledFor, platformAccountIds } = body;

        if (!content || !scheduledFor || !platformAccountIds || platformAccountIds.length === 0) {
            return apiError('Missing required fields', { status: 400, code: 'MISSING_FIELDS' });
        }

        // 1. Get user's company and verify account ownership
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle();

        if (!profile?.company_id) {
            return apiError('No company found', { status: 403 });
        }

        // Verify all platformAccountIds (Supabase UUIDs) belong to this company
        // and translate them to Late account IDs for the API call
        const { data: validAccounts } = await supabase
            .from('social_accounts')
            .select('id, late_account_id')
            .eq('company_id', profile.company_id)
            .in('id', platformAccountIds);

        if (!validAccounts?.length) {
            return apiError('One or more social accounts do not belong to your company', { status: 403 });
        }

        // 2. Format payload depending on mediaUrl presence
        const postPayload: any = {
            content: content,
            scheduledFor: scheduledFor, // ISO-8601 string, e.g., '2025-05-16T12:00:00'
            timezone: 'America/New_York', // Consider fetching agent timezone dynamically if available
            platforms: validAccounts.map((acc: any) => ({
                accountId: acc.late_account_id
            }))
        };

        if (mediaUrl) {
            postPayload.mediaItems = [{ url: mediaUrl }];
        }

        // 3. Dispatch to Late to schedule the post across connected platforms
        const result = await late.posts.createPost({ body: postPayload });
        const post = result?.data?.post || (result as any)?.post;
        const postId = post?._id || post?.id || null;

        return NextResponse.json({ success: true, postId });

    } catch (error) {
        console.error('Social Schedule API Error:', error);
        return apiError('Failed to schedule post via Late API', { status: 500 });
    }
}
