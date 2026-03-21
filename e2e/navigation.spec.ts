import { test, expect } from '@playwright/test'

// These tests verify that pages load without crashing (no white screens).
// They run against the public-facing pages that don't require auth.

test.describe('Public Pages Load', () => {
    test('login page renders without errors', async ({ page }) => {
        const consoleErrors: string[] = []
        page.on('console', (msg) => {
            if (msg.type() === 'error') consoleErrors.push(msg.text())
        })

        await page.goto('/login')
        await expect(page.locator('body')).not.toBeEmpty()

        // No critical React errors
        const criticalErrors = consoleErrors.filter(
            (e) =>
                e.includes('Unhandled') ||
                e.includes('Cannot read properties') ||
                e.includes('is not a function')
        )
        expect(criticalErrors).toHaveLength(0)
    })

    test('signup page renders without errors', async ({ page }) => {
        await page.goto('/signup')
        await expect(page.locator('body')).not.toBeEmpty()
        // Should have a form
        await expect(page.locator('form').first()).toBeVisible()
    })

    test('forgot password page loads', async ({ page }) => {
        await page.goto('/forgot-password')
        await expect(page.locator('body')).not.toBeEmpty()
    })
})

test.describe('Dashboard Route Protection', () => {
    const protectedRoutes = [
        '/dashboard',
        '/properties',
        '/applications',
        '/approvals',
        '/documents',
        '/inspections',
        '/social',
        '/leases',
        '/invoices',
        '/settings',
        '/analytics',
        '/activity',
        '/maintenance',
        '/communication',
        '/automations',
        '/showings',
        '/areas',
    ]

    for (const route of protectedRoutes) {
        test(`${route} redirects to login when unauthenticated`, async ({ page }) => {
            await page.goto(route)
            // Should redirect to login within a reasonable time
            await page.waitForURL(/\/login/, { timeout: 15_000 })
        })
    }
})
