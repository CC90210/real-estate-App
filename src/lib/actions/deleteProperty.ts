
import { createClient } from '@/lib/supabase/client';

export const deleteProperty = async (propertyId: string) => {
    const supabase = createClient();

    try {
        console.log(`Starting deletion for property: ${propertyId}`);

        // 1. Fetch related applications
        const { data: apps, error: appsError } = await supabase
            .from('applications')
            .select('id')
            .eq('property_id', propertyId);

        if (appsError) {
            console.error('Error fetching applications:', appsError);
            throw new Error(`Failed to fetch related applications: ${appsError.message}`);
        }

        const appIds = apps?.map(a => a.id) || [];
        console.log(`Found ${appIds.length} related applications.`);

        // 2. Delete activity logs for related applications
        if (appIds.length > 0) {
            const { error: logsError } = await supabase
                .from('activity_log')
                .delete()
                .in('entity_id', appIds)
                .eq('entity_type', 'application');

            if (logsError) {
                console.error('Error deleting application activity logs:', logsError);
                // Continue anyway, this is cleanup
            }
        }

        // 3. Delete applications
        if (appIds.length > 0) {
            const { error: deleteAppsError } = await supabase
                .from('applications')
                .delete()
                .in('id', appIds);

            if (deleteAppsError) {
                console.error('Error deleting applications:', deleteAppsError);
                throw new Error(`Failed to delete related applications: ${deleteAppsError.message}`);
            }
            console.log('Deleted related applications.');
        }

        // 4. Delete activity logs for the property itself
        const { error: propLogsError } = await supabase
            .from('activity_log')
            .delete()
            .eq('entity_id', propertyId)
            .eq('entity_type', 'property');

        if (propLogsError) {
            console.error('Error deleting property activity logs:', propLogsError);
            // Continue anyway
        }

        // 5. Delete the property
        const { error: deletePropError } = await supabase
            .from('properties')
            .delete()
            .eq('id', propertyId);

        if (deletePropError) {
            console.error('Error deleting property:', deletePropError);
            throw new Error(`Failed to delete property: ${deletePropError.message}`);
        }

        console.log(`Successfully deleted property: ${propertyId}`);
        return { success: true };

    } catch (error: any) {
        console.error('Delete operation failed:', error);
        return { success: false, error: error.message };
    }
};
