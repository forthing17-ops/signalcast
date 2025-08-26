import { test, expect } from '@playwright/test'

test.describe('Authentication and Profile Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
  })

  test('complete user registration and profile management flow', async ({ page }) => {
    // Navigate to signup
    await page.goto('/signup')
    
    // Verify signup page loads
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
    
    // Fill out signup form
    const uniqueEmail = `test${Date.now()}@example.com`
    await page.getByLabel(/email address/i).fill(uniqueEmail)
    await page.getByLabel(/display name/i).fill('Test User')
    await page.getByLabel('Password', { exact: true }).fill('StrongPass123')
    await page.getByLabel(/confirm password/i).fill('StrongPass123')
    
    // Submit signup form
    await page.getByRole('button', { name: /create account/i }).click()
    
    // Should show email verification message
    await expect(page.getByText(/check your email/i)).toBeVisible()
    await expect(page.getByText(/verification link/i)).toBeVisible()
    
    // Navigate back to login (simulating email verification step)
    await page.getByRole('link', { name: /return to login/i }).click()
    
    // Verify we're on the login page
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  })

  test('login form validation', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Try to submit empty form
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should show validation errors
    await expect(page.getByText(/please enter a valid email address/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()
    
    // Fill invalid email
    await page.getByLabel(/email address/i).fill('invalid-email')
    await page.getByLabel(/password/i).fill('password')
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should show email validation error
    await expect(page.getByText(/please enter a valid email address/i)).toBeVisible()
  })

  test('signup form validation', async ({ page }) => {
    await page.goto('/signup')
    
    // Try to submit empty form
    await page.getByRole('button', { name: /create account/i }).click()
    
    // Should show validation errors
    await expect(page.getByText(/please enter a valid email address/i)).toBeVisible()
    await expect(page.getByText(/display name is required/i)).toBeVisible()
    await expect(page.getByText(/password must be at least 8 characters/i)).toBeVisible()
    
    // Test password strength validation
    await page.getByLabel(/email address/i).fill('test@example.com')
    await page.getByLabel(/display name/i).fill('Test User')
    await page.getByLabel('Password', { exact: true }).fill('weakpass')
    await page.getByLabel(/confirm password/i).fill('weakpass')
    await page.getByRole('button', { name: /create account/i }).click()
    
    // Should show password strength error
    await expect(page.getByText(/password must contain at least one uppercase letter/i)).toBeVisible()
    
    // Test password confirmation
    await page.getByLabel('Password', { exact: true }).fill('StrongPass123')
    await page.getByLabel(/confirm password/i).fill('DifferentPass123')
    await page.getByRole('button', { name: /create account/i }).click()
    
    // Should show password mismatch error
    await expect(page.getByText(/passwords don't match/i)).toBeVisible()
  })

  test('password reset flow', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Click forgot password link
    await page.getByRole('link', { name: /forgot your password/i }).click()
    
    // Should be on reset password page
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
    
    // Test form validation
    await page.getByRole('button', { name: /send reset link/i }).click()
    await expect(page.getByText(/please enter a valid email address/i)).toBeVisible()
    
    // Fill valid email
    await page.getByLabel(/email address/i).fill('test@example.com')
    await page.getByRole('button', { name: /send reset link/i }).click()
    
    // Should show success message
    await expect(page.getByText(/check your email/i)).toBeVisible()
    await expect(page.getByText(/password reset link/i)).toBeVisible()
    
    // Should have return to login button
    await expect(page.getByRole('link', { name: /return to login/i })).toBeVisible()
  })

  test('navigation between auth pages', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Navigate to signup
    await page.getByRole('link', { name: /create one/i }).click()
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
    
    // Navigate back to login
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    
    // Navigate to password reset
    await page.getByRole('link', { name: /forgot your password/i }).click()
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
    
    // Navigate back to login from reset
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  })

  test('responsive design on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/signup')
    
    // Form should be responsive
    const card = page.locator('[role="main"], .max-w-md').first()
    await expect(card).toBeVisible()
    
    // All form elements should be visible and accessible
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/display name/i)).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByLabel(/confirm password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
    
    // Links should be clickable
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('loading states and form submission', async ({ page }) => {
    await page.goto('/auth/login')
    
    // Fill form
    await page.getByLabel(/email address/i).fill('test@example.com')
    await page.getByLabel(/password/i).fill('password123')
    
    // Submit form and check loading state (this will fail auth but we can test the loading state)
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should show loading state briefly
    await expect(page.getByRole('button', { name: /signing in/i })).toBeVisible()
    
    // Should eventually show error (since we don't have valid test credentials)
    await expect(page.getByText(/invalid/i).or(page.getByText(/error/i))).toBeVisible({ timeout: 10000 })
  })

  test('input sanitization and security', async ({ page }) => {
    await page.goto('/signup')
    
    // Try to inject script in display name
    await page.getByLabel(/display name/i).fill('<script>alert("xss")</script>')
    await page.getByLabel(/email address/i).fill('test@example.com')
    await page.getByLabel('Password', { exact: true }).fill('StrongPass123')
    await page.getByLabel(/confirm password/i).fill('StrongPass123')
    
    // The value should be sanitized (script tags should not execute)
    const displayNameValue = await page.getByLabel(/display name/i).inputValue()
    expect(displayNameValue).not.toContain('<script>')
    
    // Page should not execute the script (no alert dialog)
    await page.getByRole('button', { name: /create account/i }).click()
    
    // If script was executed, there would be a dialog, but there shouldn't be
    await page.waitForTimeout(1000) // Give time for any script to execute
  })
})