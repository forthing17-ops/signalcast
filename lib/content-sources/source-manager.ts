import { logger } from '@/lib/logger';
import { rateLimitMonitor } from '@/lib/rate-limit-monitor';
import { RedditApiClient, RedditPost } from './reddit-api';
import { ProductHuntRSSClient, ProductHuntProduct } from './product-hunt-rss';

export interface SourceContent {
  id: string;
  title: string;
  content: string;
  url: string;
  sourcePlatform: string;
  sourceMetadata: any;
  score: number;
  publishedAt: Date;
  topics: string[];
}

export interface ContentSourceConfig {
  enabled: boolean;
  priority: number; // Higher number = higher priority
  maxRetries: number;
  timeoutMs: number;
}

export class SourceManager {
  private redditClient: RedditApiClient;
  private productHuntClient: ProductHuntRSSClient;
  private sourceConfigs: Map<string, ContentSourceConfig>;

  constructor() {
    this.redditClient = new RedditApiClient();
    this.productHuntClient = new ProductHuntRSSClient();
    this.initializeSourceConfigs();
  }

  private initializeSourceConfigs(): void {
    this.sourceConfigs = new Map([
      ['reddit', {
        enabled: true,
        priority: 2,
        maxRetries: 3,
        timeoutMs: 10000,
      }],
      ['producthunt', {
        enabled: true,
        priority: 1,
        maxRetries: 2,
        timeoutMs: 15000,
      }],
    ]);
  }

  async fetchAllContent(
    userInterests: string[],
    techStack: string[],
    options: { maxItems?: number } = {}
  ): Promise<SourceContent[]> {
    const { maxItems = 50 } = options;
    const allContent: SourceContent[] = [];
    
    // Get enabled sources sorted by priority
    const enabledSources = Array.from(this.sourceConfigs.entries())
      .filter(([_, config]) => config.enabled)
      .sort((a, b) => b[1].priority - a[1].priority);

    // Calculate items per source
    const itemsPerSource = Math.ceil(maxItems / enabledSources.length);

    // Fetch content from each source with fallback handling
    const fetchPromises = enabledSources.map(([sourceName]) =>
      this.fetchFromSourceWithFallback(
        sourceName,
        userInterests,
        techStack,
        itemsPerSource
      )
    );

    const results = await Promise.allSettled(fetchPromises);
    
    results.forEach((result, index) => {
      const sourceName = enabledSources[index][0];
      if (result.status === 'fulfilled') {
        allContent.push(...result.value);
        logger.info(`Successfully fetched ${result.value.length} items from ${sourceName}`);
      } else {
        logger.error(`Failed to fetch from ${sourceName}`, result.reason);
      }
    });

    // Sort by relevance score and limit results
    return allContent
      .sort((a, b) => b.score - a.score)
      .slice(0, maxItems);
  }

  private async fetchFromSourceWithFallback(
    sourceName: string,
    userInterests: string[],
    techStack: string[],
    maxItems: number
  ): Promise<SourceContent[]> {
    const config = this.sourceConfigs.get(sourceName);
    if (!config) return [];

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < config.maxRetries) {
      try {
        // Check rate limits before attempting
        if (!await rateLimitMonitor.canMakeRequest(sourceName)) {
          const resetTime = rateLimitMonitor.getTimeUntilReset(sourceName);
          logger.warn(`Rate limit hit for ${sourceName}, waiting ${resetTime}ms`);
          
          if (resetTime < 60000) { // Wait up to 1 minute
            await this.sleep(resetTime);
          } else {
            throw new Error(`Rate limit exceeded for ${sourceName}, reset in ${resetTime}ms`);
          }
        }

        const content = await this.fetchFromSource(
          sourceName,
          userInterests,
          techStack,
          maxItems,
          config.timeoutMs
        );

        return content;
      } catch (error) {
        attempt++;
        lastError = error as Error;
        
        if (attempt < config.maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 1000; // Exponential backoff
          logger.warn(`Attempt ${attempt} failed for ${sourceName}, retrying in ${backoffMs}ms`, error);
          await this.sleep(backoffMs);
        }
      }
    }

    logger.error(`All ${config.maxRetries} attempts failed for ${sourceName}`, lastError);
    return [];
  }

  private async fetchFromSource(
    sourceName: string,
    userInterests: string[],
    techStack: string[],
    maxItems: number,
    timeoutMs: number
  ): Promise<SourceContent[]> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    );

    const fetchPromise = this.performSourceFetch(sourceName, userInterests, techStack, maxItems);

    try {
      return await Promise.race([fetchPromise, timeout]);
    } catch (error) {
      logger.error(`Error fetching from ${sourceName}`, error);
      throw error;
    }
  }

  private async performSourceFetch(
    sourceName: string,
    userInterests: string[],
    techStack: string[],
    maxItems: number
  ): Promise<SourceContent[]> {
    // Record the API request for rate limiting
    await rateLimitMonitor.recordRequest(sourceName);

    switch (sourceName) {
      case 'reddit':
        return this.fetchFromReddit(userInterests, techStack, maxItems);
      
      case 'producthunt':
        return this.fetchFromProductHunt(userInterests, techStack, maxItems);
      
      default:
        throw new Error(`Unknown source: ${sourceName}`);
    }
  }

  private async fetchFromReddit(
    userInterests: string[],
    techStack: string[],
    maxItems: number
  ): Promise<SourceContent[]> {
    const posts = await this.redditClient.fetchRelevantPosts(
      userInterests,
      techStack,
      { limit: maxItems }
    );

    return posts.map((post: RedditPost) => ({
      id: `reddit_${post.id}`,
      title: post.title,
      content: post.selftext || post.title,
      url: `https://reddit.com${post.permalink}`,
      sourcePlatform: 'reddit',
      sourceMetadata: {
        subreddit: post.subreddit,
        author: post.author,
        score: post.score,
        comments: post.num_comments,
        originalUrl: post.url,
      },
      score: this.calculateRedditScore(post, userInterests, techStack),
      publishedAt: new Date(post.created_utc * 1000),
      topics: this.extractTopics(post.title + ' ' + post.selftext),
    }));
  }

  private async fetchFromProductHunt(
    userInterests: string[],
    techStack: string[],
    maxItems: number
  ): Promise<SourceContent[]> {
    await rateLimitMonitor.recordRequest('rss2json'); // Track RSS2JSON usage separately
    
    const products = await this.productHuntClient.fetchRelevantProducts(
      userInterests,
      techStack,
      { count: maxItems }
    );

    return products.map((product: ProductHuntProduct) => ({
      id: `producthunt_${product.id}`,
      title: product.name,
      content: `${product.tagline}\n\n${product.description}`,
      url: product.url,
      sourcePlatform: 'producthunt',
      sourceMetadata: {
        tagline: product.tagline,
        votesCount: product.votesCount,
        commentsCount: product.commentsCount,
        categories: product.categories,
        maker: product.maker,
      },
      score: this.calculateProductHuntScore(product, userInterests, techStack),
      publishedAt: new Date(product.publishedAt),
      topics: [...product.categories, ...this.extractTopics(product.name + ' ' + product.description)],
    }));
  }

  private calculateRedditScore(post: RedditPost, interests: string[], techStack: string[]): number {
    let score = 0;
    const searchText = `${post.title} ${post.selftext}`.toLowerCase();

    // Engagement score (0-40 points)
    const engagementScore = Math.min((post.score + post.num_comments) / 10, 40);
    score += engagementScore;

    // Recency bonus (0-20 points)
    const hoursAgo = (Date.now() - (post.created_utc * 1000)) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 20 - hoursAgo);
    score += recencyScore;

    // Interest matching (0-40 points)
    const interestMatches = interests.filter(interest => 
      searchText.includes(interest.toLowerCase())
    ).length;
    score += Math.min(interestMatches * 10, 40);

    return score;
  }

  private calculateProductHuntScore(product: ProductHuntProduct, interests: string[], techStack: string[]): number {
    let score = 0;
    const searchText = `${product.name} ${product.tagline} ${product.description}`.toLowerCase();

    // Base engagement score (0-30 points)
    const engagementScore = Math.min((product.votesCount + product.commentsCount) / 5, 30);
    score += engagementScore;

    // Interest/tech stack matching (0-50 points)
    const allKeywords = [...interests, ...techStack];
    const matches = allKeywords.filter(keyword => 
      searchText.includes(keyword.toLowerCase())
    ).length;
    score += Math.min(matches * 10, 50);

    // Category bonus (0-20 points)
    const techCategories = ['developer tools', 'design tools', 'productivity', 'api'];
    const categoryMatches = product.categories.filter(category => 
      techCategories.some(techCat => category.toLowerCase().includes(techCat))
    ).length;
    score += Math.min(categoryMatches * 10, 20);

    return score;
  }

  private extractTopics(text: string): string[] {
    const commonTopics = [
      'ai', 'machine learning', 'javascript', 'python', 'react', 'node.js',
      'devops', 'cloud', 'aws', 'security', 'blockchain', 'mobile', 'web',
      'startup', 'productivity', 'design', 'api', 'database', 'frontend',
      'backend', 'fullstack', 'saas', 'no-code', 'automation'
    ];

    const lowerText = text.toLowerCase();
    return commonTopics.filter(topic => lowerText.includes(topic));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check methods
  async checkSourceHealth(): Promise<Record<string, boolean>> {
    const healthStatus: Record<string, boolean> = {};

    for (const [sourceName] of this.sourceConfigs) {
      try {
        const canRequest = await rateLimitMonitor.canMakeRequest(sourceName);
        healthStatus[sourceName] = canRequest;
      } catch (error) {
        healthStatus[sourceName] = false;
        logger.error(`Health check failed for ${sourceName}`, error);
      }
    }

    return healthStatus;
  }

  getSourceConfiguration(sourceName: string): ContentSourceConfig | undefined {
    return this.sourceConfigs.get(sourceName);
  }

  updateSourceConfiguration(sourceName: string, config: Partial<ContentSourceConfig>): void {
    const existing = this.sourceConfigs.get(sourceName);
    if (existing) {
      this.sourceConfigs.set(sourceName, { ...existing, ...config });
    }
  }
}