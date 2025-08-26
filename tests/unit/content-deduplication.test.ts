import { describe, it, expect, beforeEach } from 'vitest';
import { ContentDeduplicationEngine } from '@/lib/content-deduplication';
import type { ContentForDeduplication } from '@/lib/content-deduplication';

describe('ContentDeduplicationEngine', () => {
  let engine: ContentDeduplicationEngine;
  let mockContent: ContentForDeduplication[];

  beforeEach(() => {
    engine = new ContentDeduplicationEngine();
    
    mockContent = [
      {
        id: 'content1',
        title: 'React Development Guide',
        content: 'Learn how to build React applications with modern best practices',
        url: 'https://example.com/react-guide',
        sourcePlatform: 'reddit',
      },
      {
        id: 'content2',
        title: 'React Development Tutorial',
        content: 'Learn how to build React applications with modern best practices',
        url: 'https://example.com/react-guide',
        sourcePlatform: 'producthunt',
      },
      {
        id: 'content3',
        title: 'TypeScript Introduction',
        content: 'Getting started with TypeScript for JavaScript developers',
        url: 'https://typescript.org/intro',
        sourcePlatform: 'reddit',
      },
      {
        id: 'content4',
        title: 'Python Data Science',
        content: 'Analyzing data with Python pandas and numpy libraries',
        url: 'https://datascience.com/python',
        sourcePlatform: 'reddit',
      },
    ];
  });

  describe('deduplicateContent', () => {
    it('should identify unique content correctly', () => {
      const uniqueContent = [
        mockContent[0],
        mockContent[2],
        mockContent[3],
      ];

      const result = engine.deduplicateContent(uniqueContent);

      expect(result.uniqueContent).toHaveLength(3);
      expect(result.duplicates).toHaveLength(0);
    });

    it('should identify exact URL duplicates', () => {
      const result = engine.deduplicateContent(mockContent);

      expect(result.uniqueContent).toHaveLength(3);
      expect(result.duplicates).toHaveLength(1);
      
      const duplicateGroup = result.duplicates[0];
      expect(duplicateGroup.original.id).toBe('content1');
      expect(duplicateGroup.duplicates).toHaveLength(1);
      expect(duplicateGroup.duplicates[0].id).toBe('content2');
    });

    it('should identify title similarity duplicates', () => {
      const similarTitleContent = [
        {
          id: 'similar1',
          title: 'JavaScript Fundamentals for Beginners',
          content: 'Different content here',
          url: 'https://site1.com/js-basics',
          sourcePlatform: 'reddit',
        },
        {
          id: 'similar2',
          title: 'JavaScript Fundamentals for New Developers',
          content: 'Completely different content',
          url: 'https://site2.com/javascript-guide',
          sourcePlatform: 'producthunt',
        },
      ];

      const result = engine.deduplicateContent(similarTitleContent);

      expect(result.duplicates).toHaveLength(1);
    });

    it('should identify content similarity duplicates', () => {
      const similarContentItems = [
        {
          id: 'content_sim1',
          title: 'Different Title 1',
          content: 'Building modern web applications with React and TypeScript requires understanding component lifecycle',
          url: 'https://different1.com',
          sourcePlatform: 'reddit',
        },
        {
          id: 'content_sim2',
          title: 'Different Title 2',
          content: 'Building modern web applications with React and TypeScript requires understanding component lifecycle methods',
          url: 'https://different2.com',
          sourcePlatform: 'producthunt',
        },
      ];

      const result = engine.deduplicateContent(similarContentItems);

      expect(result.duplicates).toHaveLength(1);
    });

    it('should process multiple duplicate groups', () => {
      const multipleGroups = [
        // Group 1: Same URL
        {
          id: 'group1_a',
          title: 'Article A',
          content: 'Content A',
          url: 'https://example.com/article',
          sourcePlatform: 'reddit',
        },
        {
          id: 'group1_b',
          title: 'Article A Copy',
          content: 'Content A modified',
          url: 'https://example.com/article',
          sourcePlatform: 'producthunt',
        },
        // Group 2: Similar titles
        {
          id: 'group2_a',
          title: 'Python Machine Learning Tutorial',
          content: 'Learn ML with Python',
          url: 'https://ml.com/tutorial',
          sourcePlatform: 'reddit',
        },
        {
          id: 'group2_b',
          title: 'Python Machine Learning Guide',
          content: 'Different ML content',
          url: 'https://ai.com/guide',
          sourcePlatform: 'producthunt',
        },
        // Unique content
        {
          id: 'unique',
          title: 'Unique Article',
          content: 'Completely different content here',
          url: 'https://unique.com',
          sourcePlatform: 'reddit',
        },
      ];

      const result = engine.deduplicateContent(multipleGroups);

      expect(result.uniqueContent).toHaveLength(3);
      expect(result.duplicates).toHaveLength(2);
    });
  });

  describe('isDuplicate', () => {
    it('should detect identical URLs', () => {
      const item1 = mockContent[0];
      const item2 = { ...mockContent[0], id: 'different', title: 'Different Title' };

      const result = engine.isDuplicate(item1, item2);

      expect(result.isDuplicate).toBe(true);
      expect(result.reason).toContain('URL');
    });

    it('should detect similar URLs', () => {
      const item1 = {
        ...mockContent[0],
        url: 'https://example.com/article?utm_source=twitter&ref=social',
      };
      const item2 = {
        ...mockContent[0],
        id: 'different',
        url: 'https://example.com/article?utm_campaign=email',
      };

      const result = engine.isDuplicate(item1, item2);

      expect(result.isDuplicate).toBe(true);
      expect(result.reason).toContain('Similar URLs');
    });

    it('should detect similar titles', () => {
      const item1 = {
        ...mockContent[0],
        title: 'Complete Guide to React Development',
        url: 'https://site1.com',
      };
      const item2 = {
        ...mockContent[0],
        id: 'different',
        title: 'Complete Guide to React Development for Beginners',
        url: 'https://site2.com',
      };

      const result = engine.isDuplicate(item1, item2);

      expect(result.isDuplicate).toBe(true);
      expect(result.reason).toContain('Similar titles');
    });

    it('should detect similar content', () => {
      const item1 = {
        ...mockContent[0],
        title: 'Different Title 1',
        content: 'React is a JavaScript library for building user interfaces with components',
        url: 'https://site1.com',
      };
      const item2 = {
        ...mockContent[0],
        id: 'different',
        title: 'Different Title 2',
        content: 'React is a JavaScript library for building user interfaces using components',
        url: 'https://site2.com',
      };

      const result = engine.isDuplicate(item1, item2);

      expect(result.isDuplicate).toBe(true);
      expect(result.reason).toContain('Similar content');
    });

    it('should detect identical content hashes', () => {
      const item1 = mockContent[0];
      const item2 = { ...mockContent[0], id: 'different' };

      const result = engine.isDuplicate(item1, item2);

      expect(result.isDuplicate).toBe(true);
      expect(result.reason).toContain('hash');
    });

    it('should not flag different content as duplicates', () => {
      const result = engine.isDuplicate(mockContent[0], mockContent[2]);

      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('generateContentHash', () => {
    it('should generate consistent hashes for same content', () => {
      const hash1 = engine.generateContentHash(mockContent[0]);
      const hash2 = engine.generateContentHash(mockContent[0]);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex length
    });

    it('should generate different hashes for different content', () => {
      const hash1 = engine.generateContentHash(mockContent[0]);
      const hash2 = engine.generateContentHash(mockContent[1]);

      expect(hash1).not.toBe(hash2);
    });

    it('should normalize content for consistent hashing', () => {
      const content1 = {
        ...mockContent[0],
        title: '  React Guide  ',
        content: '  Learn React!!!  ',
        url: 'https://example.com/guide',
      };

      const content2 = {
        ...mockContent[0],
        title: 'react guide',
        content: 'learn react',
        url: 'https://example.com/guide',
      };

      const hash1 = engine.generateContentHash(content1);
      const hash2 = engine.generateContentHash(content2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('URL normalization', () => {
    it('should normalize URLs by removing tracking parameters', () => {
      const engine_any = engine as any;
      
      const normalizedUrl = engine_any.normalizeUrl(
        'https://example.com/article?utm_source=twitter&utm_campaign=social&fbclid=123&ref=homepage'
      );

      expect(normalizedUrl).toBe('https://example.com/article');
    });

    it('should normalize URLs by removing www and trailing slashes', () => {
      const engine_any = engine as any;
      
      const url1 = engine_any.normalizeUrl('https://www.example.com/article/');
      const url2 = engine_any.normalizeUrl('https://example.com/article');

      expect(url1).toBe(url2);
      expect(url1).toBe('https://example.com/article');
    });

    it('should handle malformed URLs gracefully', () => {
      const engine_any = engine as any;
      
      const normalized = engine_any.normalizeUrl('not-a-valid-url');
      expect(normalized).toBe('not-a-valid-url');
    });

    it('should convert URLs to lowercase', () => {
      const engine_any = engine as any;
      
      const normalized = engine_any.normalizeUrl('https://EXAMPLE.COM/Article');
      expect(normalized).toBe('https://example.com/article');
    });
  });

  describe('text similarity calculation', () => {
    it('should return 1.0 for identical text', () => {
      const engine_any = engine as any;
      
      const similarity = engine_any.calculateTextSimilarity('hello world', 'hello world');
      expect(similarity).toBe(1.0);
    });

    it('should return 0.0 for completely different text', () => {
      const engine_any = engine as any;
      
      const similarity = engine_any.calculateTextSimilarity('hello world', 'foo bar');
      expect(similarity).toBe(0.0);
    });

    it('should return high similarity for similar text', () => {
      const engine_any = engine as any;
      
      const similarity = engine_any.calculateTextSimilarity(
        'React is a JavaScript library',
        'React is a JavaScript framework'
      );
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should handle case differences', () => {
      const engine_any = engine as any;
      
      const similarity = engine_any.calculateTextSimilarity(
        'Hello World',
        'hello world'
      );
      expect(similarity).toBe(1.0);
    });

    it('should ignore short common words', () => {
      const engine_any = engine as any;
      
      const similarity = engine_any.calculateTextSimilarity(
        'the quick brown fox jumps over the lazy dog',
        'quick brown fox jumps over lazy dog'
      );
      expect(similarity).toBeGreaterThan(0.9);
    });
  });

  describe('getDeduplicationStats', () => {
    it('should return correct statistics', () => {
      const result = engine.deduplicateContent(mockContent);
      const stats = engine.getDeduplicationStats(result);

      expect(stats.totalOriginal).toBe(4);
      expect(stats.totalUnique).toBe(3);
      expect(stats.totalDuplicates).toBe(1);
      expect(stats.deduplicationRate).toBeCloseTo(25, 1); // 1 out of 4 = 25%
      expect(stats.duplicatesByReason).toHaveProperty('Identical URL');
    });

    it('should handle no duplicates', () => {
      const uniqueContent = [mockContent[0], mockContent[2], mockContent[3]];
      const result = engine.deduplicateContent(uniqueContent);
      const stats = engine.getDeduplicationStats(result);

      expect(stats.totalOriginal).toBe(3);
      expect(stats.totalUnique).toBe(3);
      expect(stats.totalDuplicates).toBe(0);
      expect(stats.deduplicationRate).toBe(0);
    });

    it('should categorize duplicates by reason', () => {
      const mixedDuplicates = [
        // URL duplicate
        {
          id: '1',
          title: 'Article 1',
          content: 'Content 1',
          url: 'https://example.com/same',
          sourcePlatform: 'reddit',
        },
        {
          id: '2',
          title: 'Article 2',
          content: 'Content 2',
          url: 'https://example.com/same',
          sourcePlatform: 'producthunt',
        },
        // Title duplicate
        {
          id: '3',
          title: 'JavaScript Complete Tutorial Guide',
          content: 'Content 3',
          url: 'https://site1.com',
          sourcePlatform: 'reddit',
        },
        {
          id: '4',
          title: 'JavaScript Complete Tutorial',
          content: 'Content 4',
          url: 'https://site2.com',
          sourcePlatform: 'producthunt',
        },
      ];

      const result = engine.deduplicateContent(mixedDuplicates);
      const stats = engine.getDeduplicationStats(result);

      expect(stats.duplicatesByReason).toHaveProperty('Identical URL');
      expect(stats.duplicatesByReason).toHaveProperty('Similar titles');
    });
  });

  describe('performance and edge cases', () => {
    it('should handle empty content array', () => {
      const result = engine.deduplicateContent([]);
      
      expect(result.uniqueContent).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
    });

    it('should handle single content item', () => {
      const result = engine.deduplicateContent([mockContent[0]]);
      
      expect(result.uniqueContent).toHaveLength(1);
      expect(result.duplicates).toHaveLength(0);
    });

    it('should handle large content arrays efficiently', () => {
      // Create 100 unique content items
      const largeContent = Array.from({ length: 100 }, (_, i) => ({
        id: `content_${i}`,
        title: `Unique Title ${i}`,
        content: `Unique content ${i} about different topics`,
        url: `https://example${i}.com/article`,
        sourcePlatform: 'reddit',
      }));

      const startTime = Date.now();
      const result = engine.deduplicateContent(largeContent);
      const endTime = Date.now();

      expect(result.uniqueContent).toHaveLength(100);
      expect(result.duplicates).toHaveLength(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle content with special characters', () => {
      const specialContent = [
        {
          id: '1',
          title: 'Article with émojis 🚀 and spëcial chars',
          content: 'Content with "quotes" and <tags>',
          url: 'https://example.com/special?param=value&other=test',
          sourcePlatform: 'reddit',
        },
        {
          id: '2',
          title: 'Different article',
          content: 'Normal content',
          url: 'https://different.com',
          sourcePlatform: 'producthunt',
        },
      ];

      const result = engine.deduplicateContent(specialContent);
      
      expect(result.uniqueContent).toHaveLength(2);
      expect(result.duplicates).toHaveLength(0);
    });
  });
});