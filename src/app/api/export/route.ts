import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/services/activity-logger'

export async function GET(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get company_id from profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .single()

    if (!profile?.company_id) {
        return NextResponse.json({ error: 'No company found' }, { status: 404 })
    }

    if (!['admin', 'agent'].includes(profile.role)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const url = new URL(req.url)
    const type = url.searchParams.get('type')

    if (!type) {
        return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 })
    }

    try {
        let csvContent = ''

        switch (type) {
            case 'properties': {
                const { data } = await supabase
                    .from('properties')
                    .select('address, unit_number, city, rent, bedrooms, bathrooms, square_feet, status, available_date, created_at')
                    .eq('company_id', profile.company_id)
                    .order('address')

                const headers = ['Address', 'Unit', 'City', 'Rent', 'Bedrooms', 'Bathrooms', 'Sq Ft', 'Status', 'Available Date', 'Created']
                const rows = (data || []).map(p => [
                    p.address, p.unit_number || '', p.city || '', p.rent, p.bedrooms, p.bathrooms,
                    p.square_feet || '', p.status, p.available_date || '', p.created_at
                ])
                csvContent = generateCSV(headers, rows)
                break
            }

            case 'applications': {
                const { data } = await supabase
                    .from('applications')
                    .select('applicant_name, applicant_email, applicant_phone, status, monthly_income, move_in_date, created_at, properties(address)')
                    .eq('company_id', profile.company_id)
                    .order('created_at', { ascending: false })

                const headers = ['Name', 'Email', 'Phone', 'Status', 'Monthly Income', 'Move-in Date', 'Property', 'Applied']
                const rows = (data || []).map((a: any) => [
                    a.applicant_name, a.applicant_email, a.applicant_phone || '', a.status,
                    a.monthly_income || '', a.move_in_date || '', a.properties?.address || '', a.created_at
                ])
                csvContent = generateCSV(headers, rows)
                break
            }

            case 'invoices': {
                const { data } = await supabase
                    .from('invoices')
                    .select('invoice_number, recipient_name, recipient_email, total, status, due_date, created_at')
                    .eq('company_id', profile.company_id)
                    .order('created_at', { ascending: false })

                const headers = ['Invoice #', 'Recipient', 'Email', 'Total', 'Status', 'Due Date', 'Created']
                const rows = (data || []).map(i => [
                    i.invoice_number, i.recipient_name, i.recipient_email || '', i.total,
                    i.status, i.due_date || '', i.created_at
                ])
                csvContent = generateCSV(headers, rows)
                break
            }

            case 'leases': {
                const { data } = await supabase
                    .from('leases')
                    .select('tenant_name, tenant_email, rent_amount, deposit_amount, start_date, end_date, status, properties(address)')
                    .eq('company_id', profile.company_id)
                    .order('created_at', { ascending: false })

                const headers = ['Tenant', 'Email', 'Rent', 'Deposit', 'Start', 'End', 'Status', 'Property']
                const rows = (data || []).map((l: any) => [
                    l.tenant_name, l.tenant_email, l.rent_amount, l.deposit_amount || 0,
                    l.start_date, l.end_date, l.status, l.properties?.address || ''
                ])
                csvContent = generateCSV(headers, rows)
                break
            }

            case 'maintenance': {
                const { data } = await supabase
                    .from('maintenance_requests')
                    .select('title, category, priority, status, estimated_cost, actual_cost, created_at, resolved_at, properties(address)')
                    .eq('company_id', profile.company_id)
                    .order('created_at', { ascending: false })

                const headers = ['Title', 'Category', 'Priority', 'Status', 'Est. Cost', 'Actual Cost', 'Submitted', 'Resolved', 'Property']
                const rows = (data || []).map((m: any) => [
                    m.title, m.category, m.priority, m.status,
                    m.estimated_cost || '', m.actual_cost || '',
                    m.created_at, m.resolved_at || '', m.properties?.address || ''
                ])
                csvContent = generateCSV(headers, rows)
                break
            }

            default:
                return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
        }

        // Log the export
        await logActivity(supabase, {
            companyId: profile.company_id,
            userId: user.id,
            action: 'data_export',
            entityType: type as string,
            description: `Exported ${type} data to CSV`,
        })

        return new Response(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${type}_export_${new Date().toISOString().split('T')[0]}.csv"`,
            },
        })
    } catch (err: any) {
        console.error('[EXPORT]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

function generateCSV(headers: string[], rows: any[][]): string {
    const escape = (val: any) => {
        const str = String(val ?? '')
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
        }
        return str
    }
    return [
        headers.map(escape).join(','),
        ...rows.map(row => row.map(escape).join(','))
    ].join('\n')
}
