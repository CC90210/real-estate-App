import { test, expect } from '@playwright/test'

// These tests verify that API routes respond correctly (not 500s).
// They don't require auth — they should return 401 for protected endpoints.

test.describe('API Route Health', () => {
    // API routes should return a non-500 status (401, 403, or 404 are all acceptable)
    const apiRoutes = [
        { method: 'GET' as const, path: '/api/applications' },
        { method: 'GET' as const, path: '/api/properties' },
        { method: 'GET' as const, path: '/api/documents' },
        { method: 'GET' as const, path: '/api/invoices' },
        { method: 'GET' as const, path: '/api/analytics' },
        { method: 'GET' as const, path: '/api/activity' },
        { method: 'POST' as const, path: '/api/social/connect', body: { platform: 'instagram' } },
        { method: 'POST' as const, path: '/api/applications', body: { applicant_name: 'Test' } },
        { method: 'GET' as const, path: '/api/applications/fake-id/screening-report' },
    ]

    for (const route of apiRoutes) {
        test(`${route.method} ${route.path} does not return 500`, async ({ request }) => {
            const res =
                route.method === 'POST'
                    ? await request.post(route.path, { data: route.body })
                    : await request.get(route.path)
            // Any non-5xx response means the route is healthy
            expect(res.status()).toBeLessThan(500)
        })
    }
})
