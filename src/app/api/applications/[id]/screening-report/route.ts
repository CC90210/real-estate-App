
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Enterprise document handling — supports large multi-page screening reports (up to 250MB)
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for AI processing of 20+ page reports
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 250 * 1024 * 1024 // 250MB — matches storage bucket limit

const GEMINI_EXTRACTION_PROMPT = `You are an expert tenant screening report analyzer. You will receive a PDF document that may be from ANY screening provider (SingleKey, Certn, Equifax, TransUnion, Naborly, FrontLobby, or custom reports). Extract ALL available information into the JSON structure below. For any field not found in the document, use null (for strings/numbers/booleans) or 0 (for counts) or [] (for arrays).

IMPORTANT: Be thorough. These reports can be 10-20+ pages and contain detailed financial, criminal, credit, employment, identity, and rental history data. Scan EVERY page carefully.

{
  "report_provider": string or null,
  "report_date": string or null,
  "report_type": string or null,

  "applicant_name": string or null,
  "applicant_email": string or null,
  "applicant_phone": string or null,
  "applicant_dob": string or null,
  "applicant_current_address": string or null,
  "applicant_previous_addresses": [{"address": string, "duration": string}] or [],

  "credit_score": number or null,
  "credit_score_provider": string or null,
  "credit_score_range": string or null,
  "credit_accounts_total": number or null,
  "credit_accounts_open": number or null,
  "credit_accounts_closed": number or null,
  "credit_accounts_delinquent": number or null,
  "credit_utilization_pct": number or null,
  "oldest_account_age": string or null,
  "credit_inquiries_last_12mo": number or null,
  "trade_lines": [{"creditor": string, "type": string, "balance": number, "limit": number, "status": string, "monthly_payment": number}] or [],

  "annual_income": number or null,
  "monthly_income": number or null,
  "income_verified": boolean or null,
  "income_sources": [{"source": string, "amount": number, "frequency": string}] or [],

  "employment_status": string or null,
  "employer_name": string or null,
  "employer_phone": string or null,
  "job_title": string or null,
  "employment_duration": string or null,
  "employment_verified": boolean or null,
  "previous_employers": [{"name": string, "duration": string, "title": string}] or [],

  "criminal_record_clear": boolean or null,
  "criminal_records": [{"type": string, "date": string, "jurisdiction": string, "description": string, "status": string}] or [],
  "sex_offender_check_clear": boolean or null,
  "terrorist_watchlist_clear": boolean or null,

  "public_records_clear": boolean or null,
  "bankruptcies": number,
  "bankruptcy_details": [{"type": string, "date": string, "status": string}] or [],
  "collections": number,
  "collection_details": [{"creditor": string, "amount": number, "date": string, "status": string}] or [],
  "legal_cases": number,
  "legal_case_details": [{"type": string, "date": string, "plaintiff": string, "amount": number, "status": string}] or [],
  "judgments": number,
  "liens": number,
  "eviction_records": [{"date": string, "address": string, "reason": string, "outcome": string}] or [],

  "debt_total": number or null,
  "monthly_debt_payments": number or null,
  "debt_to_income_ratio": number or null,

  "id_verification_passed": boolean or null,
  "id_type_verified": string or null,
  "id_document_number_last4": string or null,
  "address_verification_passed": boolean or null,

  "rental_history": [{"address": string, "landlord_name": string, "landlord_phone": string, "rent_amount": number, "duration": string, "reason_for_leaving": string, "payment_history": string}] or [],
  "current_rent": number or null,
  "current_landlord_name": string or null,
  "current_landlord_phone": string or null,

  "is_smoker": boolean or null,
  "num_vehicles": number or null,
  "num_occupants": number or null,
  "has_pets": boolean or null,
  "pet_details": string or null,

  "bank_statements_summary": {"avg_monthly_balance": number, "avg_monthly_deposits": number, "avg_monthly_withdrawals": number, "nsf_count": number, "months_analyzed": number} or null,

  "references": [{"name": string, "relationship": string, "phone": string, "email": string, "verified": boolean}] or [],

  "overall_recommendation": string or null,
  "risk_score": number or null,
  "risk_level": string or null,
  "risk_flags": ["array of specific concerns found in the report"],
  "positive_indicators": ["array of positive factors found"],
  "summary": "Comprehensive 3-5 sentence summary of the applicant's overall profile including financial health, rental history, employment stability, and risk assessment"
}

Return ONLY valid JSON, no markdown fences.`

interface GeminiExtraction {
    report_provider: string | null
    report_date: string | null
    report_type: string | null

    applicant_name: string | null
    applicant_email: string | null
    applicant_phone: string | null
    applicant_dob: string | null
    applicant_current_address: string | null
    applicant_previous_addresses: { address: string; duration: string }[]

    credit_score: number | null
    credit_score_provider: string | null
    credit_score_range: string | null
    credit_accounts_total: number | null
    credit_accounts_open: number | null
    credit_accounts_closed: number | null
    credit_accounts_delinquent: number | null
    credit_utilization_pct: number | null
    oldest_account_age: string | null
    credit_inquiries_last_12mo: number | null
    trade_lines: { creditor: string; type: string; balance: number; limit: number; status: string; monthly_payment: number }[]

    annual_income: number | null
    monthly_income: number | null
    income_verified: boolean | null
    income_sources: { source: string; amount: number; frequency: string }[]

    employment_status: string | null
    employer_name: string | null
    employer_phone: string | null
    job_title: string | null
    employment_duration: string | null
    employment_verified: boolean | null
    previous_employers: { name: string; duration: string; title: string }[]

    criminal_record_clear: boolean | null
    criminal_records: { type: string; date: string; jurisdiction: string; description: string; status: string }[]
    sex_offender_check_clear: boolean | null
    terrorist_watchlist_clear: boolean | null

    public_records_clear: boolean | null
    bankruptcies: number
    bankruptcy_details: { type: string; date: string; status: string }[]
    collections: number
    collection_details: { creditor: string; amount: number; date: string; status: string }[]
    legal_cases: number
    legal_case_details: { type: string; date: string; plaintiff: string; amount: number; status: string }[]
    judgments: number
    liens: number
    eviction_records: { date: string; address: string; reason: string; outcome: string }[]

    debt_total: number | null
    monthly_debt_payments: number | null
    debt_to_income_ratio: number | null

    id_verification_passed: boolean | null
    id_type_verified: string | null
    id_document_number_last4: string | null
    address_verification_passed: boolean | null

    rental_history: { address: string; landlord_name: string; landlord_phone: string; rent_amount: number; duration: string; reason_for_leaving: string; payment_history: string }[]
    current_rent: number | null
    current_landlord_name: string | null
    current_landlord_phone: string | null

    is_smoker: boolean | null
    num_vehicles: number | null
    num_occupants: number | null
    has_pets: boolean | null
    pet_details: string | null

    bank_statements_summary: { avg_monthly_balance: number; avg_monthly_deposits: number; avg_monthly_withdrawals: number; nsf_count: number; months_analyzed: number } | null

    references: { name: string; relationship: string; phone: string; email: string; verified: boolean }[]

    overall_recommendation: string | null
    risk_score: number | null
    risk_level: string | null
    risk_flags: string[]
    positive_indicators: string[]
    summary: string
}

// Transform a database row into the shape the frontend component expects
function transformReport(row: Record<string, unknown>) {
    const raw = (row.raw_extracted_data ?? {}) as Record<string, unknown>
    return {
        id: row.id,
        file_name: row.file_name,
        file_url: row.file_url,
        file_size: row.file_size,
        report_type: row.report_type ?? 'custom',
        status: row.processing_status || 'pending',
        created_at: row.created_at,
        metrics: row.processing_status === 'completed' ? {
            // Core metrics
            credit_score: row.extracted_credit_score ?? null,
            criminal_clear: row.extracted_criminal_clear ?? null,
            public_records_clear: row.extracted_public_records_clear ?? null,
            annual_income: row.extracted_income ?? null,
            total_debt: raw.debt_total ?? null,
            monthly_debt_payments: raw.monthly_debt_payments ?? null,
            debt_to_income_ratio: raw.debt_to_income_ratio ?? null,
            bankruptcies: row.extracted_bankruptcies ?? 0,
            collections: row.extracted_collections ?? 0,
            legal_cases: row.extracted_legal_cases ?? 0,
            judgments: raw.judgments ?? 0,
            liens: raw.liens ?? 0,

            // Credit details
            credit_score_provider: raw.credit_score_provider ?? null,
            credit_utilization_pct: raw.credit_utilization_pct ?? null,
            credit_accounts_total: raw.credit_accounts_total ?? null,
            credit_accounts_delinquent: raw.credit_accounts_delinquent ?? null,
            credit_inquiries_last_12mo: raw.credit_inquiries_last_12mo ?? null,
            trade_lines: raw.trade_lines ?? [],

            // Identity & verification
            id_verification_passed: raw.id_verification_passed ?? null,
            address_verification_passed: raw.address_verification_passed ?? null,
            sex_offender_check_clear: raw.sex_offender_check_clear ?? null,
            terrorist_watchlist_clear: raw.terrorist_watchlist_clear ?? null,

            // Employment
            employer_name: raw.employer_name ?? null,
            job_title: raw.job_title ?? null,
            employment_status: raw.employment_status ?? null,
            employment_duration: raw.employment_duration ?? null,
            employment_verified: raw.employment_verified ?? null,
            income_verified: raw.income_verified ?? null,
            income_sources: raw.income_sources ?? [],

            // Rental history
            rental_history: raw.rental_history ?? [],
            eviction_records: raw.eviction_records ?? [],
            current_rent: raw.current_rent ?? null,
            current_landlord_name: raw.current_landlord_name ?? null,

            // Criminal details
            criminal_records: raw.criminal_records ?? [],

            // Collections & legal details
            collection_details: raw.collection_details ?? [],
            legal_case_details: raw.legal_case_details ?? [],
            bankruptcy_details: raw.bankruptcy_details ?? [],

            // Bank statement summary
            bank_statements_summary: raw.bank_statements_summary ?? null,

            // References
            references: raw.references ?? [],

            // Report metadata
            report_provider: raw.report_provider ?? null,
            report_date: raw.report_date ?? null,

            // Risk & summary
            risk_score: raw.risk_score ?? null,
            risk_level: raw.risk_level ?? null,
            risk_flags: row.extracted_risk_flags ?? [],
            positive_indicators: raw.positive_indicators ?? [],
            ai_summary: row.extracted_summary ?? null,
            overall_recommendation: raw.overall_recommendation ?? null,
        } : null,
        error_message: row.processing_status === 'failed'
            ? (row.error_message as string) || 'AI extraction failed — report uploaded successfully'
            : null,
    }
}

// Helper: look up the property rent for an application so we can compute ratios
async function getPropertyRent(
    supabase: Awaited<ReturnType<typeof createClient>>,
    applicationId: string
): Promise<number | null> {
    const { data } = await supabase
        .from('applications')
        .select('property:properties(rent)')
        .eq('id', applicationId)
        .single()
    if (!data?.property) return null
    const prop = Array.isArray(data.property) ? data.property[0] : data.property
    return (prop as { rent?: number })?.rent ?? null
}

// Detect report provider from extraction data
function detectReportType(extraction: GeminiExtraction): string {
    const provider = (extraction.report_provider ?? '').toLowerCase()
    if (provider.includes('singlekey') || provider.includes('single key')) return 'singlekey'
    if (provider.includes('certn')) return 'certn'
    if (provider.includes('equifax')) return 'equifax'
    if (provider.includes('transunion')) return 'transunion'
    if (provider.includes('naborly')) return 'naborly'
    if (provider.includes('frontlobby') || provider.includes('front lobby')) return 'frontlobby'
    return 'custom'
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

    // Use Gemini 1.5 Pro for large documents (>5MB) — better at complex multi-page analysis
    // Use Flash for smaller reports — faster and cheaper
    const fileSizeMB = fileBuffer.byteLength / (1024 * 1024)
    const modelName = fileSizeMB > 5 ? 'gemini-1.5-pro' : 'gemini-1.5-flash'
    const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
            temperature: 0.1,      // Low temp for structured extraction accuracy
            maxOutputTokens: 8192, // Enough for full JSON response with all 60+ fields
        },
    })

    console.log(`[Screening AI] Using ${modelName} for ${fileSizeMB.toFixed(1)}MB document`)

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

    // Robust JSON extraction — handles markdown fences, nested fences, and whitespace
    let cleaned = responseText
    // Strip all markdown code fences (handles ```json, ``` , and nested cases)
    cleaned = cleaned.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '').trim()

    // Find the JSON object boundaries as a fallback
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error(`Gemini returned non-JSON response: ${cleaned.substring(0, 200)}...`)
    }
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1)

    try {
        return JSON.parse(cleaned) as GeminiExtraction
    } catch (parseError) {
        // Log the raw response for debugging
        console.error('[Screening AI] JSON parse failed. Raw response:', responseText.substring(0, 500))
        throw new Error(`Failed to parse Gemini JSON response: ${(parseError as Error).message}`)
    }
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

    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
            { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 250MB.` },
            { status: 413 }
        )
    }

    // Upload PDF to Supabase Storage
    const storagePath = `${profile.company_id}/${applicationId}/${Date.now()}-${file.name}`
    const fileBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
        .from('application-screening-reports')
        .upload(storagePath, fileBuffer, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
        console.error('[Screening] Upload failed:', uploadError.message)
        return NextResponse.json({ error: 'File upload failed' }, { status: 500 })
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
    let processingError: string | null = null

    try {
        extraction = await parseScreeningReportWithGemini(fileBuffer, 'application/pdf')
        processingStatus = 'completed'
        console.log(`[Screening AI] Successfully extracted data from ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
    } catch (aiError) {
        processingError = (aiError as Error).message || 'Unknown AI extraction error'
        console.error(`[Screening AI] Extraction failed for ${file.name}:`, processingError)
        // Non-fatal: record is saved with status 'failed' but the PDF upload succeeded
    }

    // Build the update payload using CORRECT database column names (extracted_* prefix)
    const reportUpdate: Record<string, unknown> = {
        processing_status: processingStatus,
        processed_at: new Date().toISOString(),
        ...(processingError && { error_message: processingError }),
    }

    if (extraction) {
        reportUpdate.report_type = detectReportType(extraction)
        reportUpdate.extracted_credit_score = extraction.credit_score
        reportUpdate.extracted_income = extraction.annual_income ?? (extraction.monthly_income ? extraction.monthly_income * 12 : null)
        reportUpdate.extracted_criminal_clear = extraction.criminal_record_clear
        reportUpdate.extracted_public_records_clear = extraction.public_records_clear
        reportUpdate.extracted_bankruptcies = extraction.bankruptcies ?? 0
        reportUpdate.extracted_collections = extraction.collections ?? 0
        reportUpdate.extracted_legal_cases = extraction.legal_cases ?? 0
        reportUpdate.extracted_summary = extraction.summary
        reportUpdate.extracted_risk_flags = extraction.risk_flags
        reportUpdate.raw_extracted_data = extraction // Store the FULL extraction — all 60+ fields for reference
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

        // Credit & financial
        if (extraction.credit_score !== null) applicationUpdate.credit_score = extraction.credit_score
        if (extraction.criminal_record_clear !== null) applicationUpdate.criminal_check_passed = extraction.criminal_record_clear
        if (extraction.public_records_clear !== null) applicationUpdate.public_records_clear = extraction.public_records_clear

        // Income — prefer monthly, derive from annual if needed
        if (extraction.monthly_income !== null) {
            applicationUpdate.monthly_income = extraction.monthly_income
        } else if (extraction.annual_income !== null) {
            applicationUpdate.monthly_income = Math.round(extraction.annual_income / 12)
        }

        // Combined household income
        if (extraction.annual_income !== null) {
            applicationUpdate.combined_household_income = Math.round(extraction.annual_income / 12)
        }

        // Income verification
        if (extraction.income_verified !== null) applicationUpdate.income_verified = extraction.income_verified

        // Debt
        if (extraction.debt_total !== null) applicationUpdate.total_debt = extraction.debt_total

        // Compute ratios if we have enough data
        const rent = await getPropertyRent(supabase, applicationId)
        const monthlyInc = extraction.monthly_income ?? (extraction.annual_income ? Math.round(extraction.annual_income / 12) : null)
        if (rent && monthlyInc && monthlyInc > 0) {
            applicationUpdate.income_to_rent_ratio = parseFloat((monthlyInc / rent).toFixed(2))
            applicationUpdate.yearly_rent_cost = rent * 12
        }
        if (extraction.debt_to_income_ratio !== null) {
            applicationUpdate.dti_ratio = extraction.debt_to_income_ratio
        } else if (extraction.debt_total !== null && extraction.annual_income && extraction.annual_income > 0) {
            applicationUpdate.dti_ratio = parseFloat(((extraction.debt_total / extraction.annual_income) * 100).toFixed(1))
        }

        // Lifestyle
        if (extraction.is_smoker !== null) applicationUpdate.is_smoker = extraction.is_smoker
        if (extraction.num_vehicles !== null) applicationUpdate.num_vehicles = extraction.num_vehicles
        if (extraction.num_occupants !== null) applicationUpdate.num_occupants = extraction.num_occupants
        if (extraction.has_pets !== null) applicationUpdate.has_pets = extraction.has_pets
        if (extraction.pet_details) applicationUpdate.pet_details = extraction.pet_details

        // Identity verification
        if (extraction.id_verification_passed !== null) applicationUpdate.government_id_verified = extraction.id_verification_passed

        // Employment
        if (extraction.employment_status !== null) applicationUpdate.employment_status = extraction.employment_status
        if (extraction.employer_name !== null) applicationUpdate.employer = extraction.employer_name
        if (extraction.employment_duration !== null) applicationUpdate.employment_duration = extraction.employment_duration

        // Rental history
        if (extraction.current_rent !== null) applicationUpdate.current_rent = extraction.current_rent
        if (extraction.current_landlord_name) applicationUpdate.current_landlord_name = extraction.current_landlord_name
        if (extraction.current_landlord_phone) applicationUpdate.current_landlord_phone = extraction.current_landlord_phone
        if (extraction.applicant_previous_addresses?.length > 0) {
            applicationUpdate.previous_addresses = JSON.stringify(extraction.applicant_previous_addresses)
        }

        // Current address
        if (extraction.applicant_current_address) applicationUpdate.current_address = extraction.applicant_current_address

        if (Object.keys(applicationUpdate).length > 0) {
            applicationUpdate.screening_status = 'completed'
            applicationUpdate.screening_completed_at = new Date().toISOString()
            applicationUpdate.singlekey_report_url = urlData.publicUrl

            await supabase
                .from('applications')
                .update(applicationUpdate)
                .eq('id', applicationId)
                .eq('company_id', profile.company_id)
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
