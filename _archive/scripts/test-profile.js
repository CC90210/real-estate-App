require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    const { data, error } = await supabase.from('profiles').select('company_id, is_super_admin, company:companies(id, name, subscription_plan)').limit(1);
    console.log(error ? error : JSON.stringify(data, null, 2));
}
run();
