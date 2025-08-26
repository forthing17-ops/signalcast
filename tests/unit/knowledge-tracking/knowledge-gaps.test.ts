import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  analyzeKnowledgeGaps,
  analyzeTopicGaps,
  suggestNextLearningTopics,
} from '@/lib/knowledge-gaps';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    userKnowledge: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    userPreferences: {
      findUnique: vi.fn(),
    },
    $disconnect: vi.fn(),
  })),
}));

describe('Knowledge Gaps', () => {
  const mockPrisma = require('@prisma/client').PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock environment variables
    process.env.KNOWLEDGE_GAP_DETECTION_THRESHOLD = '0.3';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzeKnowledgeGaps', () => {
    it('should identify missing prerequisite topics', async () => {
      const prismaInstance = new mockPrisma();
      
      // User has React knowledge but missing JavaScript prerequisite
      prismaInstance.userKnowledge.findMany.mockResolvedValue([
        {
          topic: 'react',
          confidenceLevel: 0.8,
          contentCount: 5,
          lastInteraction: new Date(),
        },
      ]);

      prismaInstance.userPreferences.findUnique.mockResolvedValue({
        interests: ['react'],
        techStack: ['react'],
        curiosityAreas: [],
      });

      const result = await analyzeKnowledgeGaps('user-123');

      expect(result.identifiedGaps.some(gap => 
        gap.topic === 'javascript' && gap.gapType === 'prerequisite'
      )).toBe(true);

      expect(result.totalGaps).toBeGreaterThan(0);
      expect(result.recommendedActions.length).toBeGreaterThan(0);
    });

    it('should identify shallow knowledge areas', async () => {
      const prismaInstance = new mockPrisma();
      
      prismaInstance.userKnowledge.findMany.mockResolvedValue([
        {
          topic: 'javascript',
          confidenceLevel: 0.2, // Low confidence
          contentCount: 5, // But consumed content
          lastInteraction: new Date(),
        },
      ]);

      prismaInstance.userPreferences.findUnique.mockResolvedValue({
        interests: ['javascript'],
        techStack: [],
        curiosityAreas: [],
      });

      const result = await analyzeKnowledgeGaps('user-123');

      expect(result.identifiedGaps.some(gap => 
        gap.topic === 'javascript' && gap.gapType === 'shallow'
      )).toBe(true);
    });

    it('should identify outdated knowledge', async () => {
      const prismaInstance = new mockPrisma();
      
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 7); // 7 months ago
      
      prismaInstance.userKnowledge.findMany.mockResolvedValue([
        {
          topic: 'javascript',
          confidenceLevel: 0.9, // High confidence
          contentCount: 5,
          lastInteraction: oldDate, // But old interaction
        },
      ]);

      prismaInstance.userPreferences.findUnique.mockResolvedValue({
        interests: [],
        techStack: [],
        curiosityAreas: [],
      });

      const result = await analyzeKnowledgeGaps('user-123');

      expect(result.identifiedGaps.some(gap => 
        gap.topic === 'javascript' && gap.gapType === 'outdated'
      )).toBe(true);
    });

    it('should identify missing interest areas', async () => {
      const prismaInstance = new mockPrisma();
      
      prismaInstance.userKnowledge.findMany.mockResolvedValue([]);

      prismaInstance.userPreferences.findUnique.mockResolvedValue({
        interests: ['machine-learning'], // Interest but no knowledge
        techStack: [],
        curiosityAreas: ['ai'],
      });

      const result = await analyzeKnowledgeGaps('user-123');

      expect(result.identifiedGaps.some(gap => 
        gap.topic === 'machine-learning' && gap.gapType === 'missing'
      )).toBe(true);

      expect(result.identifiedGaps.some(gap => 
        gap.topic === 'ai' && gap.gapType === 'missing'
      )).toBe(true);
    });

    it('should prioritize gaps correctly', async () => {
      const prismaInstance = new mockPrisma();
      
      prismaInstance.userKnowledge.findMany.mockResolvedValue([
        {
          topic: 'react',
          confidenceLevel: 0.1, // Very low - should be high priority
          contentCount: 1,
          lastInteraction: new Date(),
        },
      ]);

      prismaInstance.userPreferences.findUnique.mockResolvedValue({
        interests: ['react'],
        techStack: [],
        curiosityAreas: [],
      });

      const result = await analyzeKnowledgeGaps('user-123');

      // Should be sorted by priority (critical first)
      const gaps = result.identifiedGaps;
      if (gaps.length > 1) {
        expect(gaps[0].severity).toBe('critical');
      }
    });

    it('should generate appropriate recommended actions', async () => {
      const prismaInstance = new mockPrisma();
      
      prismaInstance.userKnowledge.findMany.mockResolvedValue([]);

      prismaInstance.userPreferences.findUnique.mockResolvedValue({
        interests: ['system-design'], // Complex topic with prerequisites
        techStack: [],
        curiosityAreas: [],
      });

      const result = await analyzeKnowledgeGaps('user-123');

      expect(result.recommendedActions.some(action => 
        action.includes('prerequisite')
      )).toBe(true);
    });

    it('should create learning path based on dependencies', async () => {
      const prismaInstance = new mockPrisma();
      
      prismaInstance.userKnowledge.findMany.mockResolvedValue([]);

      prismaInstance.userPreferences.findUnique.mockResolvedValue({
        interests: ['nextjs'], // Has prerequisites: react, node.js
        techStack: [],
        curiosityAreas: [],
      });

      const result = await analyzeKnowledgeGaps('user-123');

      // Learning path should include prerequisites before dependent topics
      const learningPath = result.learningPath;
      expect(learningPath.length).toBeGreaterThan(0);
      
      // Should include foundational topics
      expect(learningPath.some(topic => ['javascript', 'react', 'node.js'].includes(topic))).toBe(true);
    });
  });

  describe('analyzeTopicGaps', () => {
    it('should identify missing prerequisites for a specific topic', async () => {
      const prismaInstance = new mockPrisma();
      
      // User wants to learn NextJS but missing prerequisites
      prismaInstance.userKnowledge.findUnique
        .mockResolvedValueOnce(null) // No React knowledge
        .mockResolvedValueOnce(null); // No Node.js knowledge

      const result = await analyzeTopicGaps('user-123', 'nextjs');

      expect(result.missingPrerequisites.length).toBeGreaterThan(0);
      expect(result.readinessScore).toBeLessThan(0.5);
      expect(result.blockers.length).toBeGreaterThan(0);
      expect(result.recommendedPreparation.length).toBeGreaterThan(0);
    });

    it('should calculate readiness score correctly', async () => {
      const prismaInstance = new mockPrisma();
      
      // User has some prerequisites for NextJS
      prismaInstance.userKnowledge.findUnique
        .mockResolvedValueOnce({ // Has React
          confidenceLevel: 0.8,
        })
        .mockResolvedValueOnce(null); // Missing Node.js

      const result = await analyzeTopicGaps('user-123', 'nextjs');

      // Should be 50% ready (1 of 2 prerequisites met)
      expect(result.readinessScore).toBeCloseTo(0.5, 1);
      expect(result.blockers).toContain('Missing knowledge in node.js');
    });

    it('should handle topics with no defined prerequisites', async () => {
      const result = await analyzeTopicGaps('user-123', 'unknown-topic');

      expect(result.readinessScore).toBe(1.0);
      expect(result.missingPrerequisites).toHaveLength(0);
      expect(result.blockers).toHaveLength(0);
    });
  });

  describe('suggestNextLearningTopics', () => {
    it('should suggest topics user is ready to learn', async () => {
      const prismaInstance = new mockPrisma();
      
      // User has JavaScript knowledge, ready for TypeScript
      prismaInstance.userKnowledge.findMany.mockResolvedValue([
        {
          topic: 'javascript',
          confidenceLevel: 0.8, // Meets threshold
        },
      ]);

      const result = await suggestNextLearningTopics('user-123', 5);

      expect(result.some(suggestion => 
        suggestion.topic === 'typescript' && suggestion.readinessScore >= 0.8
      )).toBe(true);
    });

    it('should prioritize by importance and readiness', async () => {
      const prismaInstance = new mockPrisma();
      
      prismaInstance.userKnowledge.findMany.mockResolvedValue([
        { topic: 'javascript', confidenceLevel: 0.8 },
        { topic: 'html', confidenceLevel: 0.8 },
        { topic: 'css', confidenceLevel: 0.8 },
      ]);

      const result = await suggestNextLearningTopics('user-123', 3);

      expect(result).toHaveLength(3);
      expect(result[0].priority).toBeGreaterThanOrEqual(result[1].priority);
    });

    it('should not suggest topics user already knows', async () => {
      const prismaInstance = new mockPrisma();
      
      prismaInstance.userKnowledge.findMany.mockResolvedValue([
        { topic: 'javascript', confidenceLevel: 0.8 },
        { topic: 'react', confidenceLevel: 0.7 }, // Already knows React
      ]);

      const result = await suggestNextLearningTopics('user-123', 5);

      expect(result.every(suggestion => suggestion.topic !== 'react')).toBe(true);
    });

    it('should limit results to specified count', async () => {
      const prismaInstance = new mockPrisma();
      
      prismaInstance.userKnowledge.findMany.mockResolvedValue([
        { topic: 'javascript', confidenceLevel: 0.9 },
        { topic: 'html', confidenceLevel: 0.9 },
        { topic: 'css', confidenceLevel: 0.9 },
        { topic: 'programming-basics', confidenceLevel: 0.9 },
      ]);

      const result = await suggestNextLearningTopics('user-123', 2);

      expect(result).toHaveLength(2);
    });

    it('should include reasoning for suggestions', async () => {
      const prismaInstance = new mockPrisma();
      
      prismaInstance.userKnowledge.findMany.mockResolvedValue([
        { topic: 'javascript', confidenceLevel: 0.8 },
      ]);

      const result = await suggestNextLearningTopics('user-123', 3);

      result.forEach(suggestion => {
        expect(suggestion.reasoning).toBeTruthy();
        expect(suggestion.reasoning).toContain('prerequisites met');
      });
    });
  });
});