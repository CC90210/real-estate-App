
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// Define Automation Payload Types
type DocumentPayload = {
    document_id: string;
    document_type: string;
    title: string;
    recipient_email?: string; // If applicable
    company_id: string;
    created_by: string;
    metadata: Record<string, any>;
    file_url: string; // The signed URL from Supabase Storage
    triggered_at: string;
};

type InvoicePayload = {
    invoice_id: string;
    invoice_number: string;
    recipient_name: string;
    recipient_email: string;
    amount: number;
    company_id: string;
    created_by: string;
    items: any[];
    file_url: string; // The signed URL from Supabase Storage
    triggered_at: string;
};

export async function triggerDocumentAutomation(payload: DocumentPayload) {
    try {
        const response = await fetch('/api/webhooks/trigger', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'document',
                data: payload
            }),
        });

        if (!response.ok) {
            throw new Error(`Automation Trigger Failed: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Automation Error:', error);
        throw error; // Re-throw to handle UI state in the component
    }
}

export async function triggerInvoiceAutomation(payload: InvoicePayload) {
    try {
        const response = await fetch('/api/webhooks/trigger', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'invoice',
                data: payload
            }),
        });

        if (!response.ok) {
            throw new Error(`Automation Trigger Failed: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Automation Error:', error);
        throw error;
    }
}

/**
 * Uploads a Blob to Supabase Storage and returns a signed URL valid for 1 hour.
 * This URL is safe to send to n8n for processing.
 */
export async function uploadAndGetLink(
    blob: Blob,
    path: string,
    bucket: string = 'document-attachments'
): Promise<string> {
    const supabase = createClient();

    // 1. Upload
    const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from(bucket)
        .upload(path, blob, {
            contentType: 'application/pdf',
            upsert: true
        });

    if (uploadError) throw uploadError;

    // 2. Create Signed URL (valid for 1 hour)
    // N8N will download it immediately, so 1 hour is plenty.
    const { data: signedData, error: signError } = await supabase
        .storage
        .from(bucket)
        .createSignedUrl(path, 3600);

    if (signError) throw signError;

    return signedData.signedUrl;
}
