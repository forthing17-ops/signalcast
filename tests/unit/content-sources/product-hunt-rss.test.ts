import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProductHuntRSSClient } from '@/lib/content-sources/product-hunt-rss';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('ProductHuntRSSClient', () => {
  let client: ProductHuntRSSClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ProductHuntRSSClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize successfully', () => {
      expect(client).toBeInstanceOf(ProductHuntRSSClient);
    });

    it('should work without API key', () => {
      expect(() => new ProductHuntRSSClient()).not.toThrow();
    });
  });

  describe('fetchLatestProducts', () => {
    const mockRSSResponse = {
      status: 'ok',
      feed: {
        title: 'Product Hunt',
        description: 'Latest products from Product Hunt',
      },
      items: [
        {
          title: 'SuperApp - The best productivity tool ever',
          description: '<p>SuperApp helps you manage tasks with 25 upvotes and 8 comments</p>',
          link: 'https://www.producthunt.com/posts/superapp',
          pubDate: '2025-08-25T10:00:00Z',
          guid: 'superapp-123',
          categories: ['Developer Tools', 'Productivity'],
        },
        {
          title: 'DesignMaster - Create stunning designs',
          description: '<p>Professional design tool with 50 upvotes and 15 comments</p>',
          link: 'https://www.producthunt.com/posts/designmaster',
          pubDate: '2025-08-25T09:00:00Z',
          guid: 'designmaster-456',
          categories: ['Design Tools'],
        },
      ],
    };

    it('should fetch and transform RSS products successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRSSResponse),
      });

      const products = await client.fetchLatestProducts({ count: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.rss2json.com'),
        undefined
      );
      expect(products).toHaveLength(2);
      
      const product = products[0];
      expect(product).toMatchObject({
        id: 'superapp',
        name: 'SuperApp',
        tagline: 'The best productivity tool ever',
        url: 'https://www.producthunt.com/posts/superapp',
        votesCount: 25,
        commentsCount: 8,
        categories: ['Developer Tools', 'Productivity'],
      });
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(client.fetchLatestProducts()).rejects.toThrow(
        'RSS2JSON API request failed: 500'
      );
    });

    it('should handle invalid API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'error' }),
      });

      await expect(client.fetchLatestProducts()).rejects.toThrow(
        'RSS2JSON API returned error status'
      );
    });

    it('should respect count parameter', async () => {
      const limitedResponse = {
        ...mockRSSResponse,
        items: [mockRSSResponse.items[0]],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(limitedResponse),
      });

      await client.fetchLatestProducts({ count: 1 });

      const call = mockFetch.mock.calls[0];
      const url = new URL(call[0]);
      expect(url.searchParams.get('count')).toBe('1');
    });

    it('should include API key when provided', async () => {
      vi.stubEnv('RSS2JSON_API_KEY', 'test_api_key');
      const clientWithKey = new ProductHuntRSSClient();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRSSResponse),
      });

      await clientWithKey.fetchLatestProducts();

      const call = mockFetch.mock.calls[0];
      const url = new URL(call[0]);
      expect(url.searchParams.get('api_key')).toBe('test_api_key');
    });
  });

  describe('fetchRelevantProducts', () => {
    const mockProducts = [
      {
        id: 'js-tool',
        name: 'JavaScript Helper',
        tagline: 'Best JS development tool',
        description: 'A tool for JavaScript developers to write better code',
        url: 'https://example.com/js-tool',
        votesCount: 100,
        commentsCount: 20,
        publishedAt: '2025-08-25T10:00:00Z',
        categories: ['Developer Tools'],
      },
      {
        id: 'design-app',
        name: 'Design Studio',
        tagline: 'Create amazing designs',
        description: 'Professional design application for artists',
        url: 'https://example.com/design-app',
        votesCount: 50,
        commentsCount: 10,
        publishedAt: '2025-08-25T09:00:00Z',
        categories: ['Design Tools'],
      },
      {
        id: 'random-game',
        name: 'Fun Game',
        tagline: 'Entertaining game',
        description: 'Just a fun game to play',
        url: 'https://example.com/random-game',
        votesCount: 30,
        commentsCount: 5,
        publishedAt: '2025-08-25T08:00:00Z',
        categories: ['Games'],
      },
    ];

    beforeEach(() => {
      // Mock the fetchLatestProducts method
      vi.spyOn(client, 'fetchLatestProducts').mockResolvedValue(mockProducts);
    });

    it('should filter products based on user interests', async () => {
      const relevantProducts = await client.fetchRelevantProducts(
        ['javascript', 'development'],
        ['react', 'node'],
        { count: 10 }
      );

      expect(relevantProducts).toHaveLength(1);
      expect(relevantProducts[0].name).toBe('JavaScript Helper');
    });

    it('should filter products based on tech stack', async () => {
      const relevantProducts = await client.fetchRelevantProducts(
        [],
        ['design', 'ui'],
        { count: 10 }
      );

      expect(relevantProducts).toHaveLength(1);
      expect(relevantProducts[0].name).toBe('Design Studio');
    });

    it('should include products with relevant categories', async () => {
      const relevantProducts = await client.fetchRelevantProducts(
        [],
        [],
        { count: 10 }
      );

      // Should include products with tech-related categories
      expect(relevantProducts.length).toBeGreaterThan(0);
      const techProducts = relevantProducts.filter(p => 
        p.categories.some(cat => 
          ['Developer Tools', 'Design Tools'].includes(cat)
        )
      );
      expect(techProducts).toHaveLength(2);
    });

    it('should sort products by relevance score', async () => {
      const relevantProducts = await client.fetchRelevantProducts(
        ['javascript'],
        ['design'],
        { count: 10 }
      );

      expect(relevantProducts.length).toBeGreaterThan(1);
      // First product should have higher relevance score
      for (let i = 1; i < relevantProducts.length; i++) {
        expect(relevantProducts[i-1].relevanceScore).toBeGreaterThanOrEqual(
          relevantProducts[i].relevanceScore
        );
      }
    });

    it('should respect count limit', async () => {
      const relevantProducts = await client.fetchRelevantProducts(
        ['javascript', 'design'],
        [],
        { count: 1 }
      );

      expect(relevantProducts).toHaveLength(1);
    });
  });

  describe('isProductRelevant', () => {
    const testProduct = {
      id: 'test',
      name: 'React Dashboard',
      tagline: 'Build React applications faster',
      description: 'A tool for JavaScript developers using React framework',
      url: 'https://example.com',
      votesCount: 50,
      commentsCount: 10,
      publishedAt: '2025-08-25',
      categories: ['Developer Tools'],
    };

    it('should match user interests', () => {
      const clientAny = client as any;
      const isRelevant = clientAny.isProductRelevant(
        testProduct,
        ['react', 'javascript'],
        []
      );

      expect(isRelevant).toBe(true);
    });

    it('should match tech stack', () => {
      const clientAny = client as any;
      const isRelevant = clientAny.isProductRelevant(
        testProduct,
        [],
        ['react', 'javascript']
      );

      expect(isRelevant).toBe(true);
    });

    it('should match relevant categories', () => {
      const clientAny = client as any;
      const isRelevant = clientAny.isProductRelevant(
        testProduct,
        [],
        []
      );

      expect(isRelevant).toBe(true); // Has 'Developer Tools' category
    });

    it('should reject irrelevant products', () => {
      const irrelevantProduct = {
        ...testProduct,
        name: 'Cooking Recipe App',
        tagline: 'Find great recipes',
        description: 'Discover cooking recipes from around the world',
        categories: ['Food & Drink'],
      };

      const clientAny = client as any;
      const isRelevant = clientAny.isProductRelevant(
        irrelevantProduct,
        ['programming'],
        ['react']
      );

      expect(isRelevant).toBe(false);
    });
  });

  describe('calculateRelevanceScore', () => {
    const testProduct = {
      id: 'test',
      name: 'JavaScript React Tool',
      tagline: 'Build React apps faster',
      description: 'A powerful JavaScript framework tool for React developers',
      url: 'https://example.com',
      votesCount: 100,
      commentsCount: 20,
      publishedAt: '2025-08-25',
      categories: ['Developer Tools', 'Productivity'],
    };

    it('should score interest matches', () => {
      const clientAny = client as any;
      const score = clientAny.calculateRelevanceScore(
        testProduct,
        ['javascript', 'react'],
        []
      );

      expect(score).toBeGreaterThan(10); // Should get points for interests
    });

    it('should score tech stack matches', () => {
      const clientAny = client as any;
      const score = clientAny.calculateRelevanceScore(
        testProduct,
        [],
        ['javascript', 'react']
      );

      expect(score).toBeGreaterThan(10); // Should get points for tech stack
    });

    it('should score engagement', () => {
      const clientAny = client as any;
      const score = clientAny.calculateRelevanceScore(
        testProduct,
        [],
        []
      );

      expect(score).toBeGreaterThan(0); // Should get points for engagement
    });

    it('should give higher scores for better matches', () => {
      const clientAny = client as any;
      
      const highScore = clientAny.calculateRelevanceScore(
        testProduct,
        ['javascript', 'react'],
        ['react', 'javascript']
      );

      const lowScore = clientAny.calculateRelevanceScore(
        testProduct,
        [],
        []
      );

      expect(highScore).toBeGreaterThan(lowScore);
    });
  });

  describe('stripHtml', () => {
    it('should remove HTML tags', () => {
      const clientAny = client as any;
      const stripped = clientAny.stripHtml('<p>Hello <strong>world</strong>!</p>');
      expect(stripped).toBe('Hello world!');
    });

    it('should decode HTML entities', () => {
      const clientAny = client as any;
      const stripped = clientAny.stripHtml('Hello &amp; goodbye &lt;test&gt;');
      expect(stripped).toBe('Hello & goodbye <test>');
    });

    it('should handle complex HTML', () => {
      const clientAny = client as any;
      const html = '<div class="content"><p>This is a <a href="#">link</a> with 50 upvotes &amp; 10 comments</p></div>';
      const stripped = clientAny.stripHtml(html);
      expect(stripped).toBe('This is a link with 50 upvotes & 10 comments');
    });
  });
});