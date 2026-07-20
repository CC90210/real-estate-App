import assert from 'node:assert/strict'
import { normalizeAuthRedirect } from '@/lib/auth-routing'

assert.equal(normalizeAuthRedirect('/dashboard'), '/dashboard')
assert.equal(normalizeAuthRedirect('/properties/123?tab=documents'), '/properties/123?tab=documents')
assert.equal(normalizeAuthRedirect(null), '/dashboard')
assert.equal(normalizeAuthRedirect(''), '/dashboard')
assert.equal(normalizeAuthRedirect('https://evil.example'), '/dashboard')
assert.equal(normalizeAuthRedirect('//evil.example'), '/dashboard')
assert.equal(normalizeAuthRedirect('/\\evil.example'), '/dashboard')
assert.equal(normalizeAuthRedirect('/\\evil.example/steal'), '/dashboard')
assert.equal(normalizeAuthRedirect('/a/..//evil.example'), '/dashboard')
assert.equal(normalizeAuthRedirect('/features'), '/dashboard')
assert.equal(normalizeAuthRedirect('/login?redirect=/dashboard'), '/dashboard')
assert.equal(normalizeAuthRedirect('/signup'), '/dashboard')

console.log('Auth routing tests passed')
