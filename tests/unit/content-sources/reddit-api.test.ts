import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RedditApiClient } from '@/lib/content-sources/reddit-api';

// Mock environment variables
vi.stubEnv('REDDIT_CLIENT_ID', 'test_client_id');
vi.stubEnv('REDDIT_CLIENT_SECRET', 'test_client_secret');
vi.stubEnv('REDDIT_USER_AGENT', 'TestAgent/1.0');

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

describe('RedditApiClient', () => {
  let client: RedditApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new RedditApiClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with environment variables', () => {
      expect(() => new RedditApiClient()).not.toThrow();
    });

    it('should throw error when credentials are missing', () => {
      vi.stubEnv('REDDIT_CLIENT_ID', '');
      vi.stubEnv('REDDIT_CLIENT_SECRET', '');
      
      expect(() => new RedditApiClient()).toThrow('Reddit API credentials not configured');
    });
  });

  describe('authentication', () => {
    it('should authenticate successfully', async () => {
      const mockAuthResponse = {
        access_token: 'test_token',
        token_type: 'bearer',
        expires_in: 3600,
        scope: 'read',
      };

      const mockSubredditResponse = {
        data: {
          children: [
            {
              data: {
                id: 'test123',
                title: 'Test Post',
                selftext: 'Test content',
                url: 'https://example.com',
                score: 100,
                num_comments: 10,
                created_utc: Date.now() / 1000,
                subreddit: 'programming',
                author: 'testuser',
                permalink: '/r/programming/comments/test123/',
              },
            },
          ],
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAuthResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSubredditResponse),
        });

      const posts = await client.fetchSubredditPosts('programming');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, 'https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': expect.stringContaining('Basic '),
          'User-Agent': 'TestAgent/1.0',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      expect(posts).toHaveLength(1);
      expect(posts[0]).toMatchObject({
        id: 'test123',
        title: 'Test Post',
        subreddit: 'programming',
      });
    });

    it('should handle authentication failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await expect(client.fetchSubredditPosts('programming')).rejects.toThrow(
        'Reddit authentication failed: 401'
      );
    });

    it('should reuse valid token', async () => {
      const mockAuthResponse = {
        access_token: 'test_token',
        token_type: 'bearer',
        expires_in: 3600,
        scope: 'read',
      };

      const mockSubredditResponse = {
        data: { children: [] },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAuthResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSubredditResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSubredditResponse),
        });

      // First call should authenticate
      await client.fetchSubredditPosts('programming');
      
      // Second call should reuse token
      await client.fetchSubredditPosts('webdev');

      // Should have called auth once and subreddit endpoints twice
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('fetchSubredditPosts', () => {
    beforeEach(() => {
      // Mock successful authentication
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test_token',
          token_type: 'bearer',
          expires_in: 3600,
          scope: 'read',
        }),
      });
    });

    it('should fetch posts with default options', async () => {
      const mockResponse = {
        data: {
          children: [
            {
              data: {
                id: 'post1',
                title: 'First Post',
                selftext: 'Content 1',
                url: 'https://example.com/1',
                score: 50,
                num_comments: 5,
                created_utc: Date.now() / 1000,
                subreddit: 'programming',
                author: 'user1',
                permalink: '/r/programming/comments/post1/',
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const posts = await client.fetchSubredditPosts('programming');

      expect(posts).toHaveLength(1);
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/r/programming/hot'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token',
          }),
        })
      );
    });

    it('should handle different sort options', async () => {
      const mockResponse = { data: { children: [] } };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await client.fetchSubredditPosts('programming', { sort: 'top', timeframe: 'week' });

      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/r/programming/top'),
        expect.any(Object)
      );
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        client.fetchSubredditPosts('nonexistent')
      ).rejects.toThrow('Reddit API request failed: 404');
    });
  });

  describe('fetchRelevantPosts', () => {
    beforeEach(() => {
      // Mock authentication
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test_token',
          expires_in: 3600,
        }),
      });
    });

    it('should fetch from multiple relevant subreddits', async () => {
      const mockPost = {
        id: 'test123',
        title: 'JavaScript Tutorial',
        selftext: 'Learn JS',
        url: 'https://example.com',
        score: 100,
        num_comments: 10,
        created_utc: Date.now() / 1000,
        subreddit: 'javascript',
        author: 'teacher',
        permalink: '/r/javascript/comments/test123/',
      };

      // Mock multiple subreddit responses
      const mockResponses = Array(5).fill({
        ok: true,
        json: () => Promise.resolve({
          data: { children: [{ data: mockPost }] },
        }),
      });

      mockFetch.mockImplementation(() => Promise.resolve(mockResponses.pop()));

      const posts = await client.fetchRelevantPosts(
        ['javascript', 'programming'],
        ['react', 'node'],
        { limit: 10 }
      );

      expect(posts).toBeInstanceOf(Array);
      expect(mockFetch).toHaveBeenCalledTimes(6); // 1 auth + 5 subreddits
    });

    it('should sort posts by score and recency', async () => {
      const oldPost = {
        id: 'old',
        score: 50,
        created_utc: (Date.now() - 86400000) / 1000, // 1 day ago
        title: 'Old Post',
        selftext: '',
        url: 'https://old.com',
        num_comments: 5,
        subreddit: 'programming',
        author: 'olduser',
        permalink: '/r/programming/comments/old/',
      };

      const newPost = {
        id: 'new',
        score: 30,
        created_utc: Date.now() / 1000, // now
        title: 'New Post',
        selftext: '',
        url: 'https://new.com',
        num_comments: 3,
        subreddit: 'programming',
        author: 'newuser',
        permalink: '/r/programming/comments/new/',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: { children: [{ data: oldPost }, { data: newPost }] },
        }),
      });

      const posts = await client.fetchRelevantPosts(['programming'], []);

      expect(posts).toHaveLength(2);
      // New post should be ranked higher due to recency despite lower score
      expect(posts[0].id).toBe('new');
    });
  });

  describe('getRelevantSubreddits', () => {
    it('should return base subreddits plus interest-based ones', async () => {
      // Create a new instance to access private method via any casting
      const clientAny = client as any;
      
      const subreddits = clientAny.getRelevantSubreddits(
        ['javascript', 'ai'],
        ['python', 'react']
      );

      expect(subreddits).toContain('programming');
      expect(subreddits).toContain('webdev');
      expect(subreddits).toContain('javascript');
      expect(subreddits).toContain('MachineLearning');
      expect(subreddits).toContain('python');
      expect(subreddits).toContain('reactjs');
    });

    it('should handle empty interests and tech stack', async () => {
      const clientAny = client as any;
      const subreddits = clientAny.getRelevantSubreddits([], []);

      expect(subreddits).toContain('programming');
      expect(subreddits).toContain('webdev');
      expect(subreddits).toContain('technology');
      expect(subreddits).toContain('startups');
      expect(subreddits.length).toBe(4); // Only base subreddits
    });
  });
});