'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { triggerAutomation } from '@/lib/automations/dispatcher';
import { useCompanyId } from './useCompanyId';
import { applicationSchema, ApplicationInput } from '@/lib/schemas/application-schema';

export function useApplications() {
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useQuery({
        queryKey: ['applications', companyId],
        queryFn: async () => {
            let query = supabase
                .from('applications')
                .select(`
                    *,
                    properties (id, address, rent, bedrooms, bathrooms),
                    agent:profiles!created_by(id, full_name, role)
                `)
                .order('created_at', { ascending: false });

            if (companyId) {
                query = query.eq('company_id', companyId);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error fetching applications:", error);
                throw new Error("Failed to fetch applications");
            }
            return data;
        },
        enabled: !!companyId,
    });
}

export function useDeleteApplication() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async (applicationId: string) => {
            // First delete related activity log entries
            const { error: logsError } = await supabase
                .from('activity_log')
                .delete()
                .eq('entity_id', applicationId)
                .eq('entity_type', 'application');

            // Then delete the application
            const { error } = await supabase
                .from('applications')
                .delete()
                .eq('id', applicationId);

            if (error) throw error;
            return applicationId;
        },
        onMutate: async (applicationId) => {
            await queryClient.cancelQueries({ queryKey: ['applications'] });
            const previous = queryClient.getQueryData(['applications']);

            queryClient.setQueryData(['applications'], (old: any[]) =>
                old?.filter(a => a.id !== applicationId)
            );

            return { previous };
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['applications'], context?.previous);
            toast.error('Failed to delete application');
        },
        onSuccess: () => {
            toast.success('Application deleted successfully');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
    });
}

export function useUpdateApplication() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<ApplicationInput> }) => {
            const { data: updated, error } = await supabase
                .from('applications')
                .update({ ...data, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            toast.success('Application updated successfully');
        },
        onError: (error: any) => {
            toast.error('Failed to update application: ' + error.message);
        },
    });
}

export function useUpdateApplicationStatus() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { data, error } = await supabase
                .from('applications')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Log activity
            await supabase.from('activity_log').insert({
                action: status === 'approved' ? 'APPLICATION_APPROVED' : 'APPLICATION_DENIED',
                entity_type: 'application',
                entity_id: id,
                description: `Application status updated to ${status}`
            });

            // 🚀 TRIGGER AUTOMATION
            // Check if we approved it, if so, trigger lease generation workflow
            if (status === 'approved') {
                await triggerAutomation('APPLICATION_STATUS_CHANGED', {
                    application_id: id,
                    new_status: status,
                    action: 'START_LEASE_DRAFTING',
                    applicant_email: data.applicant_email,
                    property_id: data.property_id
                });
            }

            return data;
        },
        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ['applications'] });
            const previous = queryClient.getQueryData(['applications']);

            queryClient.setQueryData(['applications'], (old: any[]) =>
                old?.map(a => a.id === id ? { ...a, status } : a)
            );

            return { previous };
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.invalidateQueries({ queryKey: ['activity_log'] });
            toast.success(`Application ${variables.status}`);
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['applications'], context?.previous);
            toast.error('Failed to update status');
        },
    });
}

export function useCreateApplication() {
    const queryClient = useQueryClient();
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useMutation({
        mutationFn: async (newApplication: any) => {
            // Validate input
            const validationResult = applicationSchema.safeParse(newApplication);
            if (!validationResult.success) {
                throw new Error(validationResult.error.issues[0].message);
            }

            // Ensure company_id is set
            const applicationData = {
                ...validationResult.data,
                company_id: companyId,
            };

            const { data, error } = await supabase
                .from('applications')
                .insert(applicationData)
                .select()
                .single();

            if (error) throw error;

            // Trigger automation
            const trackingId = data.id;
            await triggerAutomation('APPLICATION_SUBMITTED', {
                ...applicationData,
                application_id: trackingId,
                webhook_callback_url: `${window.location.origin}/api/webhooks/automation-callback`,
                tracking_id: trackingId
            });

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            toast.success('Application created successfully');
        },
        onError: (error: any) => {
            toast.error('Failed to create application: ' + error.message);
        },
    });
}
