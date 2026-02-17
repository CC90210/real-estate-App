'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useCompanyId } from './useCompanyId';

export function useProperties(buildingId?: string) {
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useQuery({
        queryKey: ['properties', { buildingId, companyId }],
        queryFn: async () => {
            let query = supabase
                .from('properties')
                .select(`
                    *,
                    buildings (id, name, address, amenities),
                    landlords (id, name, email, phone)
                `)
                .order('created_at', { ascending: false });

            // Filter by company if available, otherwise RLS handles isolation
            if (companyId) {
                query = query.eq('company_id', companyId);
            }

            if (buildingId) {
                query = query.eq('building_id', buildingId);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Properties fetch error:', error.message);
                throw error;
            }
            return data;
        },
        staleTime: 60000,
        // Always enabled — RLS handles data isolation even without company_id
        enabled: true,
    });
}

export function useProperty(propertyId: string) {
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useQuery({
        queryKey: ['properties', 'detail', propertyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('properties')
                .select(`
                    *,
                    buildings (id, name, address, amenities),
                    landlords (id, name, email, phone)
                `)
                .eq('id', propertyId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!propertyId,
    });
}

async function logActivity(supabase: any, { companyId, action, entityType, entityId, details }: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !companyId) return;

    await supabase.from('activity_log').insert({
        company_id: companyId,
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details
    });
}

export function useDeleteProperty() {
    const queryClient = useQueryClient();
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useMutation({
        mutationFn: async (propertyId: string) => {
            const { error } = await supabase.from('properties').delete().eq('id', propertyId);
            if (error) throw error;

            await logActivity(supabase, {
                companyId,
                action: 'deleted',
                entityType: 'property',
                entityId: propertyId,
                details: { id: propertyId }
            });
            return propertyId;
        },
        onMutate: async (propertyId) => {
            await queryClient.cancelQueries({ queryKey: ['properties'] });

            const previousQueries = queryClient.getQueriesData({ queryKey: ['properties'] });

            queryClient.setQueriesData({ queryKey: ['properties'] }, (old: any[] | undefined) => {
                if (!Array.isArray(old)) return old;
                return old.filter(p => p.id !== propertyId);
            });

            return { previousQueries };
        },
        onError: (err, propertyId, context) => {
            context?.previousQueries.forEach(([queryKey, data]: any) => {
                queryClient.setQueryData(queryKey, data);
            });
            toast.error('Failed to delete property');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
        },
        onSuccess: () => toast.success('Property deleted'),
    });
}

export function useUpdateProperty() {
    const queryClient = useQueryClient();
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
            const { data, error } = await supabase
                .from('properties')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            await logActivity(supabase, {
                companyId,
                action: 'updated',
                entityType: 'property',
                entityId: id,
                details: { updates }
            });

            return data;
        },
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['properties'] });
            const previousQueries = queryClient.getQueriesData({ queryKey: ['properties'] });

            queryClient.setQueriesData({ queryKey: ['properties'] }, (old: any[] | undefined) => {
                if (!Array.isArray(old)) return old;
                return old.map(p => p.id === id ? { ...p, ...updates } : p);
            });

            queryClient.setQueryData(['properties', 'detail', id], (old: any) => {
                if (!old) return old;
                return { ...old, ...updates };
            });

            return { previousQueries };
        },
        onError: (err, vars, context) => {
            context?.previousQueries.forEach(([queryKey, data]: any) => {
                queryClient.setQueryData(queryKey, data);
            });
            queryClient.invalidateQueries({ queryKey: ['properties', 'detail', vars.id] });
            toast.error('Failed to update property');
        },
        onSettled: (data, error, vars) => {
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            queryClient.invalidateQueries({ queryKey: ['properties', 'detail', vars.id] });
        },
        onSuccess: () => toast.success('Property updated'),
    });
}

export function useCreateProperty() {
    const queryClient = useQueryClient();
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useMutation({
        mutationFn: async (newProperty: any) => {
            const { data, error } = await supabase
                .from('properties')
                .insert({
                    ...newProperty,
                    company_id: companyId,
                    status: newProperty.status || 'available'
                })
                .select(`
                    *,
                    buildings (id, name, address),
                    landlords (id, name)
                `)
                .single();

            if (error) throw error;

            await logActivity(supabase, {
                companyId,
                action: 'created',
                entityType: 'property',
                entityId: data.id,
                details: { address: data.address }
            });

            return data;
        },
        onMutate: async (newProperty) => {
            await queryClient.cancelQueries({ queryKey: ['properties'] });
            const previousQueries = queryClient.getQueriesData({ queryKey: ['properties'] });

            queryClient.setQueriesData({ queryKey: ['properties'] }, (old: any[] | undefined) => {
                if (!Array.isArray(old)) return [];
                const tempId = `temp-${Date.now()}`;
                return [{ ...newProperty, id: tempId, created_at: new Date().toISOString() }, ...old];
            });

            return { previousQueries };
        },
        onError: (err, vars, context) => {
            context?.previousQueries.forEach(([queryKey, data]: any) => {
                queryClient.setQueryData(queryKey, data);
            });
            toast.error('Failed to create property: ' + err.message);
        },
        onSettled: () => {
            // Invalidate fuzzy to catch all filters
            queryClient.invalidateQueries({ queryKey: ['properties'] });
        },
        onSuccess: () => {
            toast.success('Property created successfully');
        },
    });
}

export function useLandlords() {
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useQuery({
        queryKey: ['landlords', companyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('landlords')
                .select('*')
                .order('name');

            if (error) {
                console.error('Failed to fetch landlords:', error.message);
                return [];
            }
            return data;
        },
        enabled: !!companyId,
    });
}

