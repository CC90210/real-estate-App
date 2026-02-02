import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/documents/[id] - Get single document
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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

        const { data, error } = await supabase
            .from('documents')
            .select(`
                *,
                properties (id, address, rent, bedrooms, bathrooms),
                applications (id, applicant_name, applicant_email, status),
                creator:profiles!created_by (id, full_name, email)
            `)
            .eq('id', id)
            .eq('company_id', profile.company_id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Document not found' }, { status: 404 });
            }
            throw error;
        }

        return NextResponse.json({ success: true, document: data });
    } catch (error: any) {
        console.error('Document GET Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch document', details: error.message },
            { status: 500 }
        );
    }
}

// DELETE /api/documents/[id] - Delete document
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
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

        // Verify ownership before delete
        const { data: existingDoc } = await supabase
            .from('documents')
            .select('id, created_by')
            .eq('id', id)
            .eq('company_id', profile.company_id)
            .single();

        if (!existingDoc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Only creator can delete
        if (existingDoc.created_by !== user.id) {
            return NextResponse.json(
                { error: 'You can only delete documents you created' },
                { status: 403 }
            );
        }

        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Document deleted' });
    } catch (error: any) {
        console.error('Document DELETE Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete document', details: error.message },
            { status: 500 }
        );
    }
}
