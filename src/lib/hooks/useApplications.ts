'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Application, ApplicationFormData } from '@/types/database';
import { getApplications } from '@/lib/demo-data';

// Fetch all applications
export function useApplications(status?: string) {
    return useQuery({
        queryKey: ['applications', status],
        queryFn: async () => {
            const allApps = await getApplications();
            if (status && status !== 'all') {
                return allApps.filter(a => a.status === status);
            }
            return allApps;
        },
        staleTime: Infinity,
    });
}

// Fetch single application
export function useApplication(applicationId: string) {
    return useQuery({
        queryKey: ['applications', applicationId],
        queryFn: async () => {
            const allApps = await getApplications();
            const app = allApps.find(a => a.id === applicationId);
            if (!app) throw new Error('Application not found');
            return app;
        },
        enabled: !!applicationId,
        staleTime: Infinity,
    });
}

// Fetch applications for a specific property
export function usePropertyApplications(propertyId: string) {
    return useQuery({
        queryKey: ['applications', 'property', propertyId],
        queryFn: async () => {
            const allApps = await getApplications();
            return allApps.filter(a => a.property_id === propertyId);
        },
        enabled: !!propertyId,
        staleTime: Infinity,
    });
}

// Fetch applications created by an agent (Mock)
export function useAgentApplications(agentId: string) {
    return useQuery({
        queryKey: ['applications', 'agent', agentId],
        queryFn: async () => {
            const allApps = await getApplications();
            // Just return all apps for demo or random ones
            return allApps;
        },
        enabled: !!agentId,
        staleTime: Infinity,
    });
}

// Create application (Mock)
export function useCreateApplication() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            propertyId,
            agentId,
            formData,
        }: {
            propertyId: string;
            agentId: string;
            formData: ApplicationFormData;
        }) => {
            console.log('Mock create application', propertyId, agentId, formData);
            return {
                id: 'new_mock_id',
                property_id: propertyId,
                status: 'new',
                ...formData
            } as any;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
    });
}

// Update application status (Mock)
export function useUpdateApplicationStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            status,
        }: {
            id: string;
            status: 'approved' | 'denied' | 'withdrawn';
        }) => {
            console.log('Mock update status', id, status);
            return { id, status } as any;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.invalidateQueries({ queryKey: ['applications', data.id] });
        },
    });
}

// Get application stats
export function useApplicationStats() {
    return useQuery({
        queryKey: ['applications', 'stats'],
        queryFn: async () => {
            const data = await getApplications();

            const stats = {
                total: data.length,
                pending: data.filter((a) => a.status === 'new' || a.screening_status === 'pending').length,
                approved: data.filter((a) => a.status === 'approved').length,
                denied: data.filter((a) => a.status === 'denied').length,
                screeningComplete: data.filter((a) => a.screening_status === 'completed').length,
            };

            return stats;
        },
        staleTime: Infinity,
    });
}
