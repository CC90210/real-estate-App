import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
    test('home page sign-in link opens the login form', async ({ page }) => {
        await page.goto('/')
        await page.getByRole('link', { name: /sign in/i }).first().click()

        await expect(page).toHaveURL(/\/login$/)
        await expect(page.getByPlaceholder('you@company.com')).toBeVisible()
    })

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

        await expect(page.getByRole('alert').filter({
            hasText: /temporarily unavailable|email or password is incorrect/i,
        })).toContainText(
            /temporarily unavailable|email or password is incorrect/i,
            { timeout: 12_000 }
        )
        await expect(page).toHaveURL(/\/login/)
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

    test('requires a valid recovery session before accepting a new password', async ({ page }) => {
        await page.goto('/reset-password')

        await expect(page.getByText(/reset link is invalid or has expired/i)).toBeVisible({ timeout: 10_000 })
        await expect(page.getByRole('button', { name: /update password/i })).toHaveCount(0)
    })
})
