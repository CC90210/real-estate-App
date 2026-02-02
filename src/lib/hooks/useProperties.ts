'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useCompanyId } from './useCompanyId';

export function useProperties(buildingId?: string) {
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useQuery({
        queryKey: ['properties', buildingId, companyId],
        queryFn: async () => {
            let query = supabase
                .from('properties')
                .select(`
                    *,
                    buildings (id, name, address, amenities),
                    landlords (id, name, email, phone)
                `)
                .order('created_at', { ascending: false });

            if (companyId) {
                query = query.eq('company_id', companyId);
            }

            if (buildingId) {
                query = query.eq('building_id', buildingId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        staleTime: 30000,
        enabled: !!companyId,
    });
}

export function useProperty(propertyId: string) {
    const supabase = createClient();
    const { companyId } = useCompanyId();

    return useQuery({
        queryKey: ['properties', propertyId, companyId],
        queryFn: async () => {
            let query = supabase
                .from('properties')
                .select(`
                    *,
                    buildings (id, name, address, amenities),
                    landlords (id, name, email, phone)
                `)
                .eq('id', propertyId);

            if (companyId) {
                query = query.eq('company_id', companyId);
            }

            const { data, error } = await query.single();

            if (error) throw error;
            return data;
        },
        enabled: !!propertyId && !!companyId,
    });
}

export function useDeleteProperty() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async (propertyId: string) => {
            console.log(`[useDeleteProperty] Deleting: ${propertyId}`);

            // DB handles cascading deletes (apps, logs) automatically now.
            const { error } = await supabase
                .from('properties')
                .delete()
                .eq('id', propertyId);

            if (error) {
                console.error('Supabase Delete Error:', error);
                throw error;
            }
            return propertyId;
        },
        onMutate: async (propertyId) => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: ['properties'] });

            const previousProperties = queryClient.getQueryData(['properties']);

            queryClient.setQueryData(['properties'], (old: any[]) =>
                old?.filter(p => p.id !== propertyId)
            );

            return { previousProperties };
        },
        onError: (err, propertyId, context) => {
            queryClient.setQueryData(['properties'], context?.previousProperties);
            toast.error('Failed to delete property: ' + err.message);
        },
        onSuccess: () => {
            toast.success('Property deleted successfully');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
        },
    });
}

export function useUpdateProperty() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
            const { data, error } = await supabase
                .from('properties')
                .update({ ...updates }) // removed updated_at as it might be handled by db trigger or not exist in type
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['properties'] });
            const previousProperties = queryClient.getQueryData(['properties']);

            queryClient.setQueryData(['properties'], (old: any[]) =>
                old?.map(p => p.id === id ? { ...p, ...updates } : p)
            );

            return { previousProperties };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['properties'], context?.previousProperties);
            toast.error('Failed to update property');
        },
        onSuccess: () => {
            toast.success('Property updated successfully');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] });
        },
    });
}

export function useCreateProperty() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async (newProperty: any) => {
            const { data, error } = await supabase
                .from('properties')
                .insert(newProperty)
                .select(`
                    *,
                    buildings (id, name, address),
                    landlords (id, name)
                `)
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            toast.success('Property created successfully');
        },
        onError: (error: any) => {
            toast.error('Failed to create property: ' + error.message);
        },
    });
}

export function useLandlords() {
    const supabase = createClient();

    return useQuery({
        queryKey: ['landlords'],
        queryFn: async () => {
            // Check if landlords table exists first, if not use profiles with landlord role
            // For now assuming we are using profiles or a landlords table if created
            // Based on previous schema, we have profiles.
            // Let's try to fetch from profiles where role is landlord
            // OR if a landlords table was key.
            // Looking at the error logs and previous context, there is a `landlords` table referenced in joins.
            const { data, error } = await supabase
                .from('landlords')
                .select('*')
                .order('name');

            if (error) {
                // Fallback to profiles if landlords table issue or if that was the design
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'landlord');

                if (profileError) throw profileError;
                return profiles;
            }
            return data;
        },
    });
}
