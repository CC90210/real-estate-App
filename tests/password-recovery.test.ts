import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isPasswordRecoveryRedirect } from '@/lib/password-recovery'

assert.equal(isPasswordRecoveryRedirect('PASSWORD_RECOVERY'), true)
assert.equal(isPasswordRecoveryRedirect('SIGNED_IN'), false)
assert.equal(isPasswordRecoveryRedirect(null), false)

const forgotPasswordSource = readFileSync(resolve('src/app/(auth)/forgot-password/page.tsx'), 'utf8')
const resetPasswordSource = readFileSync(resolve('src/app/(auth)/reset-password/page.tsx'), 'utf8')
const callbackSource = readFileSync(resolve('src/app/auth/callback/route.ts'), 'utf8')

assert.match(forgotPasswordSource, /auth\/callback\?next=\/reset-password/)
assert.doesNotMatch(resetPasswordSource, /exchangeCodeForSession|getSession/)
assert.match(callbackSource, /PASSWORD_RECOVERY_COOKIE/)
assert.match(
  callbackSource,
  /searchParams\.get\(['"]token_hash['"]\)/,
  'the server callback must accept the token hash emitted by recovery email templates',
)
assert.match(
  callbackSource,
  /verifyOtp\([\s\S]+type:\s*['"]recovery['"]/,
  'the server callback must exchange recovery token hashes for a session',
)

console.log('Password recovery tests passed')
