import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type KnowledgeDepth = 'beginner' | 'intermediate' | 'advanced';

export interface UserKnowledgeState {
  topic: string;
  confidenceLevel: number;
  contentCount: number;
  knowledgeDepth: KnowledgeDepth;
  lastInteraction: Date;
  progressionScore: number; // 0-1 scale indicating readiness for next level
}

export interface ContentComplexityAnalysis {
  complexityScore: number; // 0-1 scale
  recommendedDepth: KnowledgeDepth;
  prerequisites: string[];
  concepts: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ProgressionRecommendation {
  canProgress: boolean;
  nextLevel: KnowledgeDepth | null;
  requiredContentCount: number;
  currentProgress: number;
  blockers: string[];
}

const PROGRESSION_THRESHOLDS = {
  MIN_CONTENT_COUNT: parseInt(process.env.KNOWLEDGE_PROGRESSION_MIN_CONTENT || '3'),
  BEGINNER_TO_INTERMEDIATE: 0.7,
  INTERMEDIATE_TO_ADVANCED: 0.8,
  CONFIDENCE_THRESHOLD: 0.6,
};

/**
 * Get user's knowledge state for a specific topic
 */
export async function getUserKnowledgeForTopic(
  userId: string,
  topic: string
): Promise<UserKnowledgeState | null> {
  const knowledge = await prisma.userKnowledge.findUnique({
    where: {
      userId_topic: {
        userId,
        topic,
      },
    },
  });

  if (!knowledge) {
    return null;
  }

  const progressionScore = calculateProgressionScore(
    knowledge.confidenceLevel,
    knowledge.contentCount,
    knowledge.knowledgeDepth
  );

  return {
    topic: knowledge.topic,
    confidenceLevel: knowledge.confidenceLevel,
    contentCount: knowledge.contentCount,
    knowledgeDepth: knowledge.knowledgeDepth as KnowledgeDepth,
    lastInteraction: knowledge.lastInteraction,
    progressionScore,
  };
}

/**
 * Update user's knowledge after consuming content
 */
export async function updateUserKnowledge(
  userId: string,
  topic: string,
  contentInteraction: {
    wasHelpful?: boolean;
    difficulty?: 'easy' | 'medium' | 'hard';
    timeSpent?: number; // in minutes
    comprehension?: number; // 0-1 scale
  }
): Promise<UserKnowledgeState> {
  const existing = await prisma.userKnowledge.findUnique({
    where: {
      userId_topic: {
        userId,
        topic,
      },
    },
  });

  let newConfidenceLevel: number;
  let newContentCount: number;
  let newDepth: KnowledgeDepth;

  if (existing) {
    // Update existing knowledge
    newContentCount = existing.contentCount + 1;
    
    // Adjust confidence based on interaction
    let confidenceAdjustment = 0.05; // Base increase for consuming content
    
    if (contentInteraction.wasHelpful === false) {
      confidenceAdjustment -= 0.02;
    }
    
    if (contentInteraction.difficulty) {
      switch (contentInteraction.difficulty) {
        case 'easy':
          confidenceAdjustment += 0.01;
          break;
        case 'hard':
          confidenceAdjustment += 0.03; // Learning hard content builds more confidence
          break;
      }
    }
    
    if (contentInteraction.comprehension !== undefined) {
      confidenceAdjustment += (contentInteraction.comprehension - 0.5) * 0.1;
    }
    
    newConfidenceLevel = Math.max(0, Math.min(1, existing.confidenceLevel + confidenceAdjustment));
    
    // Check for depth progression
    const progressionRec = analyzeProgressionReadiness(
      newConfidenceLevel,
      newContentCount,
      existing.knowledgeDepth as KnowledgeDepth
    );
    
    newDepth = progressionRec.canProgress && progressionRec.nextLevel 
      ? progressionRec.nextLevel 
      : existing.knowledgeDepth as KnowledgeDepth;
  } else {
    // Create new knowledge entry
    newContentCount = 1;
    newConfidenceLevel = contentInteraction.comprehension || 0.3; // Start with low confidence
    newDepth = 'beginner';
  }

  const updated = await prisma.userKnowledge.upsert({
    where: {
      userId_topic: {
        userId,
        topic,
      },
    },
    create: {
      userId,
      topic,
      confidenceLevel: newConfidenceLevel,
      contentCount: newContentCount,
      knowledgeDepth: newDepth,
      lastInteraction: new Date(),
    },
    update: {
      confidenceLevel: newConfidenceLevel,
      contentCount: newContentCount,
      knowledgeDepth: newDepth,
      lastInteraction: new Date(),
    },
  });

  const progressionScore = calculateProgressionScore(
    newConfidenceLevel,
    newContentCount,
    newDepth
  );

  return {
    topic: updated.topic,
    confidenceLevel: updated.confidenceLevel,
    contentCount: updated.contentCount,
    knowledgeDepth: updated.knowledgeDepth as KnowledgeDepth,
    lastInteraction: updated.lastInteraction,
    progressionScore,
  };
}

/**
 * Calculate progression readiness score
 */
function calculateProgressionScore(
  confidenceLevel: number,
  contentCount: number,
  currentDepth: KnowledgeDepth
): number {
  const minContentFactor = Math.min(1, contentCount / PROGRESSION_THRESHOLDS.MIN_CONTENT_COUNT);
  const confidenceFactor = confidenceLevel;
  
  let threshold: number;
  switch (currentDepth) {
    case 'beginner':
      threshold = PROGRESSION_THRESHOLDS.BEGINNER_TO_INTERMEDIATE;
      break;
    case 'intermediate':
      threshold = PROGRESSION_THRESHOLDS.INTERMEDIATE_TO_ADVANCED;
      break;
    case 'advanced':
      return 1.0; // Already at max level
    default:
      threshold = PROGRESSION_THRESHOLDS.BEGINNER_TO_INTERMEDIATE;
  }
  
  const baseScore = (minContentFactor * 0.3) + (confidenceFactor * 0.7);
  return baseScore / threshold;
}

/**
 * Analyze if user is ready for progression to next knowledge level
 */
export function analyzeProgressionReadiness(
  confidenceLevel: number,
  contentCount: number,
  currentDepth: KnowledgeDepth
): ProgressionRecommendation {
  const progressionScore = calculateProgressionScore(confidenceLevel, contentCount, currentDepth);
  const blockers: string[] = [];
  
  if (contentCount < PROGRESSION_THRESHOLDS.MIN_CONTENT_COUNT) {
    blockers.push(`Need ${PROGRESSION_THRESHOLDS.MIN_CONTENT_COUNT - contentCount} more pieces of content`);
  }
  
  if (confidenceLevel < PROGRESSION_THRESHOLDS.CONFIDENCE_THRESHOLD) {
    blockers.push('Confidence level too low');
  }
  
  let nextLevel: KnowledgeDepth | null = null;
  let canProgress = false;
  let threshold: number;
  
  switch (currentDepth) {
    case 'beginner':
      nextLevel = 'intermediate';
      threshold = PROGRESSION_THRESHOLDS.BEGINNER_TO_INTERMEDIATE;
      break;
    case 'intermediate':
      nextLevel = 'advanced';
      threshold = PROGRESSION_THRESHOLDS.INTERMEDIATE_TO_ADVANCED;
      break;
    case 'advanced':
      nextLevel = null;
      threshold = 1.0;
      break;
    default:
      nextLevel = 'intermediate';
      threshold = PROGRESSION_THRESHOLDS.BEGINNER_TO_INTERMEDIATE;
  }
  
  canProgress = blockers.length === 0 && progressionScore >= 1.0;
  
  return {
    canProgress,
    nextLevel,
    requiredContentCount: PROGRESSION_THRESHOLDS.MIN_CONTENT_COUNT,
    currentProgress: progressionScore,
    blockers,
  };
}

/**
 * Analyze content complexity and recommend appropriate knowledge depth
 */
export async function analyzeContentComplexity(content: {
  title: string;
  summary: string;
  content: string;
  topics: string[];
}): Promise<ContentComplexityAnalysis> {
  // Simple heuristic-based complexity analysis
  // In a more sophisticated system, this could use AI/ML models
  
  let complexityScore = 0;
  const concepts: string[] = [];
  const prerequisites: string[] = [];
  
  // Analyze text complexity
  const wordCount = content.content.split(' ').length;
  const avgWordLength = content.content.split(' ').reduce((sum, word) => sum + word.length, 0) / wordCount;
  const sentenceCount = content.content.split(/[.!?]+/).length;
  const avgSentenceLength = wordCount / sentenceCount;
  
  // Technical indicators
  const technicalTerms = content.content.match(/\b(API|SDK|framework|architecture|algorithm|implementation|optimization|scalability|deployment|infrastructure)\b/gi) || [];
  const codeBlocks = content.content.match(/```[\s\S]*?```/g) || [];
  
  // Complexity scoring
  if (avgWordLength > 6) complexityScore += 0.2;
  if (avgSentenceLength > 20) complexityScore += 0.2;
  if (technicalTerms.length > 5) complexityScore += 0.3;
  if (codeBlocks.length > 0) complexityScore += 0.2;
  if (content.topics.some(topic => ['advanced', 'expert', 'senior'].some(level => topic.toLowerCase().includes(level)))) {
    complexityScore += 0.3;
  }
  
  // Extract concepts and prerequisites
  concepts.push(...content.topics);
  concepts.push(...technicalTerms.map(term => term.toLowerCase()));
  
  // Determine difficulty and recommended depth
  let difficulty: 'easy' | 'medium' | 'hard';
  let recommendedDepth: KnowledgeDepth;
  
  if (complexityScore < 0.3) {
    difficulty = 'easy';
    recommendedDepth = 'beginner';
  } else if (complexityScore < 0.7) {
    difficulty = 'medium';
    recommendedDepth = 'intermediate';
  } else {
    difficulty = 'hard';
    recommendedDepth = 'advanced';
  }
  
  return {
    complexityScore: Math.min(1, complexityScore),
    recommendedDepth,
    prerequisites: [...new Set(prerequisites)],
    concepts: [...new Set(concepts)],
    difficulty,
  };
}

/**
 * Get all knowledge areas for a user with progression status
 */
export async function getUserKnowledgeOverview(userId: string): Promise<{
  knowledgeAreas: UserKnowledgeState[];
  totalTopics: number;
  averageConfidence: number;
  progressionOpportunities: number;
}> {
  const userKnowledge = await prisma.userKnowledge.findMany({
    where: { userId },
    orderBy: { lastInteraction: 'desc' },
  });
  
  const knowledgeAreas: UserKnowledgeState[] = userKnowledge.map(knowledge => ({
    topic: knowledge.topic,
    confidenceLevel: knowledge.confidenceLevel,
    contentCount: knowledge.contentCount,
    knowledgeDepth: knowledge.knowledgeDepth as KnowledgeDepth,
    lastInteraction: knowledge.lastInteraction,
    progressionScore: calculateProgressionScore(
      knowledge.confidenceLevel,
      knowledge.contentCount,
      knowledge.knowledgeDepth as KnowledgeDepth
    ),
  }));
  
  const totalTopics = knowledgeAreas.length;
  const averageConfidence = totalTopics > 0
    ? knowledgeAreas.reduce((sum, area) => sum + area.confidenceLevel, 0) / totalTopics
    : 0;
  const progressionOpportunities = knowledgeAreas.filter(area => 
    analyzeProgressionReadiness(
      area.confidenceLevel,
      area.contentCount,
      area.knowledgeDepth
    ).canProgress
  ).length;
  
  return {
    knowledgeAreas,
    totalTopics,
    averageConfidence,
    progressionOpportunities,
  };
}

/**
 * Recommend content depth based on user's knowledge in related topics
 */
export async function recommendContentDepth(
  userId: string,
  contentTopics: string[]
): Promise<{
  recommendedDepth: KnowledgeDepth;
  reasoning: string[];
  userReadiness: number; // 0-1 scale
}> {
  const relatedKnowledge = await prisma.userKnowledge.findMany({
    where: {
      userId,
      topic: { in: contentTopics },
    },
  });
  
  const reasoning: string[] = [];
  
  if (relatedKnowledge.length === 0) {
    reasoning.push('No prior knowledge in related topics');
    return {
      recommendedDepth: 'beginner',
      reasoning,
      userReadiness: 0.2,
    };
  }
  
  // Calculate weighted average of knowledge levels
  const depthScores = relatedKnowledge.map(k => {
    switch (k.knowledgeDepth) {
      case 'beginner': return 0.3;
      case 'intermediate': return 0.6;
      case 'advanced': return 1.0;
      default: return 0.3;
    }
  });
  
  const avgDepthScore = depthScores.reduce((sum, score) => sum + score, 0) / depthScores.length;
  const avgConfidence = relatedKnowledge.reduce((sum, k) => sum + k.confidenceLevel, 0) / relatedKnowledge.length;
  
  const userReadiness = (avgDepthScore * 0.6) + (avgConfidence * 0.4);
  
  let recommendedDepth: KnowledgeDepth;
  if (userReadiness < 0.4) {
    recommendedDepth = 'beginner';
    reasoning.push('Low confidence in related topics suggests starting with basics');
  } else if (userReadiness < 0.7) {
    recommendedDepth = 'intermediate';
    reasoning.push('Moderate knowledge in related topics suggests intermediate content');
  } else {
    recommendedDepth = 'advanced';
    reasoning.push('Strong knowledge in related topics allows for advanced content');
  }
  
  reasoning.push(`Average knowledge depth: ${avgDepthScore.toFixed(2)}`);
  reasoning.push(`Average confidence: ${avgConfidence.toFixed(2)}`);
  
  return {
    recommendedDepth,
    reasoning,
    userReadiness,
  };
}