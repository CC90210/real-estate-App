'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteBuildingAction(buildingId: string) {
    const supabase = await createClient();

    try {
        console.log(`[deleteBuildingAction] Deleting Building: ${buildingId}`);

        // Database CASCADE handles properties -> apps -> logs
        const { error } = await supabase
            .from('buildings')
            .delete()
            .eq('id', buildingId);

        if (error) {
            console.error('[deleteBuildingAction] Error:', error);
            throw new Error(error.message);
        }

        revalidatePath('/dashboard');
        revalidatePath('/areas');
        // If we are on the building page, we generally redirect away, handled by client component
        return { success: true };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
