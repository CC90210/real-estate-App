'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deletePropertyAction(propertyId: string) {
    const supabase = await createClient();

    try {
        console.log(`[deletePropertyAction] Starting cascade deletion for: ${propertyId}`);

        // 1. Delete related showings
        const { error: showingsError } = await supabase
            .from('showings')
            .delete()
            .eq('property_id', propertyId);

        if (showingsError) {
            console.warn('[deletePropertyAction] Showings cleanup (non-fatal):', showingsError.message);
        }

        // 2. Delete related invoices
        const { error: invoicesError } = await supabase
            .from('invoices')
            .delete()
            .eq('property_id', propertyId);

        if (invoicesError) {
            console.warn('[deletePropertyAction] Invoices cleanup (non-fatal):', invoicesError.message);
        }

        // 3. Delete related documents
        const { error: docsError } = await supabase
            .from('documents')
            .delete()
            .eq('property_id', propertyId);

        if (docsError) {
            console.warn('[deletePropertyAction] Documents cleanup (non-fatal):', docsError.message);
        }

        // 4. Fetch related applications
        const { data: apps } = await supabase
            .from('applications')
            .select('id')
            .eq('property_id', propertyId);

        const appIds = apps?.map(a => a.id) || [];

        // 5. Cascade Delete: Activity logs for Applications
        if (appIds.length > 0) {
            await supabase.from('activity_log').delete().in('entity_id', appIds).eq('entity_type', 'application');
            // 6. Cascade Delete: Applications
            await supabase.from('applications').delete().in('id', appIds);
            console.log(`[deletePropertyAction] Deleted ${appIds.length} related applications`);
        }

        // 7. Cascade Delete: Activity logs for Property
        await supabase.from('activity_log').delete().eq('entity_id', propertyId).eq('entity_type', 'property');

        // 8. Delete the Property
        const { error } = await supabase
            .from('properties')
            .delete()
            .eq('id', propertyId);

        if (error) {
            console.error('[deletePropertyAction] Error deleting property:', error);
            throw new Error(error.message);
        }

        console.log('[deletePropertyAction] Cascade deletion successful.');

        // 9. Purge Cache - all relevant paths
        revalidatePath('/dashboard');
        revalidatePath('/areas');
        revalidatePath('/properties');
        revalidatePath('/applications');
        revalidatePath('/invoices');
        revalidatePath('/showings');
        revalidatePath(`/properties/${propertyId}`);

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

        // Clean up the formData - ensure proper types
        const cleanData = {
            ...formData,
            rent: formData.rent !== undefined ? Number(formData.rent) : undefined,
            deposit: formData.deposit !== undefined ? Number(formData.deposit) : undefined,
            bedrooms: formData.bedrooms !== undefined ? Number(formData.bedrooms) : undefined,
            bathrooms: formData.bathrooms !== undefined ? Number(formData.bathrooms) : undefined,
            square_feet: formData.square_feet !== undefined ? Number(formData.square_feet) : undefined,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('properties')
            .update(cleanData)
            .eq('id', propertyId);

        if (error) {
            console.error('[updatePropertyAction] Error updating:', error);
            throw new Error(error.message);
        }

        // Revalidate relevant paths
        revalidatePath('/dashboard');
        revalidatePath('/areas');
        revalidatePath('/properties');
        revalidatePath(`/properties/${propertyId}`);

        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
