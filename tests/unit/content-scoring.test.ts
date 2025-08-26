import { describe, it, expect, beforeEach } from 'vitest';
import { ContentScoringEngine } from '@/lib/content-scoring';
import type { ContentItem, UserProfile } from '@/lib/content-scoring';

describe('ContentScoringEngine', () => {
  let engine: ContentScoringEngine;
  let mockUserProfile: UserProfile;
  let mockContent: ContentItem;

  beforeEach(() => {
    engine = new ContentScoringEngine();
    
    mockUserProfile = {
      interests: ['javascript', 'react', 'web development'],
      techStack: ['react', 'typescript', 'node.js'],
      contentDepth: 'detailed',
      professionalRole: 'frontend developer',
      industry: 'technology',
    };

    mockContent = {
      title: 'Building React Applications with TypeScript',
      content: 'Learn how to build scalable React applications using TypeScript and modern development practices.',
      sourcePlatform: 'reddit',
      sourceMetadata: {
        subreddit: 'reactjs',
        score: 150,
        comments: 25,
      },
      publishedAt: new Date(),
      topics: ['react', 'typescript', 'frontend'],
    };
  });

  describe('calculateRelevanceScore', () => {
    it('should score content based on interest matches', () => {
      const score = engine.calculateRelevanceScore(mockContent, mockUserProfile);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give higher scores for multiple interest matches', () => {
      const highMatchContent = {
        ...mockContent,
        title: 'React JavaScript TypeScript Web Development Guide',
        content: 'Complete guide to React, JavaScript, TypeScript and web development best practices',
        topics: ['react', 'javascript', 'typescript', 'web-development'],
      };

      const lowMatchContent = {
        ...mockContent,
        title: 'Python Data Science Tutorial',
        content: 'Learn data science with Python pandas and numpy',
        topics: ['python', 'data-science'],
      };

      const highScore = engine.calculateRelevanceScore(highMatchContent, mockUserProfile);
      const lowScore = engine.calculateRelevanceScore(lowMatchContent, mockUserProfile);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should score tech stack matches', () => {
      const techStackContent = {
        ...mockContent,
        title: 'Node.js TypeScript Backend Development',
        content: 'Building APIs with Node.js and TypeScript',
        topics: ['nodejs', 'typescript', 'backend'],
      };

      const score = engine.calculateRelevanceScore(techStackContent, mockUserProfile);
      expect(score).toBeGreaterThan(30); // Should get points for tech stack matches
    });

    it('should score professional role matches', () => {
      const roleContent = {
        ...mockContent,
        title: 'Frontend Developer Career Guide',
        content: 'Tips for frontend developers to advance their career',
        topics: ['career', 'frontend'],
      };

      const score = engine.calculateRelevanceScore(roleContent, mockUserProfile);
      expect(score).toBeGreaterThan(10); // Should get role bonus
    });

    it('should handle empty interests gracefully', () => {
      const emptyProfile = {
        ...mockUserProfile,
        interests: [],
        techStack: [],
      };

      const score = engine.calculateRelevanceScore(mockContent, emptyProfile);
      expect(score).toBe(10); // Only role match bonus
    });
  });

  describe('calculateQualityScore', () => {
    describe('Reddit content quality', () => {
      it('should score based on engagement metrics', () => {
        const highEngagementContent = {
          ...mockContent,
          sourceMetadata: {
            subreddit: 'programming',
            score: 500,
            comments: 100,
          },
        };

        const score = engine.calculateQualityScore(highEngagementContent);
        expect(score).toBeGreaterThan(50);
      });

      it('should give bonus for quality subreddits', () => {
        const qualitySubredditContent = {
          ...mockContent,
          sourceMetadata: {
            subreddit: 'programming',
            score: 50,
            comments: 10,
          },
        };

        const regularSubredditContent = {
          ...mockContent,
          sourceMetadata: {
            subreddit: 'funny',
            score: 50,
            comments: 10,
          },
        };

        const qualityScore = engine.calculateQualityScore(qualitySubredditContent);
        const regularScore = engine.calculateQualityScore(regularSubredditContent);

        expect(qualityScore).toBeGreaterThan(regularScore);
      });

      it('should score based on content length', () => {
        const longContent = {
          ...mockContent,
          content: 'A'.repeat(1000), // Long content
          sourceMetadata: { subreddit: 'test', score: 10, comments: 1 },
        };

        const shortContent = {
          ...mockContent,
          content: 'Short',
          sourceMetadata: { subreddit: 'test', score: 10, comments: 1 },
        };

        const longScore = engine.calculateQualityScore(longContent);
        const shortScore = engine.calculateQualityScore(shortContent);

        expect(longScore).toBeGreaterThan(shortScore);
      });
    });

    describe('Product Hunt content quality', () => {
      it('should score based on votes and comments', () => {
        const productHuntContent = {
          ...mockContent,
          sourcePlatform: 'producthunt',
          sourceMetadata: {
            votesCount: 200,
            commentsCount: 30,
            categories: ['Developer Tools'],
          },
        };

        const score = engine.calculateQualityScore(productHuntContent);
        expect(score).toBeGreaterThan(30);
      });

      it('should give category quality bonus', () => {
        const highQualityContent = {
          ...mockContent,
          sourcePlatform: 'producthunt',
          sourceMetadata: {
            votesCount: 50,
            commentsCount: 10,
            categories: ['Developer Tools', 'Productivity'],
          },
        };

        const lowQualityContent = {
          ...mockContent,
          sourcePlatform: 'producthunt',
          sourceMetadata: {
            votesCount: 50,
            commentsCount: 10,
            categories: ['Games'],
          },
        };

        const highScore = engine.calculateQualityScore(highQualityContent);
        const lowScore = engine.calculateQualityScore(lowQualityContent);

        expect(highScore).toBeGreaterThan(lowScore);
      });
    });

    it('should handle unknown platforms with generic scoring', () => {
      const unknownContent = {
        ...mockContent,
        sourcePlatform: 'unknown',
        sourceMetadata: {},
      };

      const score = engine.calculateQualityScore(unknownContent);
      expect(score).toBeGreaterThanOrEqual(50); // Base score
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateRecencyScore', () => {
    it('should give high scores for recent content', () => {
      const recentContent = {
        ...mockContent,
        publishedAt: new Date(), // Now
      };

      const score = engine.calculateRecencyScore(recentContent);
      expect(score).toBe(100);
    });

    it('should decay score over time', () => {
      const oldContent = {
        ...mockContent,
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      };

      const score = engine.calculateRecencyScore(oldContent);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(85); // Should still be quite high
    });

    it('should return 0 for very old content', () => {
      const veryOldContent = {
        ...mockContent,
        publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      };

      const score = engine.calculateRecencyScore(veryOldContent, 168); // 7 days max
      expect(score).toBe(0);
    });

    it('should handle custom max age', () => {
      const content = {
        ...mockContent,
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      };

      const score = engine.calculateRecencyScore(content, 24); // 24 hours max
      expect(score).toBe(50); // Half the max age
    });
  });

  describe('calculateDiversityPenalty', () => {
    it('should penalize highly similar content', () => {
      const existingContent = [
        {
          ...mockContent,
          title: 'React Development Guide',
          content: 'Learn React development with modern practices',
        },
      ];

      const similarContent = {
        ...mockContent,
        title: 'React Development Tutorial',
        content: 'Learn React development with best practices',
      };

      const penalty = engine.calculateDiversityPenalty(similarContent, existingContent);
      expect(penalty).toBeGreaterThan(20);
    });

    it('should not penalize diverse content', () => {
      const existingContent = [
        {
          ...mockContent,
          title: 'Python Data Science',
          content: 'Learn data science with Python',
        },
      ];

      const diverseContent = {
        ...mockContent,
        title: 'React Frontend Development',
        content: 'Build modern web applications with React',
      };

      const penalty = engine.calculateDiversityPenalty(diverseContent, existingContent);
      expect(penalty).toBeLessThan(20);
    });

    it('should accumulate penalties for multiple similar items', () => {
      const existingContent = [
        {
          ...mockContent,
          title: 'React Tutorial 1',
          content: 'First React tutorial',
        },
        {
          ...mockContent,
          title: 'React Tutorial 2',
          content: 'Second React tutorial',
        },
      ];

      const similarContent = {
        ...mockContent,
        title: 'React Tutorial 3',
        content: 'Third React tutorial',
      };

      const penalty = engine.calculateDiversityPenalty(similarContent, existingContent);
      expect(penalty).toBeGreaterThan(50);
    });
  });

  describe('calculateOverallScore', () => {
    it('should combine all scoring factors', () => {
      const score = engine.calculateOverallScore(mockContent, mockUserProfile);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should use custom weights', () => {
      const relevanceWeightedScore = engine.calculateOverallScore(
        mockContent,
        mockUserProfile,
        [],
        { relevance: 1.0, quality: 0, recency: 0, diversity: 0 }
      );

      const qualityWeightedScore = engine.calculateOverallScore(
        mockContent,
        mockUserProfile,
        [],
        { relevance: 0, quality: 1.0, recency: 0, diversity: 0 }
      );

      // Scores should be different when emphasizing different factors
      expect(relevanceWeightedScore).not.toBe(qualityWeightedScore);
    });

    it('should apply diversity penalty', () => {
      const existingContent = [mockContent];
      
      const scoreWithPenalty = engine.calculateOverallScore(
        mockContent,
        mockUserProfile,
        existingContent
      );

      const scoreWithoutPenalty = engine.calculateOverallScore(
        mockContent,
        mockUserProfile,
        []
      );

      expect(scoreWithPenalty).toBeLessThan(scoreWithoutPenalty);
    });
  });

  describe('scoreMultipleItems', () => {
    it('should score and sort multiple items', () => {
      const contentItems = [
        {
          ...mockContent,
          title: 'Python Tutorial',
          content: 'Learn Python programming',
          topics: ['python'],
        },
        {
          ...mockContent,
          title: 'React TypeScript Guide',
          content: 'Build React apps with TypeScript',
          topics: ['react', 'typescript'],
        },
        {
          ...mockContent,
          title: 'JavaScript Basics',
          content: 'Learn JavaScript fundamentals',
          topics: ['javascript'],
        },
      ];

      const scoredItems = engine.scoreMultipleItems(contentItems, mockUserProfile);

      expect(scoredItems).toHaveLength(3);
      expect(scoredItems[0]).toHaveProperty('relevanceScore');
      
      // Should be sorted by relevance score (descending)
      for (let i = 1; i < scoredItems.length; i++) {
        expect(scoredItems[i-1].relevanceScore).toBeGreaterThanOrEqual(
          scoredItems[i].relevanceScore
        );
      }
    });

    it('should apply diversity considerations in order', () => {
      const similarContentItems = [
        {
          ...mockContent,
          title: 'React Guide 1',
          content: 'First React guide',
          topics: ['react'],
        },
        {
          ...mockContent,
          title: 'React Guide 2',
          content: 'Second React guide',
          topics: ['react'],
        },
        {
          ...mockContent,
          title: 'React Guide 3',
          content: 'Third React guide',
          topics: ['react'],
        },
      ];

      const scoredItems = engine.scoreMultipleItems(similarContentItems, mockUserProfile);
      
      // Later items should have lower scores due to diversity penalty
      expect(scoredItems[0].relevanceScore).toBeGreaterThan(scoredItems[1].relevanceScore);
      expect(scoredItems[1].relevanceScore).toBeGreaterThan(scoredItems[2].relevanceScore);
    });
  });

  describe('getOptimizedWeights', () => {
    it('should adjust weights based on content depth preference', () => {
      const detailedProfile = { ...mockUserProfile, contentDepth: 'detailed' as const };
      const briefProfile = { ...mockUserProfile, contentDepth: 'brief' as const };

      const detailedWeights = engine.getOptimizedWeights(detailedProfile);
      const briefWeights = engine.getOptimizedWeights(briefProfile);

      expect(detailedWeights.quality).toBeGreaterThan(briefWeights.quality);
      expect(briefWeights.recency).toBeGreaterThan(detailedWeights.recency);
    });

    it('should normalize weights to sum to 1', () => {
      const weights = engine.getOptimizedWeights(mockUserProfile);
      const sum = weights.relevance + weights.quality + weights.recency + weights.diversity;
      
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });
});