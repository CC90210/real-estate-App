import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve('src/components/documents/DocumentGenerator.tsx'), 'utf8')

assert.doesNotMatch(
    source,
    /key=\{`(?:property|lease|showing|application)-\$\{profile\?\.id/,
    'Profile loading must not remount a form and erase in-progress input',
)
assert.match(
    source,
    /profileLoading\s*\?\s*\(/,
    'Document forms should wait for the one-time profile load before mounting',
)

console.log('Document generator tests passed')
