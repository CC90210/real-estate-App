import assert from 'node:assert/strict'
import { isProtectedPath } from '@/lib/auth-routes'

for (const path of [
    '/dashboard',
    '/properties',
    '/properties/new',
    '/applicants',
    '/applications',
    '/settings/team',
    '/tenant/dashboard',
    '/landlord/dashboard',
]) {
    assert.equal(isProtectedPath(path), true, `${path} must require authentication`)
}

for (const path of ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/tour/public-token']) {
    assert.equal(isProtectedPath(path), false, `${path} must remain public`)
}

console.log('Route protection tests passed')
