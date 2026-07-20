import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve('src/lib/hooks/useUser.tsx'), 'utf8')

assert.doesNotMatch(
    source,
    /onAuthStateChange\(\s*async\s*\(/,
    'Supabase auth callbacks must return immediately; awaited client calls can hold the auth lock',
)
assert.match(
    source,
    /void fetchProfile\(session\.user\.id\)\.then/,
    'Profile loading should be deferred outside the auth callback',
)

console.log('Auth listener tests passed')
