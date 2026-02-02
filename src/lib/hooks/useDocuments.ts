'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useCompanyId } from './useCompanyId';

export interface Document {
    id: string;
    type: 'property_summary' | 'lease_proposal' | 'showing_sheet' | 'application_summary';
    title: string;
    content: Record<string, any>;
    property_id: string | null;
    application_id: string | null;
    company_id: string;
    created_by: string | null;
    pdf_url: string | null;
    created_at: string;
    updated_at: string;
    properties?: {
        id: string;
        address: string;
    } | null;
    applications?: {
        id: string;
        applicant_name: string;
    } | null;
    creator?: {
        id: string;
        full_name: string;
    } | null;
}

export function useDocuments(options?: { type?: string; limit?: number }) {
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useQuery({
        queryKey: ['documents', companyId, options?.type, options?.limit],
        queryFn: async () => {
            let query = supabase
                .from('documents')
                .select(`
                    *,
                    properties (id, address),
                    applications (id, applicant_name),
                    creator:profiles!created_by (id, full_name)
                `)
                .order('created_at', { ascending: false });

            if (companyId) {
                query = query.eq('company_id', companyId);
            }

            if (options?.type) {
                query = query.eq('type', options.type);
            }

            if (options?.limit) {
                query = query.limit(options.limit);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as Document[];
        },
        enabled: !!companyId,
        staleTime: 30000,
    });
}

export function useDocument(documentId: string) {
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useQuery({
        queryKey: ['documents', documentId, companyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('documents')
                .select(`
                    *,
                    properties (id, address),
                    applications (id, applicant_name),
                    creator:profiles!created_by (id, full_name)
                `)
                .eq('id', documentId)
                .eq('company_id', companyId)
                .single();

            if (error) throw error;
            return data as Document;
        },
        enabled: !!documentId && !!companyId,
    });
}

export function useCreateDocument() {
    const queryClient = useQueryClient();
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useMutation({
        mutationFn: async (newDocument: {
            type: string;
            title: string;
            content: Record<string, any>;
            property_id?: string | null;
            application_id?: string | null;
            pdf_url?: string | null;
        }) => {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('documents')
                .insert({
                    ...newDocument,
                    company_id: companyId,
                    created_by: user?.id,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            toast.success('Document saved');
        },
        onError: (error: any) => {
            toast.error('Failed to save document: ' + error.message);
        },
    });
}

export function useDeleteDocument() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async (documentId: string) => {
            const { error } = await supabase
                .from('documents')
                .delete()
                .eq('id', documentId);

            if (error) throw error;
            return documentId;
        },
        onMutate: async (documentId) => {
            await queryClient.cancelQueries({ queryKey: ['documents'] });
            const previous = queryClient.getQueryData(['documents']);

            queryClient.setQueryData(['documents'], (old: Document[] | undefined) =>
                old?.filter(d => d.id !== documentId)
            );

            return { previous };
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['documents'], context?.previous);
            toast.error('Failed to delete document');
        },
        onSuccess: () => {
            toast.success('Document deleted');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        },
    });
}
