const AUTH_TIMEOUT_MESSAGE = 'Authentication request timed out. Please try again.'

export function authErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error)
    const normalized = message.toLowerCase()

    if (normalized.includes('failed to fetch') || normalized.includes('fetch failed')) {
        return 'PropFlow authentication is temporarily unavailable. Please try again shortly.'
    }

    if (normalized.includes('invalid login credentials')) {
        return 'Email or password is incorrect.'
    }

    if (normalized.includes('rate limit') || normalized.includes('too many')) {
        return 'Too many attempts. Please wait a few minutes and try again.'
    }

    if (normalized.includes('timed out')) {
        return AUTH_TIMEOUT_MESSAGE
    }

    return message || 'Sign-in failed. Please try again.'
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(AUTH_TIMEOUT_MESSAGE)), timeoutMs)
    })

    return Promise.race([promise, timeout]).finally(() => {
        if (timeoutId) clearTimeout(timeoutId)
    })
}
