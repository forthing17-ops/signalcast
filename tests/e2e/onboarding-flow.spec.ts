import { test, expect } from '@playwright/test'

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - you'll need to implement this based on your auth setup
    // For now, we'll assume user is already authenticated
    await page.goto('/app/onboarding')
  })

  test('completes full onboarding flow', async ({ page }) => {
    // Step 1: Professional Context
    await expect(page.getByText('Tell us about your professional background')).toBeVisible()
    
    await page.fill('input[placeholder*="Software Engineer"]', 'Senior Full Stack Developer')
    await page.selectOption('select', 'Software/Technology')
    await page.selectOption('select', 'Medium (51-200)')
    await page.selectOption('select', 'Senior (6-10 years)')
    
    await page.click('text=Continue')

    // Step 2: Tech Interests
    await expect(page.getByText('What technologies interest you?')).toBeVisible()
    
    await page.click('text=React')
    await page.click('text=TypeScript')
    await page.click('text=Node.js')
    
    await page.fill('input[placeholder*="Search for specific technologies"]', 'Next.js')
    await page.click('text=Next.js')
    
    await page.click('text=Continue')

    // Step 3: Tool Stack
    await expect(page.getByText('What\'s your current tech stack?')).toBeVisible()
    
    await page.click('text=JavaScript')
    await page.click('text=PostgreSQL')
    await page.click('text=Docker')
    
    await page.click('text=Continue')

    // Step 4: Content Preferences
    await expect(page.getByText('How would you like to receive content?')).toBeVisible()
    
    await page.click('text=Daily')
    await page.click('text=Detailed analysis')
    await page.click('text=Articles')
    await page.click('text=Videos')
    
    await page.click('text=Continue')

    // Step 5: Curiosity Areas
    await expect(page.getByText('What emerging topics spark your curiosity?')).toBeVisible()
    
    await page.click('text=WebAssembly (WASM)')
    await page.click('text=Edge Computing')
    await page.fill('input[placeholder*="Sustainable Tech"]', 'Green Computing')
    await page.click('text=Add')
    
    await page.click('text=Complete Setup')

    // Should redirect to main app
    await expect(page).toHaveURL('/app')
  })

  test('allows skipping steps', async ({ page }) => {
    // Step 1: Skip professional context
    await page.click('text=Skip for now')
    
    // Should move to tech interests
    await expect(page.getByText('What technologies interest you?')).toBeVisible()
    
    // Skip tech interests
    await page.click('text=Skip for now')
    
    // Continue skipping until completion
    await page.click('text=Skip for now') // Tool stack
    await page.click('text=Skip for now') // Content preferences
    
    // Last step
    await page.click('text=Complete Setup')
    
    await expect(page).toHaveURL('/app')
  })

  test('persists progress when navigating back and forth', async ({ page }) => {
    // Fill first step
    await page.fill('input[placeholder*="Software Engineer"]', 'Product Manager')
    await page.selectOption('select', 'Healthcare')
    await page.click('text=Continue')

    // Go to second step and back
    await page.click('text=Back')
    
    // Check if data persisted
    await expect(page.getByDisplayValue('Product Manager')).toBeVisible()
    await expect(page.getByDisplayValue('Healthcare')).toBeVisible()
  })

  test('shows progress correctly', async ({ page }) => {
    // Check initial progress
    await expect(page.getByText('Step 1 of 5')).toBeVisible()
    
    // Move to next step
    await page.fill('input[placeholder*="Software Engineer"]', 'Developer')
    await page.click('text=Continue')
    
    // Check updated progress
    await expect(page.getByText('Step 2 of 5')).toBeVisible()
  })

  test('validates required fields', async ({ page }) => {
    // Try to continue without filling required role field
    const continueButton = page.getByText('Continue')
    await expect(continueButton).toBeDisabled()
    
    // Fill role field
    await page.fill('input[placeholder*="Software Engineer"]', 'Developer')
    
    // Continue button should be enabled
    await expect(continueButton).toBeEnabled()
  })

  test('handles custom inputs', async ({ page }) => {
    // Go to tech interests step
    await page.fill('input[placeholder*="Software Engineer"]', 'Developer')
    await page.click('text=Continue')
    
    // Add custom interest
    await page.fill('input[placeholder*="Rust, Deno"]', 'Bun')
    await page.click('text=Add')
    
    // Should see custom interest in selected list
    await expect(page.getByText('Bun ×')).toBeVisible()
  })

  test('redirects onboarded users away from onboarding', async ({ page }) => {
    // This test assumes user is already onboarded
    // You'll need to mock this state based on your implementation
    
    // Mock API response or database state to show user as onboarded
    await page.route('/api/user/profile', route => {
      route.fulfill({
        json: {
          success: true,
          data: { onboarded: true }
        }
      })
    })
    
    await page.goto('/app/onboarding')
    
    // Should redirect to main app
    await expect(page).toHaveURL('/app')
  })
})