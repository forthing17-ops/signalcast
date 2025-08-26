import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EmbeddingResponse {
  embedding: number[];
  tokens: number;
}

export interface EmbeddingCacheEntry {
  text: string;
  embedding: number[];
  model: string;
  created_at: Date;
}

/**
 * Generate vector embeddings for text content using OpenAI's text-embedding-3-small model
 */
export async function generateEmbeddings(
  text: string,
  model: string = 'text-embedding-3-small',
  dimensions: number = 1536
): Promise<EmbeddingResponse> {
  try {
    const response = await openai.embeddings.create({
      model,
      input: text.trim(),
      dimensions,
    });

    const embedding = response.data[0]?.embedding;
    if (!embedding) {
      throw new Error('No embedding returned from OpenAI API');
    }

    return {
      embedding,
      tokens: response.usage.total_tokens,
    };
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error('Failed to generate embeddings');
  }
}

/**
 * Generate embeddings for multiple texts in a batch
 */
export async function batchGenerateEmbeddings(
  texts: string[],
  model: string = 'text-embedding-3-small',
  dimensions: number = 1536
): Promise<EmbeddingResponse[]> {
  if (texts.length === 0) {
    return [];
  }

  try {
    const response = await openai.embeddings.create({
      model,
      input: texts.map(text => text.trim()),
      dimensions,
    });

    return response.data.map(item => ({
      embedding: item.embedding,
      tokens: response.usage.total_tokens / response.data.length, // Approximate tokens per text
    }));
  } catch (error) {
    console.error('Error in batch generating embeddings:', error);
    throw new Error('Failed to generate batch embeddings');
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Prepare text content for embedding generation by cleaning and normalizing
 */
export function prepareTextForEmbedding(content: {
  title?: string;
  summary?: string;
  content?: string;
  topics?: string[];
}): string {
  const parts: string[] = [];

  if (content.title) {
    parts.push(`Title: ${content.title}`);
  }

  if (content.summary) {
    parts.push(`Summary: ${content.summary}`);
  }

  if (content.content) {
    // Truncate content to avoid token limits
    const truncatedContent = content.content.length > 2000 
      ? content.content.substring(0, 2000) + '...'
      : content.content;
    parts.push(`Content: ${truncatedContent}`);
  }

  if (content.topics && content.topics.length > 0) {
    parts.push(`Topics: ${content.topics.join(', ')}`);
  }

  return parts.join('\n\n');
}

/**
 * Check if embeddings are cached and valid
 */
export function isEmbeddingCacheValid(
  cachedEmbedding: any,
  maxAgeHours: number = 24 * 7 // 1 week default
): boolean {
  if (!cachedEmbedding || !cachedEmbedding.embedding || !cachedEmbedding.created_at) {
    return false;
  }

  const cacheAge = Date.now() - new Date(cachedEmbedding.created_at).getTime();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

  return cacheAge < maxAgeMs;
}

/**
 * Create embedding cache entry
 */
export function createEmbeddingCache(
  text: string,
  embedding: number[],
  model: string = 'text-embedding-3-small'
): EmbeddingCacheEntry {
  return {
    text,
    embedding,
    model,
    created_at: new Date(),
  };
}