
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const supabase = await createClient()
    const applicationId = params.id

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has access (RLS will check db, but we need company_id for insert)
    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

    const formData = await req.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('fileType') as string || 'other'

    if (!file) {
        return NextResponse.json({ error: 'No file' }, { status: 400 })
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${applicationId}/${Date.now()}-${file.name}`

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('application-documents')
        .upload(fileName, file)

    if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('application-documents')
        .getPublicUrl(fileName)

    // Save to database
    // We must ensure the 'application_documents' table has 'company_id' column from my SQL migration.
    // My previous SQL migration added company_id.
    const { data: doc, error: dbError } = await supabase
        .from('application_documents')
        .insert({
            application_id: applicationId,
            company_id: profile?.company_id,
            file_name: file.name,
            file_type: fileType,
            file_url: urlData.publicUrl,
            file_size: file.size,
            uploaded_by: user.id
        })
        .select()
        .single()

    if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json(doc)
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('application_documents')
        .select('*')
        .eq('application_id', params.id)
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
}
