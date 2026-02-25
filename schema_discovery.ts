import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function discover() {
    const tables = [
        'companies', 'profiles', 'properties', 'applications', 'invoices',
        'activity_log', 'leases', 'areas', 'automation_settings', 'social_accounts', 'social_posts'
    ];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table ${table} error:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`Table ${table} columns:`, Object.keys(data[0]).join(', '));
        } else {
            console.log(`Table ${table} is empty. Trying to get columns via a forced error or just empty.`);
            // If empty, we can't see columns via this method, but let's hope it's not.
        }
    }

    // What companies exist?
    const { data: companies } = await supabase.from('companies').select('id, name, subscription_plan, subscription_status');
    console.log('\nCompanies:', JSON.stringify(companies, null, 2));

    // What profiles exist?
    const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, role, company_id, is_super_admin');
    console.log('Profiles:', JSON.stringify(profiles, null, 2));

}

discover();
