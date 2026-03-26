'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function deleteBuildingAction(buildingId: string) {
    const supabase = await createClient();

    try {
        // Verify user is authenticated and get their company
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();

        if (!profile?.company_id) return { success: false, error: 'No company found' };

        // Database CASCADE handles properties -> apps -> logs
        // company_id scope ensures user can only delete their own buildings
        const { error } = await supabase
            .from('buildings')
            .delete()
            .eq('id', buildingId)
            .eq('company_id', profile.company_id);

        if (error) {
            console.error('[deleteBuildingAction] Error:', error);
            return { success: false, error: 'Failed to delete building' };
        }

        revalidatePath('/dashboard');
        revalidatePath('/areas');
        return { success: true };

    } catch (error: any) {
        return { success: false, error: 'Failed to delete building' };
    }
}
