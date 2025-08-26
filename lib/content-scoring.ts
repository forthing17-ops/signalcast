export interface ContentItem {
  title: string;
  content: string;
  sourcePlatform: string;
  sourceMetadata: any;
  publishedAt: Date;
  topics: string[];
}

export interface ScoringWeights {
  relevance: number;      // 0-1, how well content matches user interests
  quality: number;        // 0-1, content quality based on engagement
  recency: number;        // 0-1, how recent the content is
  diversity: number;      // 0-1, penalty for similar content
}

export interface UserProfile {
  interests: string[];
  techStack: string[];
  contentDepth: 'brief' | 'detailed';
  professionalRole?: string;
  industry?: string;
}

export class ContentScoringEngine {
  private readonly defaultWeights: ScoringWeights = {
    relevance: 0.4,
    quality: 0.3,
    recency: 0.2,
    diversity: 0.1,
  };

  calculateRelevanceScore(content: ContentItem, userProfile: UserProfile): number {
    let score = 0;
    const searchText = `${content.title} ${content.content} ${content.topics.join(' ')}`.toLowerCase();
    
    // Interest matching (0-50 points)
    const interestMatches = userProfile.interests.filter(interest => 
      this.isTextMatch(searchText, interest)
    ).length;
    score += Math.min(interestMatches * 10, 50);

    // Tech stack matching (0-40 points)  
    const techMatches = userProfile.techStack.filter(tech => 
      this.isTextMatch(searchText, tech)
    ).length;
    score += Math.min(techMatches * 8, 40);

    // Professional role matching (0-10 points)
    if (userProfile.professionalRole) {
      if (this.isTextMatch(searchText, userProfile.professionalRole)) {
        score += 10;
      }
    }

    return Math.min(score, 100);
  }

  calculateQualityScore(content: ContentItem): number {
    let score = 0;

    switch (content.sourcePlatform) {
      case 'reddit':
        score = this.calculateRedditQualityScore(content);
        break;
      case 'producthunt':
        score = this.calculateProductHuntQualityScore(content);
        break;
      default:
        score = this.calculateGenericQualityScore(content);
    }

    return Math.min(score, 100);
  }

  private calculateRedditQualityScore(content: ContentItem): number {
    const metadata = content.sourceMetadata;
    let score = 0;

    // Engagement score based on upvotes and comments (0-60 points)
    const totalEngagement = (metadata.score || 0) + (metadata.comments || 0);
    const engagementScore = Math.min(totalEngagement / 5, 60);
    score += engagementScore;

    // Content length quality (0-20 points)
    const contentLength = content.content.length;
    if (contentLength > 500) score += 20;
    else if (contentLength > 200) score += 15;
    else if (contentLength > 50) score += 10;

    // Subreddit quality boost for tech subreddits (0-20 points)
    const qualitySubreddits = [
      'programming', 'webdev', 'technology', 'MachineLearning', 
      'javascript', 'python', 'reactjs', 'devops'
    ];
    if (qualitySubreddits.includes(metadata.subreddit)) {
      score += 20;
    }

    return score;
  }

  private calculateProductHuntQualityScore(content: ContentItem): number {
    const metadata = content.sourceMetadata;
    let score = 0;

    // Vote count quality (0-40 points)
    const votes = metadata.votesCount || 0;
    score += Math.min(votes / 2, 40);

    // Comment engagement (0-20 points) 
    const comments = metadata.commentsCount || 0;
    score += Math.min(comments * 2, 20);

    // Category quality bonus (0-25 points)
    const highQualityCategories = [
      'developer tools', 'design tools', 'productivity', 
      'artificial intelligence', 'api', 'saas'
    ];
    const categoryBonus = metadata.categories?.filter((cat: string) => 
      highQualityCategories.some(qCat => 
        cat.toLowerCase().includes(qCat.toLowerCase())
      )
    ).length * 8;
    score += Math.min(categoryBonus || 0, 25);

    // Description quality (0-15 points)
    const descriptionLength = content.content.length;
    if (descriptionLength > 200) score += 15;
    else if (descriptionLength > 100) score += 10;
    else if (descriptionLength > 50) score += 5;

    return score;
  }

  private calculateGenericQualityScore(content: ContentItem): number {
    let score = 50; // Base score for unknown sources

    // Content length indicator
    const contentLength = content.content.length;
    if (contentLength > 300) score += 20;
    else if (contentLength > 100) score += 10;

    // Topic relevance
    if (content.topics.length > 0) score += 15;
    if (content.topics.length > 3) score += 15;

    return Math.min(score, 100);
  }

  calculateRecencyScore(content: ContentItem, maxAgeHours: number = 168): number {
    const now = Date.now();
    const contentAge = now - content.publishedAt.getTime();
    const ageInHours = contentAge / (1000 * 60 * 60);

    if (ageInHours > maxAgeHours) return 0;

    // Linear decay from 100 to 0 over maxAgeHours
    const score = 100 * (1 - (ageInHours / maxAgeHours));
    return Math.max(0, score);
  }

  calculateDiversityPenalty(
    content: ContentItem, 
    existingContent: ContentItem[]
  ): number {
    let penalty = 0;
    const contentText = `${content.title} ${content.content}`.toLowerCase();

    for (const existing of existingContent) {
      const existingText = `${existing.title} ${existing.content}`.toLowerCase();
      const similarity = this.calculateTextSimilarity(contentText, existingText);
      
      if (similarity > 0.7) penalty += 50; // High similarity penalty
      else if (similarity > 0.5) penalty += 30; // Medium similarity penalty
      else if (similarity > 0.3) penalty += 15; // Low similarity penalty
    }

    return Math.min(penalty, 100);
  }

  calculateOverallScore(
    content: ContentItem,
    userProfile: UserProfile,
    existingContent: ContentItem[] = [],
    weights: Partial<ScoringWeights> = {}
  ): number {
    const finalWeights = { ...this.defaultWeights, ...weights };

    const relevanceScore = this.calculateRelevanceScore(content, userProfile);
    const qualityScore = this.calculateQualityScore(content);
    const recencyScore = this.calculateRecencyScore(content);
    const diversityPenalty = this.calculateDiversityPenalty(content, existingContent);

    const weightedScore = 
      (relevanceScore * finalWeights.relevance) +
      (qualityScore * finalWeights.quality) +
      (recencyScore * finalWeights.recency) -
      (diversityPenalty * finalWeights.diversity);

    return Math.max(0, Math.min(100, weightedScore));
  }

  scoreMultipleItems(
    contentItems: ContentItem[],
    userProfile: UserProfile,
    weights: Partial<ScoringWeights> = {}
  ): Array<ContentItem & { relevanceScore: number }> {
    const scoredItems: Array<ContentItem & { relevanceScore: number }> = [];

    contentItems.forEach((content, index) => {
      const existingContent = scoredItems.slice(0, index).map(item => ({
        title: item.title,
        content: item.content,
        sourcePlatform: item.sourcePlatform,
        sourceMetadata: item.sourceMetadata,
        publishedAt: item.publishedAt,
        topics: item.topics,
      }));

      const score = this.calculateOverallScore(content, userProfile, existingContent, weights);
      
      scoredItems.push({
        ...content,
        relevanceScore: score,
      });
    });

    return scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private isTextMatch(text: string, keyword: string): boolean {
    const normalizedKeyword = keyword.toLowerCase();
    const normalizedText = text.toLowerCase();
    
    // Exact match
    if (normalizedText.includes(normalizedKeyword)) return true;
    
    // Fuzzy matching for common variations
    const keywordVariations = this.generateKeywordVariations(normalizedKeyword);
    return keywordVariations.some(variation => normalizedText.includes(variation));
  }

  private generateKeywordVariations(keyword: string): string[] {
    const variations = [keyword];
    
    // Common programming language variations
    const languageMap: Record<string, string[]> = {
      'javascript': ['js', 'node', 'nodejs', 'react', 'vue', 'angular'],
      'python': ['py', 'django', 'flask', 'fastapi'],
      'typescript': ['ts', 'tsx'],
      'artificial intelligence': ['ai', 'ml', 'machine learning'],
      'machine learning': ['ml', 'ai', 'artificial intelligence'],
      'devops': ['ci/cd', 'docker', 'kubernetes', 'k8s'],
      'frontend': ['front-end', 'ui', 'ux'],
      'backend': ['back-end', 'server-side', 'api'],
    };

    const additionalVariations = languageMap[keyword] || [];
    variations.push(...additionalVariations);

    return variations;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter(word => word.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(word => word.length > 2));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // Utility method to adjust scoring weights based on user preferences
  getOptimizedWeights(userProfile: UserProfile): ScoringWeights {
    const weights = { ...this.defaultWeights };

    // Adjust weights based on content depth preference
    if (userProfile.contentDepth === 'detailed') {
      weights.quality += 0.1;
      weights.relevance -= 0.1;
    } else {
      weights.recency += 0.1;
      weights.quality -= 0.1;
    }

    // Normalize weights to sum to 1.0
    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    Object.keys(weights).forEach(key => {
      weights[key as keyof ScoringWeights] = weights[key as keyof ScoringWeights] / total;
    });

    return weights;
  }
}