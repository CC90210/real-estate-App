import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: '.env.local' });

async function discover() {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
    try {
        const res = await fetch(url);
        const spec = await res.json();

        // Output definitions
        const definitions = spec.definitions || {};
        let output = '';

        for (const [name, schema] of Object.entries(definitions)) {
            if (typeof schema === 'object' && schema !== null && 'properties' in schema) {
                output += `Table ${name} columns:\n`;
                const properties = (schema as any).properties;
                output += Object.keys(properties).join(', ') + '\n';
                output += '---\n';
            }
        }
        fs.writeFileSync('schema_output.txt', output, 'utf-8');
    } catch (err) {
        console.error('Error fetching OpenAPI spec:', err);
    }
}
discover();
