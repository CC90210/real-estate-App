import Late from '@getlatedev/node'

function createLateClient() {
    const apiKey = process.env.LATE_API_KEY
    if (!apiKey || apiKey === 'sk_dummy_key_for_build_step') {
        // Return a proxy that throws on usage if key is missing
        return new Proxy({} as InstanceType<typeof Late>, {
            get(_, prop) {
                if (prop === 'then') return undefined
                throw new Error('LATE_API_KEY is not configured. Please add it to your environment variables.')
            },
        })
    }
    return new Late({ apiKey })
}

export const late = createLateClient()
