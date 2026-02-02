import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDocumentSchema } from '@/lib/schemas/document-schema';

// GET /api/documents - List documents
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's company_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();

        if (!profile?.company_id) {
            return NextResponse.json({ error: 'No company associated' }, { status: 403 });
        }

        // Parse query params
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const limit = searchParams.get('limit');
        const propertyId = searchParams.get('property_id');
        const applicationId = searchParams.get('application_id');

        let query = supabase
            .from('documents')
            .select(`
                *,
                properties (id, address),
                applications (id, applicant_name),
                creator:profiles!created_by (id, full_name)
            `)
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false });

        if (type) query = query.eq('type', type);
        if (propertyId) query = query.eq('property_id', propertyId);
        if (applicationId) query = query.eq('application_id', applicationId);
        if (limit) query = query.limit(parseInt(limit));

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ success: true, documents: data });
    } catch (error: any) {
        console.error('Documents GET Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch documents', details: error.message },
            { status: 500 }
        );
    }
}

// POST /api/documents - Create document
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's company_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();

        if (!profile?.company_id) {
            return NextResponse.json({ error: 'No company associated' }, { status: 403 });
        }

        const body = await req.json();

        // Validate input
        const validationResult = createDocumentSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: validationResult.error.issues },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('documents')
            .insert({
                ...validationResult.data,
                company_id: profile.company_id,
                created_by: user.id,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, document: data }, { status: 201 });
    } catch (error: any) {
        console.error('Documents POST Error:', error);
        return NextResponse.json(
            { error: 'Failed to create document', details: error.message },
            { status: 500 }
        );
    }
}
