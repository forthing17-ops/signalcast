import crypto from 'crypto';
import { logger } from '@/lib/logger';

export interface ContentForDeduplication {
  id: string;
  title: string;
  content: string;
  url: string;
  sourcePlatform: string;
}

export interface DeduplicationResult {
  uniqueContent: ContentForDeduplication[];
  duplicates: Array<{
    original: ContentForDeduplication;
    duplicates: ContentForDeduplication[];
    reason: string;
  }>;
}

export class ContentDeduplicationEngine {
  private readonly URL_SIMILARITY_THRESHOLD = 0.8;
  private readonly CONTENT_SIMILARITY_THRESHOLD = 0.7;
  private readonly TITLE_SIMILARITY_THRESHOLD = 0.85;

  deduplicateContent(contentItems: ContentForDeduplication[]): DeduplicationResult {
    const uniqueContent: ContentForDeduplication[] = [];
    const duplicateGroups: Array<{
      original: ContentForDeduplication;
      duplicates: ContentForDeduplication[];
      reason: string;
    }> = [];

    const processedIds = new Set<string>();

    for (let i = 0; i < contentItems.length; i++) {
      const currentItem = contentItems[i];
      
      if (processedIds.has(currentItem.id)) continue;

      const duplicates: ContentForDeduplication[] = [];
      
      // Check against remaining items
      for (let j = i + 1; j < contentItems.length; j++) {
        const compareItem = contentItems[j];
        
        if (processedIds.has(compareItem.id)) continue;

        const dedupeResult = this.isDuplicate(currentItem, compareItem);
        if (dedupeResult.isDuplicate) {
          duplicates.push(compareItem);
          processedIds.add(compareItem.id);
        }
      }

      // Add to unique content
      uniqueContent.push(currentItem);
      processedIds.add(currentItem.id);

      // If duplicates found, record them
      if (duplicates.length > 0) {
        duplicateGroups.push({
          original: currentItem,
          duplicates,
          reason: `Found ${duplicates.length} duplicate(s)`,
        });
      }
    }

    logger.info(`Deduplication complete: ${uniqueContent.length} unique, ${duplicateGroups.length} duplicate groups`);

    return {
      uniqueContent,
      duplicates: duplicateGroups,
    };
  }

  isDuplicate(
    item1: ContentForDeduplication,
    item2: ContentForDeduplication
  ): { isDuplicate: boolean; reason?: string } {
    // 1. Exact URL match (different sources might link to same content)
    if (this.normalizeUrl(item1.url) === this.normalizeUrl(item2.url)) {
      return { isDuplicate: true, reason: 'Identical URL' };
    }

    // 2. URL similarity check
    const urlSimilarity = this.calculateUrlSimilarity(item1.url, item2.url);
    if (urlSimilarity >= this.URL_SIMILARITY_THRESHOLD) {
      return { isDuplicate: true, reason: `Similar URLs (${(urlSimilarity * 100).toFixed(1)}% similarity)` };
    }

    // 3. Title similarity check
    const titleSimilarity = this.calculateTextSimilarity(item1.title, item2.title);
    if (titleSimilarity >= this.TITLE_SIMILARITY_THRESHOLD) {
      return { isDuplicate: true, reason: `Similar titles (${(titleSimilarity * 100).toFixed(1)}% similarity)` };
    }

    // 4. Content similarity check (more expensive, do last)
    const contentSimilarity = this.calculateTextSimilarity(item1.content, item2.content);
    if (contentSimilarity >= this.CONTENT_SIMILARITY_THRESHOLD) {
      return { isDuplicate: true, reason: `Similar content (${(contentSimilarity * 100).toFixed(1)}% similarity)` };
    }

    // 5. Content hash check for exact matches
    const hash1 = this.generateContentHash(item1);
    const hash2 = this.generateContentHash(item2);
    if (hash1 === hash2) {
      return { isDuplicate: true, reason: 'Identical content hash' };
    }

    return { isDuplicate: false };
  }

  generateContentHash(content: ContentForDeduplication): string {
    // Create a normalized version of the content for hashing
    const normalizedTitle = this.normalizeTextForHashing(content.title);
    const normalizedContent = this.normalizeTextForHashing(content.content);
    const normalizedUrl = this.normalizeUrl(content.url);

    const hashInput = `${normalizedTitle}|${normalizedContent}|${normalizedUrl}`;
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  private normalizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      
      // Remove common tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
        'fbclid', 'gclid', 'ref', 'source', 'campaign'
      ];
      
      trackingParams.forEach(param => {
        parsedUrl.searchParams.delete(param);
      });

      // Normalize common variations
      let normalized = parsedUrl.toString();
      
      // Remove trailing slash
      if (normalized.endsWith('/')) {
        normalized = normalized.slice(0, -1);
      }
      
      // Convert to lowercase
      normalized = normalized.toLowerCase();
      
      // Remove www prefix
      normalized = normalized.replace(/^https?:\/\/www\./, (match) => 
        match.replace('www.', '')
      );

      return normalized;
    } catch (error) {
      // If URL parsing fails, return original URL normalized
      return url.toLowerCase().trim();
    }
  }

  private calculateUrlSimilarity(url1: string, url2: string): number {
    const normalized1 = this.normalizeUrl(url1);
    const normalized2 = this.normalizeUrl(url2);

    // If exactly the same after normalization
    if (normalized1 === normalized2) return 1.0;

    try {
      const parsed1 = new URL(normalized1);
      const parsed2 = new URL(normalized2);

      // Different domains = very low similarity
      if (parsed1.hostname !== parsed2.hostname) {
        return this.calculateTextSimilarity(normalized1, normalized2) * 0.3;
      }

      // Same domain, compare paths
      const pathSimilarity = this.calculateTextSimilarity(
        parsed1.pathname + parsed1.search,
        parsed2.pathname + parsed2.search
      );

      return pathSimilarity;
    } catch (error) {
      // Fallback to text similarity if URL parsing fails
      return this.calculateTextSimilarity(normalized1, normalized2);
    }
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1.0;
    if (!text1 || !text2) return 0.0;

    // Normalize texts
    const norm1 = this.normalizeTextForComparison(text1);
    const norm2 = this.normalizeTextForComparison(text2);

    if (norm1 === norm2) return 1.0;

    // Use Jaccard similarity on word sets
    const words1 = new Set(norm1.split(/\s+/).filter(word => word.length > 2));
    const words2 = new Set(norm2.split(/\s+/).filter(word => word.length > 2));

    if (words1.size === 0 && words2.size === 0) return 1.0;
    if (words1.size === 0 || words2.size === 0) return 0.0;

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    const jaccardSimilarity = intersection.size / union.size;

    // Also calculate character-level similarity for short texts
    const charSimilarity = this.calculateCharacterSimilarity(norm1, norm2);

    // Weighted combination favoring word-level similarity
    return (jaccardSimilarity * 0.7) + (charSimilarity * 0.3);
  }

  private calculateCharacterSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.calculateLevenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,      // insertion
          matrix[j - 1][i] + 1,      // deletion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private normalizeTextForComparison(text: string): string {
    return text
      .toLowerCase()
      .trim()
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove common punctuation but keep meaningful ones
      .replace(/[^\w\s\-.,!?]/g, '')
      // Remove common stop words for better comparison
      .replace(/\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by|from|up|about|into|through|during)\b/g, '')
      .trim();
  }

  private normalizeTextForHashing(text: string): string {
    return text
      .toLowerCase()
      .trim()
      // More aggressive normalization for hashing
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Utility method to get deduplication statistics
  getDeduplicationStats(result: DeduplicationResult): {
    totalOriginal: number;
    totalUnique: number;
    totalDuplicates: number;
    deduplicationRate: number;
    duplicatesByReason: Record<string, number>;
  } {
    const totalDuplicates = result.duplicates.reduce(
      (sum, group) => sum + group.duplicates.length, 
      0
    );
    
    const totalOriginal = result.uniqueContent.length + totalDuplicates;
    const deduplicationRate = totalOriginal > 0 ? (totalDuplicates / totalOriginal) * 100 : 0;

    const duplicatesByReason: Record<string, number> = {};
    result.duplicates.forEach(group => {
      const mainReason = group.reason.split('(')[0].trim(); // Get main reason without details
      duplicatesByReason[mainReason] = (duplicatesByReason[mainReason] || 0) + group.duplicates.length;
    });

    return {
      totalOriginal,
      totalUnique: result.uniqueContent.length,
      totalDuplicates,
      deduplicationRate,
      duplicatesByReason,
    };
  }
}