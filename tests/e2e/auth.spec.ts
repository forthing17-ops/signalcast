import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should redirect to login page when accessing protected route', async ({ page }) => {
    await page.goto('/app')
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*auth\/login/)
    await expect(page.locator('h2')).toContainText('Sign in to SignalCast')
  })

  test('should show login form elements', async ({ page }) => {
    await page.goto('/auth/login')
    
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Sign in')
    await expect(page.locator('button[type="button"]')).toContainText('Sign up')
  })

  test('should show validation for empty form submission', async ({ page }) => {
    await page.goto('/auth/login')
    
    await page.click('button[type="submit"]')
    
    // HTML5 validation should prevent form submission
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveAttribute('required')
  })
})