'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function deleteAreaAction(areaId: string) {
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

        // The database handles cascading deletes (Buildings -> Properties -> Apps -> Logs)
        // company_id scope ensures user can only delete their own areas
        const { error } = await supabase
            .from('areas')
            .delete()
            .eq('id', areaId)
            .eq('company_id', profile.company_id);

        if (error) {
            console.error('[deleteAreaAction] Error:', error);
            return { success: false, error: 'Failed to delete area' };
        }

        revalidatePath('/dashboard');
        revalidatePath('/areas');
        return { success: true };

    } catch (error: any) {
        return { success: false, error: 'Failed to delete area' };
    }
}

export async function updateAreaAction(areaId: string, formData: any) {
    const supabase = await createClient();

    // Logic for updating area details (future proofing)
    return { success: true };
}
