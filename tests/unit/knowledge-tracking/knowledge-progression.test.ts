import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  analyzeProgressionReadiness,
  analyzeContentComplexity,
  recommendContentDepth,
} from '@/lib/knowledge-progression';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    userKnowledge: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    $disconnect: vi.fn(),
  })),
}));

describe('Knowledge Progression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock environment variables
    process.env.KNOWLEDGE_PROGRESSION_MIN_CONTENT = '3';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeProgressionReadiness', () => {
    it('should indicate readiness for progression with sufficient confidence and content', () => {
      const result = analyzeProgressionReadiness(0.8, 5, 'beginner');

      expect(result.canProgress).toBe(true);
      expect(result.nextLevel).toBe('intermediate');
      expect(result.blockers).toHaveLength(0);
      expect(result.currentProgress).toBeGreaterThan(0.9);
    });

    it('should block progression with insufficient confidence', () => {
      const result = analyzeProgressionReadiness(0.4, 5, 'beginner');

      expect(result.canProgress).toBe(false);
      expect(result.blockers).toContain('Confidence level too low');
    });

    it('should block progression with insufficient content count', () => {
      const result = analyzeProgressionReadiness(0.8, 1, 'beginner');

      expect(result.canProgress).toBe(false);
      expect(result.blockers).toContain('Need 2 more pieces of content');
    });

    it('should handle intermediate to advanced progression', () => {
      const result = analyzeProgressionReadiness(0.9, 5, 'intermediate');

      expect(result.canProgress).toBe(true);
      expect(result.nextLevel).toBe('advanced');
    });

    it('should handle advanced level (no further progression)', () => {
      const result = analyzeProgressionReadiness(0.9, 5, 'advanced');

      expect(result.canProgress).toBe(true); // Always true for max level
      expect(result.nextLevel).toBe(null);
      expect(result.currentProgress).toBe(1.0);
    });

    it('should calculate progression score correctly', () => {
      // Test with exact threshold values
      const result = analyzeProgressionReadiness(0.7, 3, 'beginner');
      
      // Should be exactly at threshold (0.7 for beginner to intermediate)
      expect(result.currentProgress).toBeCloseTo(1.0, 1);
    });
  });

  describe('analyzeContentComplexity', () => {
    it('should identify simple content as beginner level', async () => {
      const content = {
        title: 'Getting Started with JavaScript',
        summary: 'Learn the basics of JavaScript programming',
        content: 'JavaScript is a programming language. It runs in browsers. You can write simple scripts.',
        topics: ['javascript', 'programming', 'basics'],
      };

      const analysis = await analyzeContentComplexity(content);

      expect(analysis.difficulty).toBe('easy');
      expect(analysis.recommendedDepth).toBe('beginner');
      expect(analysis.complexityScore).toBeLessThan(0.3);
    });

    it('should identify complex content as advanced level', async () => {
      const content = {
        title: 'Advanced Microservices Architecture Optimization',
        summary: 'Implementing sophisticated distributed system patterns for enterprise scalability',
        content: `This comprehensive implementation demonstrates advanced architectural patterns including 
                 event sourcing, CQRS, distributed transactions, and advanced optimization techniques.
                 The implementation leverages sophisticated algorithms for load balancing and 
                 fault tolerance mechanisms. Code blocks demonstrate complex patterns:
                 \`\`\`javascript
                 // Complex implementation
                 \`\`\``,
        topics: ['microservices', 'advanced-architecture', 'expert-patterns'],
      };

      const analysis = await analyzeContentComplexity(content);

      expect(analysis.difficulty).toBe('hard');
      expect(analysis.recommendedDepth).toBe('advanced');
      expect(analysis.complexityScore).toBeGreaterThan(0.7);
      expect(analysis.concepts).toContain('microservices');
    });

    it('should detect technical terms and code blocks', async () => {
      const content = {
        title: 'API Development',
        summary: 'Building RESTful APIs',
        content: `Learn about API design patterns, SDK integration, and framework optimization.
                 \`\`\`python
                 def example():
                     pass
                 \`\`\``,
        topics: ['api', 'development'],
      };

      const analysis = await analyzeContentComplexity(content);

      expect(analysis.concepts).toContain('api');
      expect(analysis.complexityScore).toBeGreaterThan(0.3); // Should detect technical content
    });

    it('should handle empty or minimal content', async () => {
      const content = {
        title: 'Test',
        summary: '',
        content: 'Short content.',
        topics: [],
      };

      const analysis = await analyzeContentComplexity(content);

      expect(analysis.difficulty).toBe('easy');
      expect(analysis.complexityScore).toBeLessThan(0.3);
    });

    it('should extract prerequisites from content context', async () => {
      const content = {
        title: 'Advanced React Patterns',
        summary: 'Building on basic React knowledge',
        content: 'This assumes you know JavaScript fundamentals and basic React concepts.',
        topics: ['react', 'advanced'],
      };

      const analysis = await analyzeContentComplexity(content);

      expect(analysis.difficulty).toBe('medium');
      expect(analysis.concepts).toContain('react');
    });
  });

  describe('recommendContentDepth', () => {
    const mockPrisma = require('@prisma/client').PrismaClient;

    it('should recommend beginner for users with no knowledge', async () => {
      const prismaInstance = new mockPrisma();
      prismaInstance.userKnowledge.findMany.mockResolvedValue([]);

      const result = await recommendContentDepth('user-123', ['javascript']);

      expect(result.recommendedDepth).toBe('beginner');
      expect(result.userReadiness).toBeLessThan(0.4);
      expect(result.reasoning).toContain('No prior knowledge in related topics');
    });

    it('should recommend intermediate for users with some knowledge', async () => {
      const prismaInstance = new mockPrisma();
      prismaInstance.userKnowledge.findMany.mockResolvedValue([
        {
          topic: 'javascript',
          knowledgeDepth: 'beginner',
          confidenceLevel: 0.7,
        },
      ]);

      const result = await recommendContentDepth('user-123', ['javascript']);

      expect(result.recommendedDepth).toBe('intermediate');
      expect(result.userReadiness).toBeGreaterThan(0.4);
      expect(result.userReadiness).toBeLessThan(0.7);
      expect(result.reasoning.some(r => r.includes('Moderate knowledge'))).toBe(true);
    });

    it('should recommend advanced for experienced users', async () => {
      const prismaInstance = new mockPrisma();
      prismaInstance.userKnowledge.findMany.mockResolvedValue([
        {
          topic: 'javascript',
          knowledgeDepth: 'advanced',
          confidenceLevel: 0.9,
        },
        {
          topic: 'programming',
          knowledgeDepth: 'intermediate',
          confidenceLevel: 0.8,
        },
      ]);

      const result = await recommendContentDepth('user-123', ['javascript', 'programming']);

      expect(result.recommendedDepth).toBe('advanced');
      expect(result.userReadiness).toBeGreaterThan(0.7);
      expect(result.reasoning.some(r => r.includes('Strong knowledge'))).toBe(true);
    });

    it('should calculate weighted averages correctly', async () => {
      const prismaInstance = new mockPrisma();
      prismaInstance.userKnowledge.findMany.mockResolvedValue([
        {
          topic: 'topic1',
          knowledgeDepth: 'beginner',    // 0.3
          confidenceLevel: 0.5,
        },
        {
          topic: 'topic2',
          knowledgeDepth: 'advanced',    // 1.0
          confidenceLevel: 0.8,
        },
      ]);

      const result = await recommendContentDepth('user-123', ['topic1', 'topic2']);

      // Average depth: (0.3 + 1.0) / 2 = 0.65
      // Average confidence: (0.5 + 0.8) / 2 = 0.65
      // User readiness: (0.65 * 0.6) + (0.65 * 0.4) = 0.65
      expect(result.userReadiness).toBeCloseTo(0.65, 1);
    });

    it('should include reasoning about knowledge levels', async () => {
      const prismaInstance = new mockPrisma();
      prismaInstance.userKnowledge.findMany.mockResolvedValue([
        {
          topic: 'javascript',
          knowledgeDepth: 'intermediate',
          confidenceLevel: 0.6,
        },
      ]);

      const result = await recommendContentDepth('user-123', ['javascript']);

      expect(result.reasoning).toContain('Average knowledge depth: 0.60');
      expect(result.reasoning).toContain('Average confidence: 0.60');
    });
  });
});