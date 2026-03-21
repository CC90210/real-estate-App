import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
    test('login page loads correctly', async ({ page }) => {
        await page.goto('/login')
        await expect(page).toHaveTitle(/PropFlow|Login/i)

        // Check form fields exist
        await expect(page.getByPlaceholder('you@company.com')).toBeVisible()
        await expect(page.getByPlaceholder('••••••••')).toBeVisible()

        // Check submit button
        await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

        // Check links
        await expect(page.getByRole('link', { name: /create account/i })).toBeVisible()
        await expect(page.getByRole('link', { name: /forgot/i })).toBeVisible()
    })

    test('shows error on invalid credentials', async ({ page }) => {
        await page.goto('/login')
        await page.getByPlaceholder('you@company.com').fill('invalid@test.com')
        await page.getByPlaceholder('••••••••').fill('wrongpassword')
        await page.getByRole('button', { name: /sign in/i }).click()

        // Should stay on login page (not crash or redirect to dashboard)
        await page.waitForTimeout(3000)
        expect(page.url()).toContain('/login')
    })

    test('unauthenticated user redirected from dashboard to login', async ({ page }) => {
        await page.goto('/dashboard')
        // Should redirect to login
        await page.waitForURL(/\/login/, { timeout: 10_000 })
        await expect(page.getByPlaceholder('you@company.com')).toBeVisible()
    })

    test('signup page loads correctly', async ({ page }) => {
        await page.goto('/signup')
        // Signup form should have a submit button (Start Free Trial)
        await expect(page.getByRole('button', { name: /start free trial|create|sign up/i })).toBeVisible()
    })
})
