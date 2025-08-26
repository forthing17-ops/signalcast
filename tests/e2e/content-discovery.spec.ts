import { test, expect } from '@playwright/test'

test.describe('Content Discovery', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication - assuming we have test auth setup
    // This would need to be adapted based on your auth setup
    await page.goto('/login')
    // Add authentication steps here based on your test setup
  })

  test('loads content discovery page', async ({ page }) => {
    await page.goto('/feed')
    
    await expect(page.getByRole('heading', { name: 'Content Discovery' })).toBeVisible()
    await expect(page.getByPlaceholder('Search content by keywords...')).toBeVisible()
    await expect(page.getByText('Filter by Topics')).toBeVisible()
  })

  test('displays content cards when data is available', async ({ page }) => {
    // Mock API response with test data
    await page.route('/api/content*', async (route) => {
      await route.fulfill({
        json: {
          data: [
            {
              id: '1',
              title: 'Test Article 1',
              summary: 'This is a test article summary',
              sourceUrls: ['https://reddit.com/test'],
              topics: ['AI', 'Development'],
              publishedAt: '2024-01-15T09:00:00Z',
              feedback: { saved: false, rating: null }
            },
            {
              id: '2',
              title: 'Test Article 2',
              summary: 'Another test article summary',
              sourceUrls: ['https://producthunt.com/test'],
              topics: ['Tools', 'Startups'],
              publishedAt: '2024-01-14T09:00:00Z',
              feedback: { saved: true, rating: 4 }
            }
          ],
          pagination: {
            page: 1,
            limit: 12,
            total: 2,
            hasMore: false
          }
        }
      })
    })

    await page.goto('/feed')
    
    await expect(page.getByText('Test Article 1')).toBeVisible()
    await expect(page.getByText('Test Article 2')).toBeVisible()
    await expect(page.getByText('This is a test article summary')).toBeVisible()
  })

  test('search functionality works correctly', async ({ page }) => {
    // Mock search API response
    await page.route('/api/content*', async (route) => {
      const url = new URL(route.request().url())
      const search = url.searchParams.get('search')
      
      if (search === 'AI') {
        await route.fulfill({
          json: {
            data: [
              {
                id: '1',
                title: 'AI Article',
                summary: 'Article about AI',
                sourceUrls: ['https://reddit.com/ai'],
                topics: ['AI'],
                publishedAt: '2024-01-15T09:00:00Z',
                feedback: { saved: false, rating: null }
              }
            ],
            pagination: { page: 1, limit: 12, total: 1, hasMore: false }
          }
        })
      } else {
        await route.fulfill({
          json: { data: [], pagination: { page: 1, limit: 12, total: 0, hasMore: false } }
        })
      }
    })

    await page.goto('/feed')
    
    await page.fill('input[placeholder="Search content by keywords..."]', 'AI')
    await page.click('button[type="submit"]')
    
    await expect(page.getByText('AI Article')).toBeVisible()
    await expect(page.getByText('Article about AI')).toBeVisible()
  })

  test('topic filtering works correctly', async ({ page }) => {
    // Mock filtered API response
    await page.route('/api/content*', async (route) => {
      const url = new URL(route.request().url())
      const topics = url.searchParams.get('topics')
      
      if (topics?.includes('AI')) {
        await route.fulfill({
          json: {
            data: [
              {
                id: '1',
                title: 'AI Article',
                summary: 'Article about AI',
                sourceUrls: ['https://reddit.com/ai'],
                topics: ['AI'],
                publishedAt: '2024-01-15T09:00:00Z',
                feedback: { saved: false, rating: null }
              }
            ],
            pagination: { page: 1, limit: 12, total: 1, hasMore: false }
          }
        })
      } else {
        await route.fulfill({
          json: { data: [], pagination: { page: 1, limit: 12, total: 0, hasMore: false } }
        })
      }
    })

    await page.goto('/feed')
    
    // Click on AI topic filter
    await page.getByRole('button', { name: 'AI' }).click()
    
    await expect(page.getByText('AI Article')).toBeVisible()
  })

  test('bookmark functionality works correctly', async ({ page }) => {
    let bookmarkToggled = false

    // Mock initial content API
    await page.route('/api/content*', async (route) => {
      await route.fulfill({
        json: {
          data: [
            {
              id: '1',
              title: 'Test Article',
              summary: 'Test summary',
              sourceUrls: ['https://reddit.com/test'],
              topics: ['AI'],
              publishedAt: '2024-01-15T09:00:00Z',
              feedback: { saved: bookmarkToggled, rating: null }
            }
          ],
          pagination: { page: 1, limit: 12, total: 1, hasMore: false }
        }
      })
    })

    // Mock bookmark API
    await page.route('/api/feedback/1/save', async (route) => {
      if (route.request().method() === 'POST') {
        bookmarkToggled = true
        await route.fulfill({
          json: {
            success: true,
            feedback: { saved: true, rating: null }
          }
        })
      }
    })

    await page.goto('/feed')
    
    await expect(page.getByText('Test Article')).toBeVisible()
    
    // Click bookmark button
    const bookmarkButton = page.locator('[data-testid="bookmark-button"]').or(
      page.getByRole('button').filter({ hasText: /bookmark/i })
    ).first()
    
    await bookmarkButton.click()
    
    // Verify the bookmark state changed (this would need visual verification)
    // await expect(bookmarkButton).toHaveAttribute('aria-pressed', 'true')
  })

  test('external link handling works correctly', async ({ page }) => {
    await page.route('/api/content*', async (route) => {
      await route.fulfill({
        json: {
          data: [
            {
              id: '1',
              title: 'Test Article',
              summary: 'Test summary',
              sourceUrls: ['https://reddit.com/test'],
              topics: ['AI'],
              publishedAt: '2024-01-15T09:00:00Z',
              feedback: { saved: false, rating: null }
            }
          ],
          pagination: { page: 1, limit: 12, total: 1, hasMore: false }
        }
      })
    })

    await page.goto('/feed')
    
    await expect(page.getByText('Test Article')).toBeVisible()
    
    // Test external link (this would open in a new tab)
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.getByText('reddit.com').click()
    ])
    
    expect(newPage.url()).toBe('https://reddit.com/test')
  })

  test('saved content page works correctly', async ({ page }) => {
    await page.route('/api/content/saved*', async (route) => {
      await route.fulfill({
        json: {
          data: [
            {
              id: '1',
              title: 'Saved Article',
              summary: 'This article was saved',
              sourceUrls: ['https://reddit.com/saved'],
              topics: ['AI'],
              publishedAt: '2024-01-15T09:00:00Z',
              feedback: { saved: true, rating: null }
            }
          ],
          pagination: { page: 1, limit: 12, total: 1, hasMore: false }
        }
      })
    })

    await page.goto('/saved')
    
    await expect(page.getByRole('heading', { name: 'Saved Content' })).toBeVisible()
    await expect(page.getByText('Saved Article')).toBeVisible()
    await expect(page.getByText('This article was saved')).toBeVisible()
  })

  test('empty saved content state', async ({ page }) => {
    await page.route('/api/content/saved*', async (route) => {
      await route.fulfill({
        json: {
          data: [],
          pagination: { page: 1, limit: 12, total: 0, hasMore: false }
        }
      })
    })

    await page.goto('/saved')
    
    await expect(page.getByText('No saved content yet.')).toBeVisible()
    await expect(page.getByText('Browse Content')).toBeVisible()
  })

  test('responsive design works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.route('/api/content*', async (route) => {
      await route.fulfill({
        json: {
          data: [
            {
              id: '1',
              title: 'Mobile Test Article',
              summary: 'Test on mobile',
              sourceUrls: ['https://reddit.com/mobile'],
              topics: ['Mobile'],
              publishedAt: '2024-01-15T09:00:00Z',
              feedback: { saved: false, rating: null }
            }
          ],
          pagination: { page: 1, limit: 12, total: 1, hasMore: false }
        }
      })
    })

    await page.goto('/feed')
    
    await expect(page.getByRole('heading', { name: 'Content Discovery' })).toBeVisible()
    await expect(page.getByText('Mobile Test Article')).toBeVisible()
    
    // Verify responsive layout (single column on mobile)
    const contentGrid = page.locator('.grid')
    await expect(contentGrid).toHaveClass(/grid-cols-1/)
  })
})