
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_EXTRACTION_PROMPT = `You are analyzing a tenant screening report (likely from SingleKey or similar service). Extract the following information as JSON:
{
  "credit_score": number or null,
  "annual_income": number or null,
  "monthly_income": number or null,
  "criminal_record_clear": boolean or null,
  "public_records_clear": boolean or null,
  "bankruptcies": number,
  "collections": number,
  "legal_cases": number,
  "debt_total": number or null,
  "employment_status": string or null,
  "employer_name": string or null,
  "rental_income_ratio_pct": number or null,
  "id_verification_passed": boolean or null,
  "is_smoker": boolean or null,
  "num_vehicles": number or null,
  "summary": "2-3 sentence summary of the applicant's financial health and risk level",
  "risk_flags": ["array of specific concerns found in the report"]
}
Return ONLY valid JSON, no markdown.`

interface GeminiExtraction {
    credit_score: number | null
    annual_income: number | null
    monthly_income: number | null
    criminal_record_clear: boolean | null
    public_records_clear: boolean | null
    bankruptcies: number
    collections: number
    legal_cases: number
    debt_total: number | null
    employment_status: string | null
    employer_name: string | null
    rental_income_ratio_pct: number | null
    id_verification_passed: boolean | null
    is_smoker: boolean | null
    num_vehicles: number | null
    summary: string
    risk_flags: string[]
}

// Transform a database row into the shape the frontend component expects
function transformReport(row: Record<string, unknown>) {
    return {
        id: row.id,
        file_name: row.file_name,
        file_url: row.file_url,
        file_size: row.file_size,
        status: row.processing_status || 'pending',
        created_at: row.created_at,
        metrics: row.processing_status === 'completed' ? {
            credit_score: row.extracted_credit_score ?? null,
            criminal_clear: row.extracted_criminal_clear ?? null,
            public_records_clear: row.extracted_public_records_clear ?? null,
            annual_income: row.extracted_income ?? null,
            total_debt: (row.raw_extracted_data as Record<string, unknown>)?.debt_total ?? null,
            bankruptcies: row.extracted_bankruptcies ?? 0,
            collections: row.extracted_collections ?? 0,
            legal_cases: row.extracted_legal_cases ?? 0,
            risk_flags: row.extracted_risk_flags ?? [],
            ai_summary: row.extracted_summary ?? null,
        } : null,
        error_message: row.processing_status === 'failed' ? 'AI extraction failed — report uploaded successfully' : null,
    }
}

async function parseScreeningReportWithGemini(
    fileBuffer: ArrayBuffer,
    mimeType: string
): Promise<GeminiExtraction | null> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set')
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const base64Data = Buffer.from(fileBuffer).toString('base64')

    const result = await model.generateContent([
        {
            inlineData: {
                mimeType,
                data: base64Data,
            },
        },
        GEMINI_EXTRACTION_PROMPT,
    ])

    const responseText = result.response.text().trim()

    // Strip markdown code fences if Gemini wrapped the response despite instructions
    const cleaned = responseText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

    return JSON.parse(cleaned) as GeminiExtraction
}

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    const applicationId = params.id

    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

    if (!profile?.company_id) {
        return NextResponse.json({ error: 'Company profile not found' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 })
    }

    // Upload PDF to Supabase Storage
    const storagePath = `${profile.company_id}/${applicationId}/${Date.now()}-${file.name}`
    const fileBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
        .from('application-screening-reports')
        .upload(storagePath, fileBuffer, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
        return NextResponse.json({ error: 'File upload failed: ' + uploadError.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
        .from('application-screening-reports')
        .getPublicUrl(storagePath)

    // Insert a pending record immediately so we have an ID to update
    const { data: reportRecord, error: insertError } = await supabase
        .from('application_screening_reports')
        .insert({
            application_id: applicationId,
            company_id: profile.company_id,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_size: file.size,
            uploaded_by: user.id,
            processing_status: 'pending',
        })
        .select()
        .single()

    if (insertError || !reportRecord) {
        return NextResponse.json({ error: 'Failed to create screening report record' }, { status: 500 })
    }

    // Attempt AI extraction — failure must not block the response, only change status
    let extraction: GeminiExtraction | null = null
    let processingStatus: 'completed' | 'failed' = 'failed'

    try {
        extraction = await parseScreeningReportWithGemini(fileBuffer, 'application/pdf')
        processingStatus = 'completed'
    } catch {
        // Intentional: AI parse failure is non-fatal. Record is saved with status 'failed'.
    }

    // Build the update payload using CORRECT database column names (extracted_* prefix)
    const reportUpdate: Record<string, unknown> = {
        processing_status: processingStatus,
        processed_at: new Date().toISOString(),
    }

    if (extraction) {
        reportUpdate.extracted_credit_score = extraction.credit_score
        reportUpdate.extracted_income = extraction.annual_income ?? (extraction.monthly_income ? extraction.monthly_income * 12 : null)
        reportUpdate.extracted_criminal_clear = extraction.criminal_record_clear
        reportUpdate.extracted_public_records_clear = extraction.public_records_clear
        reportUpdate.extracted_bankruptcies = extraction.bankruptcies ?? 0
        reportUpdate.extracted_collections = extraction.collections ?? 0
        reportUpdate.extracted_legal_cases = extraction.legal_cases ?? 0
        reportUpdate.extracted_summary = extraction.summary
        reportUpdate.extracted_risk_flags = extraction.risk_flags
        reportUpdate.raw_extracted_data = extraction // Store the full extraction for reference
    }

    const { data: updatedReport, error: updateError } = await supabase
        .from('application_screening_reports')
        .update(reportUpdate)
        .eq('id', reportRecord.id)
        .select()
        .single()

    if (updateError) {
        // Return the original pending record transformed so the caller still gets a usable response
        return NextResponse.json(transformReport(reportRecord))
    }

    // Propagate key metrics back to the parent application record if extraction succeeded
    if (extraction) {
        const applicationUpdate: Record<string, unknown> = {}

        if (extraction.credit_score !== null) {
            applicationUpdate.credit_score = extraction.credit_score
        }
        if (extraction.criminal_record_clear !== null) {
            applicationUpdate.criminal_check_passed = extraction.criminal_record_clear
        }
        if (extraction.public_records_clear !== null) {
            applicationUpdate.public_records_clear = extraction.public_records_clear
        }
        if (extraction.monthly_income !== null) {
            applicationUpdate.monthly_income = extraction.monthly_income
        } else if (extraction.annual_income !== null) {
            applicationUpdate.monthly_income = Math.round(extraction.annual_income / 12)
        }
        if (extraction.debt_total !== null) {
            applicationUpdate.total_debt = extraction.debt_total
        }
        if (extraction.is_smoker !== null) {
            applicationUpdate.is_smoker = extraction.is_smoker
        }
        if (extraction.num_vehicles !== null) {
            applicationUpdate.num_vehicles = extraction.num_vehicles
        }
        if (extraction.id_verification_passed !== null) {
            applicationUpdate.government_id_verified = extraction.id_verification_passed
        }
        if (extraction.employment_status !== null) {
            applicationUpdate.employment_status = extraction.employment_status
        }
        if (extraction.employer_name !== null) {
            applicationUpdate.employer = extraction.employer_name
        }

        if (Object.keys(applicationUpdate).length > 0) {
            applicationUpdate.screening_status = 'completed'
            applicationUpdate.screening_completed_at = new Date().toISOString()
            applicationUpdate.singlekey_report_url = urlData.publicUrl

            await supabase
                .from('applications')
                .update(applicationUpdate)
                .eq('id', applicationId)
        }
    }

    return NextResponse.json(transformReport(updatedReport))
}

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params
    const applicationId = params.id

    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

    if (!profile?.company_id) {
        return NextResponse.json({ error: 'Company profile not found' }, { status: 403 })
    }

    const { data, error } = await supabase
        .from('application_screening_reports')
        .select('*')
        .eq('application_id', applicationId)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: 'Failed to fetch screening reports' }, { status: 500 })
    }

    // Transform each row to the format the frontend expects
    const transformed = (data || []).map(transformReport)

    return NextResponse.json(transformed)
}
