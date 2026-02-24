/**
 * Storage Cleanup Utility
 * Prevents browser storage from exceeding ~10MB by removing bloated items.
 * localStorage should ONLY store: user preferences, theme, last-viewed tab, sidebar state.
 * Full query results belong in React Query (in-memory), never localStorage.
 */

const ALLOWED_KEY_PREFIXES = [
    'supabase.auth',
    'sb-',               // Supabase auth keys
    'theme',
    'sidebar-collapsed',
    'last-tab',
    'cookie',
]

const MAX_VALUE_SIZE = 50_000 // 50KB per key

export function cleanupStorage() {
    if (typeof window === 'undefined') return

    try {
        const keysToRemove: string[] = []

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (!key) continue

            const isAllowed = ALLOWED_KEY_PREFIXES.some(prefix => key.startsWith(prefix))
            if (isAllowed) continue

            const value = localStorage.getItem(key)
            if (value && value.length > MAX_VALUE_SIZE) {
                keysToRemove.push(key)
            }
        }

        keysToRemove.forEach(key => {
            console.info(`[Storage Cleanup] Removing oversized key: ${key} (${(localStorage.getItem(key)?.length || 0 / 1024).toFixed(1)}KB)`)
            localStorage.removeItem(key)
        })

        if (keysToRemove.length > 0) {
            console.info(`[Storage Cleanup] Removed ${keysToRemove.length} oversized items`)
        }
    } catch (e) {
        // Silently fail — storage APIs can throw in certain privacy modes
    }
}

export function cleanupIndexedDB() {
    if (typeof window === 'undefined' || !window.indexedDB) return

    try {
        indexedDB.databases?.().then(dbs => {
            dbs.forEach(db => {
                if (db.name && !db.name.includes('supabase') && !db.name.includes('sb-')) {
                    indexedDB.deleteDatabase(db.name)
                }
            })
        }).catch(() => { })
    } catch {
        // indexedDB.databases() not supported in all browsers
    }
}
