'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Property, PropertyPhoto, Area, Building } from '@/types/database';

// Fetch all areas with counts
export function useAreas() {
    return useQuery({
        queryKey: ['areas'],
        queryFn: async () => {
            const { data: areas, error } = await supabase
                .from('areas')
                .select('*')
                .order('name');

            if (error) throw error;

            // Get building counts for each area
            const areasWithCounts = await Promise.all(
                areas.map(async (area) => {
                    const { count: buildingCount } = await supabase
                        .from('buildings')
                        .select('*', { count: 'exact', head: true })
                        .eq('area_id', area.id);

                    const { count: propertyCount } = await supabase
                        .from('properties')
                        .select('*, buildings!inner(*)', { count: 'exact', head: true })
                        .eq('buildings.area_id', area.id)
                        .eq('status', 'available');

                    return {
                        ...area,
                        building_count: buildingCount || 0,
                        available_properties_count: propertyCount || 0,
                    } as Area;
                })
            );

            return areasWithCounts;
        },
    });
}

// Fetch single area
export function useArea(areaId: string) {
    return useQuery({
        queryKey: ['areas', areaId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('areas')
                .select('*')
                .eq('id', areaId)
                .single();

            if (error) throw error;
            return data as Area;
        },
        enabled: !!areaId,
    });
}

// Fetch buildings for an area
export function useBuildings(areaId: string) {
    return useQuery({
        queryKey: ['buildings', areaId],
        queryFn: async () => {
            const { data: buildings, error } = await supabase
                .from('buildings')
                .select('*, area:areas(*)')
                .eq('area_id', areaId)
                .order('name');

            if (error) throw error;

            // Get available unit counts
            const buildingsWithCounts = await Promise.all(
                buildings.map(async (building) => {
                    const { count } = await supabase
                        .from('properties')
                        .select('*', { count: 'exact', head: true })
                        .eq('building_id', building.id)
                        .eq('status', 'available');

                    return {
                        ...building,
                        available_units_count: count || 0,
                    } as Building;
                })
            );

            return buildingsWithCounts;
        },
        enabled: !!areaId,
    });
}

// Fetch single building
export function useBuilding(buildingId: string) {
    return useQuery({
        queryKey: ['buildings', 'single', buildingId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('buildings')
                .select('*, area:areas(*)')
                .eq('id', buildingId)
                .single();

            if (error) throw error;
            return data as Building;
        },
        enabled: !!buildingId,
    });
}

// Fetch properties for a building
export function useProperties(buildingId: string) {
    return useQuery({
        queryKey: ['properties', buildingId],
        queryFn: async () => {
            const { data: properties, error } = await supabase
                .from('properties')
                .select(`
          *,
          building:buildings(*),
          photos:property_photos(*)
        `)
                .eq('building_id', buildingId)
                .order('unit_number');

            if (error) throw error;

            return properties.map((p) => ({
                ...p,
                photos: p.photos?.sort((a: PropertyPhoto, b: PropertyPhoto) => a.order_index - b.order_index),
            })) as Property[];
        },
        enabled: !!buildingId,
    });
}

// Fetch all properties (for search/filters)
export function useAllProperties() {
    return useQuery({
        queryKey: ['properties', 'all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('properties')
                .select(`
          *,
          building:buildings(*, area:areas(*)),
          photos:property_photos(*)
        `)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            return data.map((p) => ({
                ...p,
                photos: p.photos?.sort((a: PropertyPhoto, b: PropertyPhoto) => a.order_index - b.order_index),
            })) as Property[];
        },
    });
}

// Fetch single property
export function useProperty(propertyId: string) {
    return useQuery({
        queryKey: ['properties', 'single', propertyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('properties')
                .select(`
          *,
          building:buildings(*, area:areas(*)),
          photos:property_photos(*)
        `)
                .eq('id', propertyId)
                .single();

            if (error) throw error;

            return {
                ...data,
                photos: data.photos?.sort((a: PropertyPhoto, b: PropertyPhoto) => a.order_index - b.order_index),
            } as Property;
        },
        enabled: !!propertyId,
    });
}

// Update property
export function useUpdateProperty() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Property> & { id: string }) => {
            const { data, error } = await supabase
                .from('properties')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Property;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            queryClient.setQueryData(['properties', 'single', data.id], data);
        },
    });
}
