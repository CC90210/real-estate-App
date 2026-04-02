import { createClient } from '@supabase/supabase-js'

function requireEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY' | 'SUPABASE_SERVICE_ROLE_KEY') {
    const value = process.env[name]
    if (!value) {
        throw new Error(`${name} is not configured`)
    }
    return value
}

const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabaseAnonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client with service role key
export function createServerClient() {
    return createClient(
        supabaseUrl,
        requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}
