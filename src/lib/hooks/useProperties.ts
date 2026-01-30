'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Property, Landlord } from '@/types/database';
import { getProperties, getProperty, getLandlords, getLandlord, getLandlordProperties } from '@/lib/demo-data';

// Fetch all properties
export function useProperties() {
    return useQuery({
        queryKey: ['properties'],
        queryFn: async () => {
            return await getProperties();
        },
        staleTime: Infinity,
    });
}

// Fetch single property
export function useProperty(propertyId: string) {
    return useQuery({
        queryKey: ['properties', propertyId],
        queryFn: async () => {
            const property = await getProperty(propertyId);
            if (!property) throw new Error('Property not found');
            return property;
        },
        enabled: !!propertyId,
        staleTime: Infinity,
    });
}

// Fetch all landlords
export function useLandlords() {
    return useQuery({
        queryKey: ['landlords'],
        queryFn: async () => {
            return await getLandlords();
        },
        staleTime: Infinity,
    });
}

// Fetch single landlord
export function useLandlord(landlordId: string) {
    return useQuery({
        queryKey: ['landlords', landlordId],
        queryFn: async () => {
            const landlord = await getLandlord(landlordId);
            if (!landlord) throw new Error('Landlord not found');
            return landlord;
        },
        enabled: !!landlordId,
        staleTime: Infinity,
    });
}

// Fetch properties for a landlord
export function useLandlordProperties(landlordId: string) {
    return useQuery({
        queryKey: ['properties', 'landlord', landlordId],
        queryFn: async () => {
            return await getLandlordProperties(landlordId);
        },
        enabled: !!landlordId,
        staleTime: Infinity,
    });
}

// Update property (Mock)
export function useUpdateProperty() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Property> & { id: string }) => {
            // In a real app we would call API
            console.log('Mock update property', id, updates);
            return { id, ...updates } as any;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            queryClient.invalidateQueries({ queryKey: ['properties', variables.id] });
        },
    });
}
