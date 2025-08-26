import { PrismaClient } from '@prisma/client';
import { KnowledgeDepth } from './knowledge-progression';

const prisma = new PrismaClient();

export interface KnowledgeGap {
  topic: string;
  gapType: 'missing' | 'shallow' | 'outdated' | 'prerequisite';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedContent: string[];
  relatedTopics: string[];
  priority: number; // 0-1 scale
  foundationalImportance: number; // 0-1 scale
}

export interface GapAnalysisResult {
  identifiedGaps: KnowledgeGap[];
  totalGaps: number;
  criticalGaps: number;
  foundationalGaps: number;
  recommendedActions: string[];
  learningPath: string[];
}

export interface TopicPrerequisite {
  topic: string;
  prerequisites: string[];
  difficulty: KnowledgeDepth;
  importance: number;
}

const GAP_DETECTION_THRESHOLD = parseFloat(process.env.KNOWLEDGE_GAP_DETECTION_THRESHOLD || '0.3');

// Knowledge domain mapping with prerequisites
const TOPIC_PREREQUISITES: Record<string, TopicPrerequisite> = {
  'javascript': {
    topic: 'javascript',
    prerequisites: ['programming-basics', 'web-development'],
    difficulty: 'beginner',
    importance: 0.9,
  },
  'typescript': {
    topic: 'typescript',
    prerequisites: ['javascript'],
    difficulty: 'intermediate',
    importance: 0.8,
  },
  'react': {
    topic: 'react',
    prerequisites: ['javascript', 'html', 'css'],
    difficulty: 'intermediate',
    importance: 0.9,
  },
  'nextjs': {
    topic: 'nextjs',
    prerequisites: ['react', 'node.js'],
    difficulty: 'intermediate',
    importance: 0.7,
  },
  'node.js': {
    topic: 'node.js',
    prerequisites: ['javascript'],
    difficulty: 'intermediate',
    importance: 0.8,
  },
  'database-design': {
    topic: 'database-design',
    prerequisites: ['programming-basics', 'data-modeling'],
    difficulty: 'intermediate',
    importance: 0.8,
  },
  'api-design': {
    topic: 'api-design',
    prerequisites: ['programming-basics', 'http'],
    difficulty: 'intermediate',
    importance: 0.7,
  },
  'system-design': {
    topic: 'system-design',
    prerequisites: ['programming-basics', 'database-design', 'api-design'],
    difficulty: 'advanced',
    importance: 0.9,
  },
  'microservices': {
    topic: 'microservices',
    prerequisites: ['system-design', 'api-design', 'containers'],
    difficulty: 'advanced',
    importance: 0.7,
  },
  'devops': {
    topic: 'devops',
    prerequisites: ['linux', 'containers', 'system-administration'],
    difficulty: 'advanced',
    importance: 0.8,
  },
};

/**
 * Analyze user's knowledge gaps across all topics
 */
export async function analyzeKnowledgeGaps(userId: string): Promise<GapAnalysisResult> {
  // Get user's current knowledge state
  const userKnowledge = await prisma.userKnowledge.findMany({
    where: { userId },
  });

  // Get user's interests and tech stack from preferences
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId },
    select: {
      interests: true,
      techStack: true,
      curiosityAreas: true,
    },
  });

  const userTopics = new Set([
    ...userKnowledge.map(k => k.topic),
    ...(preferences?.interests || []),
    ...(preferences?.techStack || []),
    ...(preferences?.curiosityAreas || []),
  ]);

  const identifiedGaps: KnowledgeGap[] = [];

  // Check for missing foundational topics
  await identifyMissingPrerequisites(userId, userTopics, identifiedGaps);

  // Check for shallow knowledge areas
  await identifyShallowKnowledge(userKnowledge, identifiedGaps);

  // Check for outdated knowledge
  await identifyOutdatedKnowledge(userKnowledge, identifiedGaps);

  // Check for gaps based on user interests
  await identifyInterestGaps(userId, preferences, identifiedGaps);

  // Sort gaps by priority and severity
  identifiedGaps.sort((a, b) => {
    const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    const aSeverity = severityWeight[a.severity];
    const bSeverity = severityWeight[b.severity];
    
    if (aSeverity !== bSeverity) {
      return bSeverity - aSeverity;
    }
    return b.priority - a.priority;
  });

  const totalGaps = identifiedGaps.length;
  const criticalGaps = identifiedGaps.filter(gap => gap.severity === 'critical').length;
  const foundationalGaps = identifiedGaps.filter(gap => gap.foundationalImportance > 0.7).length;

  const recommendedActions = generateRecommendedActions(identifiedGaps);
  const learningPath = generateLearningPath(identifiedGaps);

  return {
    identifiedGaps,
    totalGaps,
    criticalGaps,
    foundationalGaps,
    recommendedActions,
    learningPath,
  };
}

/**
 * Identify missing prerequisite topics
 */
async function identifyMissingPrerequisites(
  userId: string,
  userTopics: Set<string>,
  gaps: KnowledgeGap[]
): Promise<void> {
  for (const topic of userTopics) {
    const topicInfo = TOPIC_PREREQUISITES[topic];
    if (!topicInfo) continue;

    for (const prerequisite of topicInfo.prerequisites) {
      if (!userTopics.has(prerequisite)) {
        // Check if user has any knowledge of this prerequisite
        const knowledge = await prisma.userKnowledge.findUnique({
          where: {
            userId_topic: { userId, topic: prerequisite },
          },
        });

        if (!knowledge || knowledge.confidenceLevel < GAP_DETECTION_THRESHOLD) {
          gaps.push({
            topic: prerequisite,
            gapType: 'prerequisite',
            severity: determinePrerequisiteSeverity(topic, prerequisite),
            description: `Missing prerequisite knowledge for ${topic}`,
            suggestedContent: generateContentSuggestions(prerequisite),
            relatedTopics: [topic],
            priority: topicInfo.importance,
            foundationalImportance: calculateFoundationalImportance(prerequisite),
          });
        }
      }
    }
  }
}

/**
 * Identify areas with shallow knowledge
 */
async function identifyShallowKnowledge(
  userKnowledge: Array<{
    topic: string;
    confidenceLevel: number;
    contentCount: number;
    lastInteraction: Date;
    knowledgeDepth: string;
  }>,
  gaps: KnowledgeGap[]
): Promise<void> {
  for (const knowledge of userKnowledge) {
    if (knowledge.confidenceLevel < 0.5 && knowledge.contentCount >= 3) {
      // User has consumed content but still has low confidence
      gaps.push({
        topic: knowledge.topic,
        gapType: 'shallow',
        severity: 'medium',
        description: `Low confidence despite consuming ${knowledge.contentCount} pieces of content`,
        suggestedContent: generateContentSuggestions(knowledge.topic, 'foundational'),
        relatedTopics: findRelatedTopics(knowledge.topic),
        priority: 0.6,
        foundationalImportance: calculateFoundationalImportance(knowledge.topic),
      });
    }
  }
}

/**
 * Identify potentially outdated knowledge
 */
async function identifyOutdatedKnowledge(
  userKnowledge: any[],
  gaps: KnowledgeGap[]
): Promise<void> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  for (const knowledge of userKnowledge) {
    if (knowledge.lastInteraction < sixMonthsAgo && knowledge.confidenceLevel > 0.7) {
      // High confidence but no recent interaction
      gaps.push({
        topic: knowledge.topic,
        gapType: 'outdated',
        severity: 'low',
        description: `No recent interaction with ${knowledge.topic} (last: ${knowledge.lastInteraction.toDateString()})`,
        suggestedContent: generateContentSuggestions(knowledge.topic, 'update'),
        relatedTopics: findRelatedTopics(knowledge.topic),
        priority: 0.3,
        foundationalImportance: calculateFoundationalImportance(knowledge.topic),
      });
    }
  }
}

/**
 * Identify gaps based on user interests
 */
async function identifyInterestGaps(
  userId: string,
  preferences: any,
  gaps: KnowledgeGap[]
): Promise<void> {
  if (!preferences) return;

  const allInterests = [
    ...(preferences.interests || []),
    ...(preferences.curiosityAreas || []),
  ];

  for (const interest of allInterests) {
    const knowledge = await prisma.userKnowledge.findUnique({
      where: {
        userId_topic: { userId, topic: interest },
      },
    });

    if (!knowledge) {
      gaps.push({
        topic: interest,
        gapType: 'missing',
        severity: 'medium',
        description: `Expressed interest in ${interest} but no knowledge tracked`,
        suggestedContent: generateContentSuggestions(interest, 'beginner'),
        relatedTopics: findRelatedTopics(interest),
        priority: 0.7,
        foundationalImportance: calculateFoundationalImportance(interest),
      });
    }
  }
}

/**
 * Determine severity of missing prerequisite
 */
function determinePrerequisiteSeverity(topic: string, prerequisite: string): 'low' | 'medium' | 'high' | 'critical' {
  const topicInfo = TOPIC_PREREQUISITES[topic];
  if (!topicInfo) return 'medium';

  const foundationalImportance = calculateFoundationalImportance(prerequisite);
  const topicImportance = topicInfo.importance;

  const combinedImportance = (foundationalImportance + topicImportance) / 2;

  if (combinedImportance > 0.8) return 'critical';
  if (combinedImportance > 0.6) return 'high';
  if (combinedImportance > 0.4) return 'medium';
  return 'low';
}

/**
 * Calculate foundational importance of a topic
 */
function calculateFoundationalImportance(topic: string): number {
  // Check how many other topics depend on this one
  let dependentCount = 0;
  for (const [_, info] of Object.entries(TOPIC_PREREQUISITES)) {
    if (info.prerequisites.includes(topic)) {
      dependentCount++;
    }
  }

  // Base importance + dependency factor
  const topicInfo = TOPIC_PREREQUISITES[topic];
  const baseImportance = topicInfo?.importance || 0.5;
  const dependencyFactor = Math.min(1, dependentCount / 10); // Scale by number of dependencies

  return Math.min(1, baseImportance + (dependencyFactor * 0.3));
}

/**
 * Find related topics
 */
function findRelatedTopics(topic: string): string[] {
  const related: string[] = [];
  const topicInfo = TOPIC_PREREQUISITES[topic];

  if (topicInfo) {
    // Add prerequisites as related
    related.push(...topicInfo.prerequisites);
  }

  // Add topics that depend on this one
  for (const [key, info] of Object.entries(TOPIC_PREREQUISITES)) {
    if (info.prerequisites.includes(topic)) {
      related.push(key);
    }
  }

  return [...new Set(related)];
}

/**
 * Generate content suggestions for a topic
 */
function generateContentSuggestions(
  topic: string,
  type: 'beginner' | 'foundational' | 'update' = 'beginner'
): string[] {
  const suggestions: string[] = [];

  switch (type) {
    case 'beginner':
      suggestions.push(
        `${topic} fundamentals`,
        `Introduction to ${topic}`,
        `${topic} basics for beginners`,
        `Getting started with ${topic}`
      );
      break;
    case 'foundational':
      suggestions.push(
        `${topic} core concepts`,
        `Deep dive into ${topic}`,
        `${topic} best practices`,
        `Advanced ${topic} patterns`
      );
      break;
    case 'update':
      suggestions.push(
        `What's new in ${topic}`,
        `${topic} recent developments`,
        `Modern ${topic} practices`,
        `${topic} trends and updates`
      );
      break;
  }

  return suggestions;
}

/**
 * Generate recommended actions based on identified gaps
 */
function generateRecommendedActions(gaps: KnowledgeGap[]): string[] {
  const actions: string[] = [];
  const criticalGaps = gaps.filter(g => g.severity === 'critical');
  const foundationalGaps = gaps.filter(g => g.foundationalImportance > 0.7);

  if (criticalGaps.length > 0) {
    actions.push(`Address ${criticalGaps.length} critical knowledge gaps immediately`);
  }

  if (foundationalGaps.length > 0) {
    actions.push(`Focus on ${foundationalGaps.length} foundational topics that unlock other areas`);
  }

  const prerequisiteGaps = gaps.filter(g => g.gapType === 'prerequisite');
  if (prerequisiteGaps.length > 0) {
    actions.push(`Learn prerequisite topics before advancing to dependent areas`);
  }

  const shallowGaps = gaps.filter(g => g.gapType === 'shallow');
  if (shallowGaps.length > 0) {
    actions.push(`Deepen understanding in ${shallowGaps.length} areas with low confidence`);
  }

  const outdatedGaps = gaps.filter(g => g.gapType === 'outdated');
  if (outdatedGaps.length > 0) {
    actions.push(`Refresh knowledge in ${outdatedGaps.length} areas with stale information`);
  }

  return actions;
}

/**
 * Generate learning path based on prerequisites and priorities
 */
function generateLearningPath(gaps: KnowledgeGap[]): string[] {
  const path: string[] = [];
  const processed = new Set<string>();

  // Function to add topic and its prerequisites recursively
  const addTopicToPath = (topic: string) => {
    if (processed.has(topic)) return;

    const topicInfo = TOPIC_PREREQUISITES[topic];
    if (topicInfo) {
      // First, add all prerequisites
      for (const prerequisite of topicInfo.prerequisites) {
        addTopicToPath(prerequisite);
      }
    }

    // Then add the topic itself if we have a gap for it
    const hasGap = gaps.some(gap => gap.topic === topic);
    if (hasGap && !processed.has(topic)) {
      path.push(topic);
      processed.add(topic);
    }
  };

  // Sort gaps by priority and foundational importance
  const sortedGaps = gaps
    .filter(gap => gap.gapType === 'prerequisite' || gap.severity === 'critical')
    .sort((a, b) => b.foundationalImportance - a.foundationalImportance);

  // Build path starting with foundational topics
  for (const gap of sortedGaps) {
    addTopicToPath(gap.topic);
  }

  return path;
}

/**
 * Get specific gaps for a topic that user wants to learn
 */
export async function analyzeTopicGaps(
  userId: string,
  targetTopic: string
): Promise<{
  missingPrerequisites: KnowledgeGap[];
  readinessScore: number;
  blockers: string[];
  recommendedPreparation: string[];
}> {
  const topicInfo = TOPIC_PREREQUISITES[targetTopic];
  const missingPrerequisites: KnowledgeGap[] = [];
  const blockers: string[] = [];
  const recommendedPreparation: string[] = [];

  if (topicInfo) {
    let prerequisitesMet = 0;

    for (const prerequisite of topicInfo.prerequisites) {
      const knowledge = await prisma.userKnowledge.findUnique({
        where: {
          userId_topic: { userId, topic: prerequisite },
        },
      });

      if (!knowledge || knowledge.confidenceLevel < GAP_DETECTION_THRESHOLD) {
        missingPrerequisites.push({
          topic: prerequisite,
          gapType: 'prerequisite',
          severity: 'high',
          description: `Required prerequisite for learning ${targetTopic}`,
          suggestedContent: generateContentSuggestions(prerequisite),
          relatedTopics: [targetTopic],
          priority: 0.9,
          foundationalImportance: calculateFoundationalImportance(prerequisite),
        });

        blockers.push(`Missing knowledge in ${prerequisite}`);
        recommendedPreparation.push(`Learn ${prerequisite} fundamentals`);
      } else {
        prerequisitesMet++;
      }
    }

    const readinessScore = topicInfo.prerequisites.length > 0 
      ? prerequisitesMet / topicInfo.prerequisites.length 
      : 1.0;

    return {
      missingPrerequisites,
      readinessScore,
      blockers,
      recommendedPreparation,
    };
  }

  return {
    missingPrerequisites: [],
    readinessScore: 1.0,
    blockers: [],
    recommendedPreparation: [],
  };
}

/**
 * Suggest next learning topics based on current knowledge
 */
export async function suggestNextLearningTopics(
  userId: string,
  limit: number = 5
): Promise<{
  topic: string;
  reasoning: string;
  priority: number;
  readinessScore: number;
}[]> {
  const userKnowledge = await prisma.userKnowledge.findMany({
    where: { userId },
  });

  const userTopics = new Set(userKnowledge.map(k => k.topic));
  const suggestions: {
    topic: string;
    reasoning: string;
    priority: number;
    readinessScore: number;
  }[] = [];

  // Find topics that user is ready to learn
  for (const [topic, info] of Object.entries(TOPIC_PREREQUISITES)) {
    if (userTopics.has(topic)) continue; // User already knows this topic

    let prerequisitesMet = 0;
    let totalPrerequisites = info.prerequisites.length;

    for (const prerequisite of info.prerequisites) {
      const knowledge = userKnowledge.find(k => k.topic === prerequisite);
      if (knowledge && knowledge.confidenceLevel >= GAP_DETECTION_THRESHOLD) {
        prerequisitesMet++;
      }
    }

    const readinessScore = totalPrerequisites > 0 ? prerequisitesMet / totalPrerequisites : 1.0;

    if (readinessScore >= 0.8) { // 80% of prerequisites met
      suggestions.push({
        topic,
        reasoning: `Ready to learn - ${prerequisitesMet}/${totalPrerequisites} prerequisites met`,
        priority: info.importance,
        readinessScore,
      });
    }
  }

  return suggestions
    .sort((a, b) => b.priority * b.readinessScore - a.priority * a.readinessScore)
    .slice(0, limit);
}