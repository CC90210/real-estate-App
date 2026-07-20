import assert from 'node:assert/strict'
import { authErrorMessage, withTimeout } from '@/lib/auth-errors'

assert.equal(
    authErrorMessage(new Error('Failed to fetch')),
    'PropFlow authentication is temporarily unavailable. Please try again shortly.',
)
assert.equal(
    authErrorMessage(new Error('Invalid login credentials')),
    'Email or password is incorrect.',
)
assert.equal(
    authErrorMessage(new Error('Email rate limit exceeded')),
    'Too many attempts. Please wait a few minutes and try again.',
)

async function main() {
    await assert.rejects(
        withTimeout(new Promise(() => undefined), 5),
        /Authentication request timed out/,
    )

    console.log('Auth error tests passed')
}

void main()
