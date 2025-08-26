import { logger } from '@/lib/logger';

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  score: number;
  num_comments: number;
  created_utc: number;
  subreddit: string;
  author: string;
  permalink: string;
}

export interface RedditApiResponse {
  data: {
    children: Array<{
      data: RedditPost;
    }>;
  };
}

export interface RedditAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export class RedditApiClient {
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly userAgent: string;
  private readonly baseUrl = 'https://oauth.reddit.com';
  private readonly authUrl = 'https://www.reddit.com/api/v1/access_token';

  constructor() {
    this.clientId = process.env.REDDIT_CLIENT_ID || '';
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET || '';
    this.userAgent = process.env.REDDIT_USER_AGENT || 'SignalCast/1.0';

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Reddit API credentials not configured');
    }
  }

  private async authenticate(): Promise<void> {
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return; // Token is still valid
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'User-Agent': this.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`Reddit authentication failed: ${response.status}`);
      }

      const data: RedditAuthResponse = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

      logger.info('Reddit API authentication successful');
    } catch (error) {
      logger.error('Reddit API authentication failed', error);
      throw error;
    }
  }

  async fetchSubredditPosts(
    subreddit: string,
    options: {
      sort?: 'hot' | 'new' | 'top';
      timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
      limit?: number;
    } = {}
  ): Promise<RedditPost[]> {
    await this.authenticate();

    const { sort = 'hot', timeframe = 'day', limit = 25 } = options;
    let url = `${this.baseUrl}/r/${subreddit}/${sort}`;
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      raw_json: '1',
    });

    if (sort === 'top') {
      params.append('t', timeframe);
    }

    url += `?${params.toString()}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'User-Agent': this.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error(`Reddit API request failed: ${response.status}`);
      }

      const data: RedditApiResponse = await response.json();
      return data.data.children.map(child => child.data);
    } catch (error) {
      logger.error(`Failed to fetch posts from r/${subreddit}`, error);
      throw error;
    }
  }

  async fetchRelevantPosts(
    userInterests: string[],
    techStack: string[],
    options: { limit?: number } = {}
  ): Promise<RedditPost[]> {
    const { limit = 50 } = options;
    const subreddits = this.getRelevantSubreddits(userInterests, techStack);
    const postsPerSubreddit = Math.ceil(limit / subreddits.length);
    
    const allPosts: RedditPost[] = [];

    for (const subreddit of subreddits) {
      try {
        const posts = await this.fetchSubredditPosts(subreddit, {
          sort: 'hot',
          limit: postsPerSubreddit,
        });
        allPosts.push(...posts);
      } catch (error) {
        logger.warn(`Failed to fetch from r/${subreddit}, continuing with other sources`);
      }
    }

    // Sort by score and recency
    return allPosts
      .sort((a, b) => {
        const scoreWeight = 0.7;
        const recencyWeight = 0.3;
        const aScore = (a.score * scoreWeight) + (a.created_utc * recencyWeight);
        const bScore = (b.score * scoreWeight) + (b.created_utc * recencyWeight);
        return bScore - aScore;
      })
      .slice(0, limit);
  }

  private getRelevantSubreddits(interests: string[], techStack: string[]): string[] {
    const baseSubreddits = ['programming', 'webdev', 'technology', 'startups'];
    const interestMap: Record<string, string[]> = {
      'javascript': ['javascript', 'node', 'reactjs'],
      'python': ['python', 'django', 'flask'],
      'ai': ['MachineLearning', 'artificial', 'ChatGPT'],
      'blockchain': ['cryptocurrency', 'ethereum', 'defi'],
      'devops': ['devops', 'docker', 'kubernetes'],
      'mobile': ['androiddev', 'iOSProgramming', 'reactnative'],
      'security': ['netsec', 'cybersecurity', 'privacy'],
    };

    const relevantSubreddits = new Set(baseSubreddits);

    // Add subreddits based on interests
    interests.forEach(interest => {
      const normalizedInterest = interest.toLowerCase();
      if (interestMap[normalizedInterest]) {
        interestMap[normalizedInterest].forEach(sub => relevantSubreddits.add(sub));
      }
    });

    // Add subreddits based on tech stack
    techStack.forEach(tech => {
      const normalizedTech = tech.toLowerCase();
      if (interestMap[normalizedTech]) {
        interestMap[normalizedTech].forEach(sub => relevantSubreddits.add(sub));
      }
    });

    return Array.from(relevantSubreddits);
  }
}