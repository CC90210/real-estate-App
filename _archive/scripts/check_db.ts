import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
    const { data: props, error: propsErr } = await supabase.from('properties').select('id, company_id, status').limit(5);
    console.log('Properties:', props, propsErr);
    const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, full_name, company_id, role').limit(5);
    console.log('Profiles:', profiles, profErr);
    const { data: companies, error: compErr } = await supabase.from('companies').select('id, name').limit(5);
    console.log('Companies:', companies, compErr);
}
check();
