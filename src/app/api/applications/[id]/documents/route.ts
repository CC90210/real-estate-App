
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-response'

// Allow large document uploads (screening reports can be 40MB+)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Allowed document types — matches the CHECK constraint + passport
const VALID_FILE_TYPES = ['id', 'passport', 'pay_stub', 'bank_statement', 'employment', 'reference', 'screening_report', 'other'] as const

// Allowed MIME types for upload
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MAX_FILE_SIZE = 250 * 1024 * 1024 // 250 MB — enterprise document support

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const supabase = await createClient()
    const applicationId = params.id

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return apiError('Unauthorized', { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile?.company_id) {
        return apiError('Company profile not found', { status: 403 })
    }

    // Verify the application belongs to this company
    const { data: appCheck } = await supabase
        .from('applications')
        .select('id')
        .eq('id', applicationId)
        .eq('company_id', profile.company_id)
        .maybeSingle()

    if (!appCheck) {
        return apiError('Application not found', { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const fileType = (formData.get('fileType') as string) || 'other'

    if (!file) {
        return apiError('No file provided', { status: 400, code: 'MISSING_FILE' })
    }

    if (file.size > MAX_FILE_SIZE) {
        return apiError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 250MB.`, {
            status: 413,
            code: 'FILE_TOO_LARGE',
        })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return apiError('File type not supported. Upload PDF, images (JPG/PNG/WebP/HEIC), or Word documents.', {
            status: 400,
            code: 'UNSUPPORTED_FILE_TYPE',
        })
    }

    // Normalize file type — map 'passport' to 'id' for DB constraint, keep original as metadata
    const dbFileType = fileType === 'passport' ? 'id' : (VALID_FILE_TYPES.includes(fileType as typeof VALID_FILE_TYPES[number]) ? fileType : 'other')

    // Upload to Supabase Storage — use arrayBuffer for reliable upload
    const fileBuffer = await file.arrayBuffer()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${profile.company_id}/${applicationId}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
        .from('application-documents')
        .upload(storagePath, fileBuffer, {
            contentType: file.type,
            upsert: false,
        })

    if (uploadError) {
        console.error('Upload error:', uploadError.message)
        return apiError('File upload failed', { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('application-documents')
        .getPublicUrl(storagePath)

    // Save to database
    const { data: doc, error: dbError } = await supabase
        .from('application_documents')
        .insert({
            application_id: applicationId,
            company_id: profile.company_id,
            file_name: file.name,
            file_type: dbFileType,
            document_label: fileType, // Store the original label (e.g., 'passport') for display
            file_url: urlData.publicUrl,
            file_size: file.size,
            mime_type: file.type,
            storage_path: storagePath,
            uploaded_by: user.id,
        })
        .select()
        .single()

    if (dbError) {
        console.error('DB error:', dbError.message)
        return apiError('Failed to save document record', { status: 500 })
    }

    return NextResponse.json(doc)
}

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return apiError('Unauthorized', { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile?.company_id) {
        return apiError('Company profile not found', { status: 403 })
    }

    const { data, error } = await supabase
        .from('application_documents')
        .select('*')
        .eq('application_id', params.id)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

    if (error) {
        return apiError('Failed to fetch documents', { status: 500 })
    }

    return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return apiError('Unauthorized', { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile?.company_id) {
        return apiError('Company profile not found', { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
        return apiError('documentId query parameter required', { status: 400, code: 'MISSING_DOCUMENT_ID' })
    }

    // Fetch the document to get storage path for cleanup
    const { data: doc } = await supabase
        .from('application_documents')
        .select('*')
        .eq('id', documentId)
        .eq('company_id', profile.company_id)
        .maybeSingle()

    if (!doc) {
        return apiError('Document not found', { status: 404 })
    }

    // Delete from storage if we have the path
    if (doc.storage_path) {
        await supabase.storage
            .from('application-documents')
            .remove([doc.storage_path])
    }

    // Delete from database (scoped to application AND company)
    const { error: deleteError } = await supabase
        .from('application_documents')
        .delete()
        .eq('id', documentId)
        .eq('application_id', params.id)
        .eq('company_id', profile.company_id)

    if (deleteError) {
        return apiError('Failed to delete document', { status: 500 })
    }

    return NextResponse.json({ success: true })
}
