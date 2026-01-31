'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deletePropertyAction(propertyId: string) {
    const supabase = await createClient();

    try {
        console.log(`[deletePropertyAction] Starting deletion for: ${propertyId}`);

        // 1. Fetch related applications
        const { data: apps } = await supabase
            .from('applications')
            .select('id')
            .eq('property_id', propertyId);

        const appIds = apps?.map(a => a.id) || [];

        // 2. Cascade Delete: Logs for Applications
        if (appIds.length > 0) {
            await supabase.from('activity_log').delete().in('entity_id', appIds).eq('entity_type', 'application');
            // 3. Cascade Delete: Applications
            await supabase.from('applications').delete().in('id', appIds);
        }

        // 4. Cascade Delete: Logs for Property
        await supabase.from('activity_log').delete().eq('entity_id', propertyId).eq('entity_type', 'property');

        // 5. Delete Property
        const { error } = await supabase
            .from('properties')
            .delete()
            .eq('id', propertyId);

        if (error) {
            console.error('[deletePropertyAction] Error deleting property:', error);
            throw new Error(error.message);
        }

        console.log('[deletePropertyAction] Deletion successful.');

        // 6. Purge Cache
        revalidatePath('/dashboard');
        revalidatePath('/areas');
        revalidatePath(`/properties/${propertyId}`); // In case user is on details page

        return { success: true };

    } catch (error: any) {
        console.error('[deletePropertyAction] Failed:', error);
        return { success: false, error: error.message };
    }
}

export async function updatePropertyAction(propertyId: string, formData: any) {
    const supabase = await createClient();

    try {
        console.log(`[updatePropertyAction] Updating: ${propertyId}`, formData);

        const { error } = await supabase
            .from('properties')
            .update(formData)
            .eq('id', propertyId);

        if (error) {
            console.error('[updatePropertyAction] Error updating:', error);
            throw new Error(error.message);
        }

        // Validate Paths
        revalidatePath('/dashboard');
        revalidatePath('/areas');
        revalidatePath(`/properties/${propertyId}`);

        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
