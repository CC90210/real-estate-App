import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const route = readFileSync(join(process.cwd(), 'src', 'app', 'api', 'auth', 'platform-signup', 'route.ts'), 'utf8')
const schema = readFileSync(
  join(process.cwd(), 'supabase', 'migrations', '20260719000000_initial_schema.sql'),
  'utf8',
)

assert.match(
  route,
  /skip_profile_provisioning:\s*true/,
  'platform signup must suppress the generic auth trigger before creating its invitation-scoped company',
)
assert.match(
  schema,
  /skip_profile_provisioning[\s\S]{0,120}= 'true'/,
  'the auth trigger must honor the platform-signup suppression marker',
)

console.log('Platform signup provisioning handshake passed')
