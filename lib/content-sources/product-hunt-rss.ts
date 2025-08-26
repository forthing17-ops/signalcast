import { logger } from '@/lib/logger';

export interface ProductHuntProduct {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  votesCount: number;
  commentsCount: number;
  publishedAt: string;
  categories: string[];
  maker?: {
    name: string;
    url: string;
  };
}

export interface RSSFeedItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  guid: string;
  categories?: string[];
}

export interface RSSFeed {
  items: RSSFeedItem[];
  title: string;
  description: string;
  lastBuildDate?: string;
}

export class ProductHuntRSSClient {
  private readonly rssToJsonApiUrl = 'https://api.rss2json.com/v1/api.json';
  private readonly productHuntRssUrl = 'https://www.producthunt.com/feed';
  private readonly apiKey?: string;

  constructor() {
    // RSS2JSON API key is optional for basic usage (10 requests/hour)
    this.apiKey = process.env.RSS2JSON_API_KEY;
  }

  async fetchLatestProducts(options: { count?: number } = {}): Promise<ProductHuntProduct[]> {
    const { count = 20 } = options;
    
    try {
      const params = new URLSearchParams({
        rss_url: this.productHuntRssUrl,
        count: Math.min(count, 100).toString(), // API limit is 100
        ...(this.apiKey && { api_key: this.apiKey }),
      });

      const response = await fetch(`${this.rssToJsonApiUrl}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`RSS2JSON API request failed: ${response.status}`);
      }

      const data: { status: string; feed: RSSFeed; items: RSSFeedItem[] } = await response.json();
      
      if (data.status !== 'ok') {
        throw new Error('RSS2JSON API returned error status');
      }

      return this.transformRSSItemsToProducts(data.items);
    } catch (error) {
      logger.error('Failed to fetch Product Hunt RSS feed', error);
      throw error;
    }
  }

  async fetchRelevantProducts(
    userInterests: string[],
    techStack: string[],
    options: { count?: number } = {}
  ): Promise<ProductHuntProduct[]> {
    const allProducts = await this.fetchLatestProducts(options);
    
    // Filter products based on relevance to user interests and tech stack
    const relevantProducts = allProducts.filter(product => 
      this.isProductRelevant(product, userInterests, techStack)
    );

    // Sort by relevance score
    return relevantProducts
      .map(product => ({
        ...product,
        relevanceScore: this.calculateRelevanceScore(product, userInterests, techStack),
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, options.count || 20);
  }

  private transformRSSItemsToProducts(items: RSSFeedItem[]): ProductHuntProduct[] {
    return items.map(item => {
      // Extract vote count and other data from description HTML
      const voteMatch = item.description.match(/(\d+)\s*upvotes?/i);
      const commentMatch = item.description.match(/(\d+)\s*comments?/i);
      
      // Extract categories from RSS item
      const categories = item.categories || [];
      
      // Generate a unique ID from the link
      const urlParts = item.link.split('/');
      const id = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || item.guid;

      return {
        id,
        name: item.title.split(' - ')[0] || item.title, // Remove tagline from title
        tagline: item.title.split(' - ')[1] || '', // Extract tagline
        description: this.stripHtml(item.description),
        url: item.link,
        votesCount: voteMatch ? parseInt(voteMatch[1], 10) : 0,
        commentsCount: commentMatch ? parseInt(commentMatch[1], 10) : 0,
        publishedAt: item.pubDate,
        categories,
      };
    });
  }

  private isProductRelevant(
    product: ProductHuntProduct, 
    userInterests: string[], 
    techStack: string[]
  ): boolean {
    const searchText = `${product.name} ${product.tagline} ${product.description} ${product.categories.join(' ')}`.toLowerCase();
    
    // Check if any user interest matches
    const hasInterestMatch = userInterests.some(interest => 
      searchText.includes(interest.toLowerCase())
    );

    // Check if any tech stack item matches
    const hasTechStackMatch = techStack.some(tech => 
      searchText.includes(tech.toLowerCase())
    );

    // Check for developer/tech-related categories
    const techCategories = [
      'developer tools', 'design tools', 'productivity', 'api', 'saas',
      'artificial intelligence', 'marketing', 'analytics', 'no-code'
    ];
    
    const hasTechCategory = product.categories.some(category => 
      techCategories.some(techCat => 
        category.toLowerCase().includes(techCat.toLowerCase())
      )
    );

    return hasInterestMatch || hasTechStackMatch || hasTechCategory;
  }

  private calculateRelevanceScore(
    product: ProductHuntProduct,
    userInterests: string[],
    techStack: string[]
  ): number {
    const searchText = `${product.name} ${product.tagline} ${product.description}`.toLowerCase();
    let score = 0;

    // Interest matching (0-40 points)
    const interestMatches = userInterests.filter(interest => 
      searchText.includes(interest.toLowerCase())
    ).length;
    score += Math.min(interestMatches * 10, 40);

    // Tech stack matching (0-40 points)
    const techMatches = techStack.filter(tech => 
      searchText.includes(tech.toLowerCase())
    ).length;
    score += Math.min(techMatches * 10, 40);

    // Engagement score (0-20 points)
    const engagementScore = Math.min((product.votesCount + product.commentsCount) / 10, 20);
    score += engagementScore;

    return score;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}