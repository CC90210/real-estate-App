'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function useProperties(buildingId?: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: ['properties', buildingId],
        queryFn: async () => {
            let query = supabase
                .from('properties')
                .select(`
                    *,
                    buildings (id, name, address, amenities),
                    landlords (id, name, email, phone)
                `)
                .order('created_at', { ascending: false });

            if (buildingId) {
                query = query.eq('building_id', buildingId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        staleTime: 30000,
    });
}

export function useProperty(propertyId: string) {
    const supabase = createClient();

    return useQuery({
        queryKey: ['properties', propertyId],
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

export function useDeleteProperty() {
    const queryClient = useQueryClient();
    const supabase = createClient();

    return useMutation({
        mutationFn: async (propertyId: string) => {
            const { error } = await supabase
                .from('properties')
                .delete()
                .eq('id', propertyId);

            if (error) throw error;
            return propertyId;
        },
        onMutate: async (propertyId) => {
            await queryClient.cancelQueries({ queryKey: ['properties'] });
            const previousProperties = queryClient.getQueryData(['properties']);

            queryClient.setQueryData(['properties'], (old: any[]) =>
                old?.filter(p => p.id !== propertyId)
            );

            return { previousProperties };
        },
        onError: (err, propertyId, context) => {
            queryClient.setQueryData(['properties'], context?.previousProperties);
            toast.error('Failed to delete property');
        },
        onSuccess: () => {
            toast.success('Property deleted successfully');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['properties'] });
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
