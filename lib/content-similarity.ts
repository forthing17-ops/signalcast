import { PrismaClient } from '@prisma/client';
import {
  generateEmbeddings,
  cosineSimilarity,
  prepareTextForEmbedding,
  isEmbeddingCacheValid,
  createEmbeddingCache
} from './vector-embeddings';

const prisma = new PrismaClient();

export interface ContentSimilarityResult {
  contentId1: string;
  contentId2: string;
  similarityScore: number;
  comparisonType: 'semantic' | 'topical' | 'thematic';
  isNewComparison: boolean;
}

export interface SimilarityThresholds {
  high: number; // 0.8+ considered very similar
  medium: number; // 0.6+ considered moderately similar
  low: number; // 0.4+ considered somewhat similar
}

export const DEFAULT_SIMILARITY_THRESHOLDS: SimilarityThresholds = {
  high: parseFloat(process.env.KNOWLEDGE_SIMILARITY_THRESHOLD || '0.8'),
  medium: 0.6,
  low: 0.4,
};

/**
 * Get or generate embedding for content
 */
async function getContentEmbedding(contentId: string): Promise<number[]> {
  // First, get the content from database
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: {
      title: true,
      summary: true,
      content: true,
      topics: true,
      vectorEmbedding: true,
    },
  });

  if (!content) {
    throw new Error(`Content not found: ${contentId}`);
  }

  // Check if we have cached embeddings
  if (content.vectorEmbedding && isEmbeddingCacheValid(content.vectorEmbedding)) {
    return (content.vectorEmbedding as { embedding: number[] }).embedding;
  }

  // Generate new embedding
  const textForEmbedding = prepareTextForEmbedding({
    title: content.title,
    summary: content.summary,
    content: content.content,
    topics: content.topics,
  });

  const { embedding } = await generateEmbeddings(textForEmbedding);

  // Cache the embedding in the database
  const embeddingCache = createEmbeddingCache(textForEmbedding, embedding);
  await prisma.content.update({
    where: { id: contentId },
    data: {
      vectorEmbedding: embeddingCache,
    },
  });

  return embedding;
}

/**
 * Compare similarity between two pieces of content
 */
export async function compareContentSimilarity(
  contentId1: string,
  contentId2: string,
  comparisonType: 'semantic' | 'topical' | 'thematic' = 'semantic'
): Promise<ContentSimilarityResult> {
  // Check if this comparison already exists
  const existingComparison = await prisma.contentSimilarity.findUnique({
    where: {
      contentId1_contentId2: {
        contentId1,
        contentId2,
      },
    },
  });

  if (existingComparison) {
    return {
      contentId1,
      contentId2,
      similarityScore: existingComparison.similarityScore,
      comparisonType: existingComparison.comparisonType as 'semantic' | 'topical' | 'thematic',
      isNewComparison: false,
    };
  }

  // Generate embeddings for both content pieces
  const [embedding1, embedding2] = await Promise.all([
    getContentEmbedding(contentId1),
    getContentEmbedding(contentId2),
  ]);

  // Calculate similarity
  const similarityScore = cosineSimilarity(embedding1, embedding2);

  // Store the comparison result
  await prisma.contentSimilarity.create({
    data: {
      contentId1,
      contentId2,
      similarityScore,
      comparisonType,
    },
  });

  return {
    contentId1,
    contentId2,
    similarityScore,
    comparisonType,
    isNewComparison: true,
  };
}

/**
 * Find similar content for a given content piece
 */
export async function findSimilarContent(
  contentId: string,
  userId: string,
  options: {
    threshold?: number;
    limit?: number;
    excludeDelivered?: boolean;
  } = {}
): Promise<ContentSimilarityResult[]> {
  const {
    threshold = DEFAULT_SIMILARITY_THRESHOLDS.medium,
    limit = 10,
    excludeDelivered = true,
  } = options;

  // Get all user's content to compare against
  const userContent = await prisma.content.findMany({
    where: {
      createdBy: userId,
      id: { not: contentId },
      ...(excludeDelivered ? { delivered: false } : {}),
    },
    select: { id: true },
  });

  const similarities: ContentSimilarityResult[] = [];

  // First, check for existing similarity comparisons to avoid redundant OpenAI calls
  const existingSimilarities = await prisma.contentSimilarity.findMany({
    where: {
      OR: [
        { contentId1: contentId, contentId2: { in: userContent.map(c => c.id) } },
        { contentId2: contentId, contentId1: { in: userContent.map(c => c.id) } },
      ],
    },
  });

  // Create a map for quick lookups
  const similarityMap = new Map<string, number>();
  existingSimilarities.forEach(sim => {
    const key = sim.contentId1 === contentId 
      ? sim.contentId2 
      : sim.contentId1;
    similarityMap.set(key, sim.similarityScore);
  });

  // Process comparisons, using cached results where available
  for (const content of userContent) {
    let similarity: ContentSimilarityResult;
    
    if (similarityMap.has(content.id)) {
      // Use cached similarity
      similarity = {
        contentId1: contentId,
        contentId2: content.id,
        similarityScore: similarityMap.get(content.id)!,
        comparisonType: 'semantic',
        isNewComparison: false,
      };
    } else {
      // Compute new similarity
      similarity = await compareContentSimilarity(contentId, content.id);
    }
    
    if (similarity.similarityScore >= threshold) {
      similarities.push(similarity);
    }
  }

  // Sort by similarity score (highest first) and limit results
  return similarities
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

/**
 * Detect if content is too similar to previously delivered content
 */
export async function detectRepetitiveContent(
  contentId: string,
  userId: string,
  noveltyPreference: number = 0.7
): Promise<{
  isRepetitive: boolean;
  similarContent: ContentSimilarityResult[];
  threshold: number;
}> {
  // Adjust threshold based on user's novelty preference
  // Higher novelty preference = lower tolerance for similarity
  const adjustedThreshold = DEFAULT_SIMILARITY_THRESHOLDS.high - (noveltyPreference * 0.2);

  // Find delivered content that's similar
  const similarContent = await findSimilarContent(contentId, userId, {
    threshold: adjustedThreshold,
    limit: 5,
    excludeDelivered: false,
  });

  // Filter to only delivered content
  const deliveredSimilarContent = await Promise.all(
    similarContent.map(async (sim) => {
      const content = await prisma.content.findUnique({
        where: { id: sim.contentId2 },
        select: { delivered: true },
      });
      return content?.delivered ? sim : null;
    })
  );

  const filteredSimilarContent = deliveredSimilarContent.filter(Boolean) as ContentSimilarityResult[];

  return {
    isRepetitive: filteredSimilarContent.length > 0,
    similarContent: filteredSimilarContent,
    threshold: adjustedThreshold,
  };
}

/**
 * Batch compare multiple content pieces
 */
export async function batchCompareContentSimilarity(
  contentPairs: Array<{ contentId1: string; contentId2: string }>,
  comparisonType: 'semantic' | 'topical' | 'thematic' = 'semantic'
): Promise<ContentSimilarityResult[]> {
  const results: ContentSimilarityResult[] = [];

  // Process in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < contentPairs.length; i += batchSize) {
    const batch = contentPairs.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(pair =>
        compareContentSimilarity(pair.contentId1, pair.contentId2, comparisonType)
      )
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Get similarity statistics for a user
 */
export async function getUserSimilarityStats(userId: string): Promise<{
  totalComparisons: number;
  averageSimilarity: number;
  highSimilarityCount: number;
  repetitiveContentCount: number;
}> {
  // Get all content for this user
  const userContent = await prisma.content.findMany({
    where: { createdBy: userId },
    select: { id: true },
  });

  const contentIds = userContent.map(c => c.id);

  // Get all similarity comparisons involving this user's content
  const similarities = await prisma.contentSimilarity.findMany({
    where: {
      OR: [
        { contentId1: { in: contentIds } },
        { contentId2: { in: contentIds } },
      ],
    },
  });

  const totalComparisons = similarities.length;
  const averageSimilarity = totalComparisons > 0
    ? similarities.reduce((sum, s) => sum + s.similarityScore, 0) / totalComparisons
    : 0;
  const highSimilarityCount = similarities.filter(
    s => s.similarityScore >= DEFAULT_SIMILARITY_THRESHOLDS.high
  ).length;
  const repetitiveContentCount = similarities.filter(
    s => s.similarityScore >= DEFAULT_SIMILARITY_THRESHOLDS.high
  ).length;

  return {
    totalComparisons,
    averageSimilarity,
    highSimilarityCount,
    repetitiveContentCount,
  };
}