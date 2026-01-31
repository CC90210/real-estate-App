'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteAreaAction(areaId: string) {
    const supabase = await createClient();

    try {
        console.log(`[deleteAreaAction] Deleting Area: ${areaId}`);

        // The database handles cascading deletes (Buildings -> Properties -> Apps -> Logs)
        const { error } = await supabase
            .from('areas')
            .delete()
            .eq('id', areaId);

        if (error) {
            console.error('[deleteAreaAction] Error:', error);
            throw new Error(error.message);
        }

        revalidatePath('/dashboard');
        revalidatePath('/areas');
        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateAreaAction(areaId: string, formData: any) {
    const supabase = await createClient();

    // Logic for updating area details (future proofing)
    return { success: true };
}
