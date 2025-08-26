import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock OpenAI - must be before imports
const mockEmbeddingsCreate = vi.fn();
vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      embeddings: {
        create: mockEmbeddingsCreate,
      },
    })),
  };
});

import {
  generateEmbeddings,
  batchGenerateEmbeddings,
  cosineSimilarity,
  prepareTextForEmbedding,
  isEmbeddingCacheValid,
  createEmbeddingCache,
} from '@/lib/vector-embeddings';

describe('Vector Embeddings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for text input', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
        usage: { total_tokens: 10 },
      });

      const result = await generateEmbeddings('test content');

      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
      });

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test content',
        dimensions: 1536,
      });
    });

    it('should handle API errors gracefully', async () => {
      mockEmbeddingsCreate.mockRejectedValue(new Error('API Error'));

      await expect(generateEmbeddings('test')).rejects.toThrow('Failed to generate embeddings');
    });

    it('should throw error when no embedding is returned', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [],
        usage: { total_tokens: 10 },
      });

      await expect(generateEmbeddings('test')).rejects.toThrow('No embedding returned from OpenAI API');
    });
  });

  describe('batchGenerateEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      mockEmbeddingsCreate.mockResolvedValue({
        data: [
          { embedding: [0.1, 0.2, 0.3] },
          { embedding: [0.4, 0.5, 0.6] },
        ],
        usage: { total_tokens: 20 },
      });

      const result = await batchGenerateEmbeddings(['text1', 'text2']);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        embedding: [0.1, 0.2, 0.3],
        tokens: 10, // total_tokens / data.length
      });
      expect(result[1]).toEqual({
        embedding: [0.4, 0.5, 0.6],
        tokens: 10,
      });
    });

    it('should return empty array for empty input', async () => {
      const result = await batchGenerateEmbeddings([]);
      expect(result).toEqual([]);
    });
  });

  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBe(0); // Orthogonal vectors
    });

    it('should return 1 for identical vectors', () => {
      const vector = [1, 2, 3];
      const similarity = cosineSimilarity(vector, vector);
      expect(similarity).toBeCloseTo(1, 5);
    });

    it('should return 0 for zero magnitude vectors', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [0, 0, 0];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBe(0);
    });

    it('should throw error for vectors of different lengths', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [1, 2];
      
      expect(() => cosineSimilarity(vectorA, vectorB))
        .toThrow('Vectors must have the same length');
    });
  });

  describe('prepareTextForEmbedding', () => {
    it('should combine all content fields with labels', () => {
      const content = {
        title: 'Test Title',
        summary: 'Test Summary',
        content: 'Test Content',
        topics: ['topic1', 'topic2'],
      };

      const result = prepareTextForEmbedding(content);
      
      expect(result).toBe(
        'Title: Test Title\n\n' +
        'Summary: Test Summary\n\n' +
        'Content: Test Content\n\n' +
        'Topics: topic1, topic2'
      );
    });

    it('should handle missing fields gracefully', () => {
      const content = {
        title: 'Test Title',
      };

      const result = prepareTextForEmbedding(content);
      expect(result).toBe('Title: Test Title');
    });

    it('should truncate long content', () => {
      const longContent = 'a'.repeat(3000);
      const content = {
        title: 'Test',
        content: longContent,
      };

      const result = prepareTextForEmbedding(content);
      expect(result.length).toBeLessThan(2100); // Should be truncated
      expect(result).toContain('...');
    });

    it('should handle empty topics array', () => {
      const content = {
        title: 'Test',
        topics: [],
      };

      const result = prepareTextForEmbedding(content);
      expect(result).toBe('Title: Test');
    });
  });

  describe('isEmbeddingCacheValid', () => {
    it('should return true for valid recent cache', () => {
      const cache = {
        embedding: [0.1, 0.2, 0.3],
        created_at: new Date(),
      };

      const isValid = isEmbeddingCacheValid(cache, 24);
      expect(isValid).toBe(true);
    });

    it('should return false for expired cache', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2); // 2 days ago
      
      const cache = {
        embedding: [0.1, 0.2, 0.3],
        created_at: oldDate,
      };

      const isValid = isEmbeddingCacheValid(cache, 24); // 24 hours max age
      expect(isValid).toBe(false);
    });

    it('should return false for invalid cache structure', () => {
      const invalidCache = {
        embedding: null,
        created_at: new Date(),
      };

      const isValid = isEmbeddingCacheValid(invalidCache);
      expect(isValid).toBe(false);
    });

    it('should return false for null/undefined cache', () => {
      expect(isEmbeddingCacheValid(null)).toBe(false);
      expect(isEmbeddingCacheValid(undefined)).toBe(false);
    });
  });

  describe('createEmbeddingCache', () => {
    it('should create valid cache entry', () => {
      const text = 'test text';
      const embedding = [0.1, 0.2, 0.3];
      const model = 'test-model';

      const cache = createEmbeddingCache(text, embedding, model);

      expect(cache).toMatchObject({
        text,
        embedding,
        model,
      });
      expect(cache.created_at).toBeInstanceOf(Date);
      expect(cache.created_at.getTime()).toBeCloseTo(Date.now(), -1000); // Within 1 second
    });

    it('should use default model when not provided', () => {
      const cache = createEmbeddingCache('test', [0.1, 0.2]);
      expect(cache.model).toBe('text-embedding-3-small');
    });
  });
});