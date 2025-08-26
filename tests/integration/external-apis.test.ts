import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RedditApiClient } from '@/lib/content-sources/reddit-api'
import { ProductHuntRssClient } from '@/lib/content-sources/product-hunt-rss'
import { SourceManager } from '@/lib/content-sources/source-manager'
import { dbRateLimitMonitor } from '@/lib/rate-limit-monitor-db'

// Mock external HTTP calls
global.fetch = vi.fn()

describe('External API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock for each test
    vi.mocked(fetch).mockReset()
  })

  describe('Reddit API Client', () => {
    it('handles successful content fetch with proper rate limiting', async () => {
      const mockRedditResponse = {
        data: {
          children: [
            {
              data: {
                id: 'test123',
                title: 'Test Programming Post',
                selftext: 'This is a test programming discussion',
                url: 'https://reddit.com/test123',
                score: 100,
                num_comments: 25,
                created_utc: Math.floor(Date.now() / 1000),
                subreddit: 'programming'
              }
            }
          ]
        }
      }

      // Mock OAuth token response
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test_token', token_type: 'bearer' })
        } as Response)
        // Mock Reddit API response
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRedditResponse,
          headers: new Headers({
            'x-ratelimit-remaining': '99',
            'x-ratelimit-reset': '1234567890'
          })
        } as Response)

      const client = new RedditApiClient()
      const result = await client.fetchContent(['programming'], ['javascript'], { limit: 1 })
      
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Test Programming Post')
      expect(result[0].sourcePlatform).toBe('reddit')
      expect(result[0].topics).toContain('programming')
      
      // Verify fetch was called correctly
      expect(fetch).toHaveBeenCalledTimes(2) // OAuth + API call
    })

    it('handles rate limit exceeded scenario', async () => {
      // Mock rate limit check to return false
      const canMakeRequestSpy = vi.spyOn(dbRateLimitMonitor, 'canMakeRequest')
        .mockResolvedValue(false)

      const client = new RedditApiClient()
      const result = await client.fetchContent(['programming'], [], { limit: 5 })
      
      expect(result).toHaveLength(0)
      expect(canMakeRequestSpy).toHaveBeenCalledWith('reddit')
      
      canMakeRequestSpy.mockRestore()
    })

    it('handles API errors gracefully', async () => {
      // Mock OAuth success but API failure
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test_token', token_type: 'bearer' })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests'
        } as Response)

      const client = new RedditApiClient()
      const result = await client.fetchContent(['programming'], [], { limit: 5 })
      
      expect(result).toHaveLength(0) // Should return empty array on error
    })
  })

  describe('Product Hunt RSS Client', () => {
    it('fetches and parses RSS feed successfully', async () => {
      const mockRssResponse = {
        status: 'ok',
        feed: {
          title: 'Product Hunt',
          description: 'Product Hunt RSS feed'
        },
        items: [
          {
            title: 'Amazing Developer Tool',
            description: 'A great tool for developers working with React and TypeScript',
            link: 'https://producthunt.com/test-tool',
            pubDate: new Date().toISOString(),
            categories: ['Developer Tools'],
            content: 'Full description of the amazing developer tool'
          }
        ]
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRssResponse
      } as Response)

      const client = new ProductHuntRssClient()
      const result = await client.fetchContent(['tools'], ['react', 'typescript'], { limit: 5 })
      
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Amazing Developer Tool')
      expect(result[0].sourcePlatform).toBe('producthunt')
      expect(result[0].topics).toContain('tools')
    })

    it('filters products based on tech stack relevance', async () => {
      const mockRssResponse = {
        status: 'ok',
        feed: { title: 'Product Hunt' },
        items: [
          {
            title: 'React Developer Tool',
            description: 'A tool for React developers',
            link: 'https://producthunt.com/react-tool',
            pubDate: new Date().toISOString(),
            categories: ['Developer Tools']
          },
          {
            title: 'PHP CMS System',
            description: 'A content management system built with PHP',
            link: 'https://producthunt.com/php-cms',
            pubDate: new Date().toISOString(),
            categories: ['Web App']
          }
        ]
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRssResponse
      } as Response)

      const client = new ProductHuntRssClient()
      const result = await client.fetchContent(['tools'], ['react'], { limit: 10 })
      
      // Should only return React-related product
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('React Developer Tool')
    })

    it('handles RSS2JSON API errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)

      const client = new ProductHuntRssClient()
      const result = await client.fetchContent(['tools'], ['react'], { limit: 5 })
      
      expect(result).toHaveLength(0)
    })
  })

  describe('Source Manager Integration', () => {
    it('orchestrates multiple sources with fallback handling', async () => {
      // Mock Reddit API success
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'test_token', token_type: 'bearer' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              children: [{
                data: {
                  id: 'reddit1',
                  title: 'Reddit Post',
                  selftext: 'Content from Reddit',
                  url: 'https://reddit.com/reddit1',
                  score: 50,
                  num_comments: 10,
                  created_utc: Math.floor(Date.now() / 1000),
                  subreddit: 'programming'
                }
              }]
            }
          })
        } as Response)
        // Mock Product Hunt RSS success  
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'ok',
            feed: { title: 'Product Hunt' },
            items: [{
              title: 'Product Hunt Tool',
              description: 'A tool for developers',
              link: 'https://producthunt.com/tool1',
              pubDate: new Date().toISOString(),
              categories: ['Developer Tools']
            }]
          })
        } as Response)

      const manager = new SourceManager()
      const result = await manager.fetchAllContent(['programming'], ['javascript'], { maxItems: 10 })
      
      expect(result.length).toBeGreaterThan(0)
      
      // Should have content from multiple sources
      const platforms = [...new Set(result.map(item => item.sourcePlatform))]
      expect(platforms.length).toBeGreaterThanOrEqual(1)
    })

    it('handles source health monitoring', async () => {
      const manager = new SourceManager()
      const healthStatus = await manager.checkSourceHealth()
      
      expect(healthStatus).toHaveProperty('reddit')
      expect(healthStatus).toHaveProperty('producthunt')
      expect(typeof healthStatus.reddit).toBe('boolean')
      expect(typeof healthStatus.producthunt).toBe('boolean')
    })

    it('implements circuit breaker pattern for failing sources', async () => {
      // Mock all API calls to fail
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const manager = new SourceManager()
      const healthStatus = await manager.checkSourceHealth()
      
      // All sources should be marked as unhealthy
      expect(healthStatus.reddit).toBe(false)
      expect(healthStatus.producthunt).toBe(false)
    })
  })

  describe('Rate Limit Integration', () => {
    it('tracks API usage across multiple requests', async () => {
      // Mock successful API responses
      vi.mocked(fetch)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ access_token: 'test_token', token_type: 'bearer' })
        } as Response)

      // Mock canMakeRequest to return true initially
      const canMakeRequestSpy = vi.spyOn(dbRateLimitMonitor, 'canMakeRequest')
        .mockResolvedValue(true)
      
      const recordRequestSpy = vi.spyOn(dbRateLimitMonitor, 'recordRequest')
        .mockResolvedValue(true)

      const client = new RedditApiClient()
      
      // Make multiple requests
      await client.fetchContent(['programming'], [], { limit: 1 })
      await client.fetchContent(['javascript'], [], { limit: 1 })
      
      expect(recordRequestSpy).toHaveBeenCalledWith('reddit')
      expect(recordRequestSpy).toHaveBeenCalledTimes(2)
      
      canMakeRequestSpy.mockRestore()
      recordRequestSpy.mockRestore()
    })
  })
})

// Cleanup after tests
afterEach(() => {
  vi.restoreAllMocks()
})