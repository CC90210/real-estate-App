import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=id,full_name,role,company_id`;
    try {
        const res = await fetch(url, {
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY as string,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
            }
        });
        console.log(res.status, res.statusText);
        const text = await res.text();
        console.log(text);
    } catch (err) {
        console.error(err);
    }
}
run();
