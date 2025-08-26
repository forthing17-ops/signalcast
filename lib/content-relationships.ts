import { PrismaClient } from '@prisma/client';
import { cosineSimilarity } from './vector-embeddings';
import { analyzeContentComplexity } from './knowledge-progression';

const prisma = new PrismaClient();

export type RelationshipType = 'builds_on' | 'prerequisite' | 'related' | 'contrasts' | 'cross_domain';

export interface ContentRelationship {
  id: string;
  parentContentId: string;
  childContentId: string;
  relationshipType: RelationshipType;
  strength: number;
  parentContent?: ContentSummary;
  childContent?: ContentSummary;
}

export interface ContentSummary {
  id: string;
  title: string;
  topics: string[];
  knowledgeMetadata?: any;
}

export interface RelationshipAnalysis {
  relationships: ContentRelationship[];
  connectionMap: Map<string, string[]>;
  learningPath: string[];
  clusters: ContentCluster[];
}

export interface ContentCluster {
  topic: string;
  contentIds: string[];
  centralContent: string; // Most connected content in cluster
  averageComplexity: number;
}

export interface RelationshipRecommendation {
  suggestedRelationships: {
    contentId1: string;
    contentId2: string;
    type: RelationshipType;
    confidence: number;
    reasoning: string;
  }[];
  missingConnections: {
    topic: string;
    contentIds: string[];
    reason: string;
  }[];
}

const RELATIONSHIP_CACHE_TTL = parseInt(process.env.CONTENT_RELATIONSHIP_CACHE_TTL || '86400') * 1000; // 24 hours in ms

/**
 * Discover and create relationships between content pieces
 */
export async function discoverContentRelationships(
  userId: string,
  contentIds?: string[]
): Promise<RelationshipAnalysis> {
  // Get user's content to analyze
  const contentQuery = {
    where: {
      createdBy: userId,
      ...(contentIds ? { id: { in: contentIds } } : {}),
    },
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      topics: true,
      knowledgeMetadata: true,
      vectorEmbedding: true,
    },
  };

  const userContent = await prisma.content.findMany(contentQuery);

  // Get existing relationships
  const existingRelationships = await prisma.contentRelationship.findMany({
    where: {
      OR: [
        { parentContentId: { in: userContent.map(c => c.id) } },
        { childContentId: { in: userContent.map(c => c.id) } },
      ],
    },
    include: {
      parentContent: {
        select: { id: true, title: true, topics: true, knowledgeMetadata: true },
      },
      childContent: {
        select: { id: true, title: true, topics: true, knowledgeMetadata: true },
      },
    },
  });

  // Discover new relationships
  const newRelationships = await analyzeContentPairs(userContent);

  // Combine existing and new relationships
  const allRelationships = [
    ...existingRelationships,
    ...newRelationships.filter(nr => 
      !existingRelationships.some(er => 
        er.parentContentId === nr.parentContentId && 
        er.childContentId === nr.childContentId
      )
    ),
  ];

  // Create connection map
  const connectionMap = createConnectionMap(allRelationships);

  // Generate learning path
  const learningPath = generateLearningPath(userContent, allRelationships);

  // Identify content clusters
  const clusters = identifyContentClusters(userContent, allRelationships);

  return {
    relationships: allRelationships,
    connectionMap,
    learningPath,
    clusters,
  };
}

/**
 * Analyze pairs of content to discover relationships
 */
async function analyzeContentPairs(content: any[]): Promise<ContentRelationship[]> {
  const relationships: ContentRelationship[] = [];
  
  for (let i = 0; i < content.length; i++) {
    for (let j = i + 1; j < content.length; j++) {
      const content1 = content[i];
      const content2 = content[j];
      
      const relationship = await analyzeContentPairRelationship(content1, content2);
      if (relationship) {
        relationships.push(relationship);
        
        // Store in database
        await prisma.contentRelationship.create({
          data: {
            parentContentId: relationship.parentContentId,
            childContentId: relationship.childContentId,
            relationshipType: relationship.relationshipType,
            strength: relationship.strength,
          },
        });
      }
    }
  }
  
  return relationships;
}

/**
 * Analyze relationship between two specific content pieces
 */
async function analyzeContentPairRelationship(
  content1: any,
  content2: any
): Promise<ContentRelationship | null> {
  // Topic overlap analysis
  const topicOverlap = calculateTopicOverlap(content1.topics, content2.topics);
  
  // If no topic overlap, unlikely to be related
  if (topicOverlap < 0.1) {
    return null;
  }

  // Semantic similarity analysis
  let semanticSimilarity = 0;
  if (content1.vectorEmbedding && content2.vectorEmbedding) {
    const embedding1 = content1.vectorEmbedding.embedding;
    const embedding2 = content2.vectorEmbedding.embedding;
    semanticSimilarity = cosineSimilarity(embedding1, embedding2);
  }

  // Complexity analysis
  const complexity1 = await analyzeContentComplexity({
    title: content1.title,
    summary: content1.summary,
    content: content1.content,
    topics: content1.topics,
  });

  const complexity2 = await analyzeContentComplexity({
    title: content2.title,
    summary: content2.summary,
    content: content2.content,
    topics: content2.topics,
  });

  // Determine relationship type and direction
  const relationshipAnalysis = determineRelationshipType(
    content1,
    content2,
    complexity1,
    complexity2,
    topicOverlap,
    semanticSimilarity
  );

  if (!relationshipAnalysis) {
    return null;
  }

  return {
    id: '', // Will be set by database
    parentContentId: relationshipAnalysis.parentId,
    childContentId: relationshipAnalysis.childId,
    relationshipType: relationshipAnalysis.type,
    strength: relationshipAnalysis.strength,
  };
}

/**
 * Calculate topic overlap between two content pieces
 */
function calculateTopicOverlap(topics1: string[], topics2: string[]): number {
  const set1 = new Set(topics1.map(t => t.toLowerCase()));
  const set2 = new Set(topics2.map(t => t.toLowerCase()));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Determine relationship type between two content pieces
 */
function determineRelationshipType(
  content1: any,
  content2: any,
  complexity1: any,
  complexity2: any,
  topicOverlap: number,
  semanticSimilarity: number
): {
  parentId: string;
  childId: string;
  type: RelationshipType;
  strength: number;
} | null {
  const minStrength = 0.3;
  
  // High semantic similarity suggests related content
  if (semanticSimilarity > 0.7) {
    const strength = Math.min(1, semanticSimilarity + (topicOverlap * 0.2));
    
    if (strength < minStrength) return null;
    
    // Determine if one builds on the other based on complexity
    const complexityDiff = complexity2.complexityScore - complexity1.complexityScore;
    
    if (Math.abs(complexityDiff) > 0.3) {
      // Significant complexity difference suggests prerequisite relationship
      const parentId = complexityDiff > 0 ? content1.id : content2.id;
      const childId = complexityDiff > 0 ? content2.id : content1.id;
      
      return {
        parentId,
        childId,
        type: 'builds_on',
        strength,
      };
    } else {
      // Similar complexity suggests related content
      return {
        parentId: content1.id,
        childId: content2.id,
        type: 'related',
        strength,
      };
    }
  }

  // Medium similarity with topic overlap
  if (semanticSimilarity > 0.4 && topicOverlap > 0.5) {
    const strength = (semanticSimilarity * 0.7) + (topicOverlap * 0.3);
    
    if (strength < minStrength) return null;

    // Check for prerequisite relationship based on content analysis
    const isPrerequisite = analyzePrerequisiteRelationship(content1, content2);
    
    if (isPrerequisite) {
      return {
        parentId: isPrerequisite.prerequisiteId,
        childId: isPrerequisite.dependentId,
        type: 'prerequisite',
        strength,
      };
    }

    return {
      parentId: content1.id,
      childId: content2.id,
      type: 'related',
      strength,
    };
  }

  // Check for contrasting content
  if (semanticSimilarity < 0.2 && topicOverlap > 0.3) {
    // Same topics but different approaches - potentially contrasting
    const strength = topicOverlap;
    
    if (strength >= minStrength) {
      return {
        parentId: content1.id,
        childId: content2.id,
        type: 'contrasts',
        strength,
      };
    }
  }

  return null;
}

/**
 * Analyze if one content piece is a prerequisite for another
 */
function analyzePrerequisiteRelationship(
  content1: any,
  content2: any
): { prerequisiteId: string; dependentId: string } | null {
  // Simple heuristic: check for fundamental vs advanced keywords
  const fundamentalKeywords = ['basic', 'introduction', 'getting started', 'fundamentals', 'overview'];
  const advancedKeywords = ['advanced', 'deep dive', 'optimization', 'best practices', 'patterns'];
  
  const content1Text = `${content1.title} ${content1.summary}`.toLowerCase();
  const content2Text = `${content2.title} ${content2.summary}`.toLowerCase();
  
  const content1Fundamental = fundamentalKeywords.some(keyword => content1Text.includes(keyword));
  const content1Advanced = advancedKeywords.some(keyword => content1Text.includes(keyword));
  
  const content2Fundamental = fundamentalKeywords.some(keyword => content2Text.includes(keyword));
  const content2Advanced = advancedKeywords.some(keyword => content2Text.includes(keyword));
  
  // If one is fundamental and the other is advanced, prerequisite relationship exists
  if (content1Fundamental && content2Advanced) {
    return { prerequisiteId: content1.id, dependentId: content2.id };
  }
  
  if (content2Fundamental && content1Advanced) {
    return { prerequisiteId: content2.id, dependentId: content1.id };
  }
  
  return null;
}

/**
 * Create a connection map for navigation
 */
function createConnectionMap(relationships: ContentRelationship[]): Map<string, string[]> {
  const connectionMap = new Map<string, string[]>();
  
  for (const relationship of relationships) {
    // Add forward connection
    if (!connectionMap.has(relationship.parentContentId)) {
      connectionMap.set(relationship.parentContentId, []);
    }
    connectionMap.get(relationship.parentContentId)!.push(relationship.childContentId);
    
    // Add backward connection for navigation
    if (!connectionMap.has(relationship.childContentId)) {
      connectionMap.set(relationship.childContentId, []);
    }
    connectionMap.get(relationship.childContentId)!.push(relationship.parentContentId);
  }
  
  return connectionMap;
}

/**
 * Generate optimal learning path through content
 */
function generateLearningPath(content: any[], relationships: ContentRelationship[]): string[] {
  // Create adjacency list
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  
  // Initialize
  for (const item of content) {
    graph.set(item.id, []);
    inDegree.set(item.id, 0);
  }
  
  // Build graph from relationships
  for (const rel of relationships) {
    if (rel.relationshipType === 'builds_on' || rel.relationshipType === 'prerequisite') {
      graph.get(rel.parentContentId)?.push(rel.childContentId);
      inDegree.set(rel.childContentId, (inDegree.get(rel.childContentId) || 0) + 1);
    }
  }
  
  // Topological sort for learning path
  const queue: string[] = [];
  const path: string[] = [];
  
  // Start with content that has no prerequisites
  for (const [contentId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(contentId);
    }
  }
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    path.push(current);
    
    // Process connected content
    const connected = graph.get(current) || [];
    for (const next of connected) {
      const newDegree = (inDegree.get(next) || 0) - 1;
      inDegree.set(next, newDegree);
      
      if (newDegree === 0) {
        queue.push(next);
      }
    }
  }
  
  return path;
}

/**
 * Identify clusters of related content
 */
function identifyContentClusters(content: any[], relationships: ContentRelationship[]): ContentCluster[] {
  const clusters: ContentCluster[] = [];
  const visited = new Set<string>();
  
  // Group by primary topic
  const topicGroups = new Map<string, string[]>();
  
  for (const item of content) {
    const primaryTopic = item.topics[0] || 'general';
    if (!topicGroups.has(primaryTopic)) {
      topicGroups.set(primaryTopic, []);
    }
    topicGroups.get(primaryTopic)!.push(item.id);
  }
  
  for (const [topic, contentIds] of topicGroups.entries()) {
    if (contentIds.length < 2) continue; // Skip single-content clusters
    
    // Find the most connected content in this cluster
    const connectionCounts = new Map<string, number>();
    
    for (const contentId of contentIds) {
      let connections = 0;
      for (const rel of relationships) {
        if (rel.parentContentId === contentId || rel.childContentId === contentId) {
          connections++;
        }
      }
      connectionCounts.set(contentId, connections);
    }
    
    const centralContent = [...connectionCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0] || contentIds[0];
    
    // Calculate average complexity
    const complexities = contentIds
      .map(id => content.find(c => c.id === id))
      .filter(c => c && c.knowledgeMetadata?.complexityScore)
      .map(c => c.knowledgeMetadata.complexityScore);
    
    const averageComplexity = complexities.length > 0
      ? complexities.reduce((sum, c) => sum + c, 0) / complexities.length
      : 0.5;
    
    clusters.push({
      topic,
      contentIds,
      centralContent,
      averageComplexity,
    });
    
    contentIds.forEach(id => visited.add(id));
  }
  
  return clusters;
}

/**
 * Get content relationships for a specific piece of content
 */
export async function getContentRelationships(contentId: string): Promise<{
  prerequisites: ContentRelationship[];
  dependents: ContentRelationship[];
  related: ContentRelationship[];
  contrasts: ContentRelationship[];
}> {
  const relationships = await prisma.contentRelationship.findMany({
    where: {
      OR: [
        { parentContentId: contentId },
        { childContentId: contentId },
      ],
    },
    include: {
      parentContent: {
        select: { id: true, title: true, topics: true, knowledgeMetadata: true },
      },
      childContent: {
        select: { id: true, title: true, topics: true, knowledgeMetadata: true },
      },
    },
  });

  const prerequisites = relationships.filter(r => 
    r.childContentId === contentId && 
    (r.relationshipType === 'prerequisite' || r.relationshipType === 'builds_on')
  );

  const dependents = relationships.filter(r => 
    r.parentContentId === contentId && 
    (r.relationshipType === 'prerequisite' || r.relationshipType === 'builds_on')
  );

  const related = relationships.filter(r => r.relationshipType === 'related');
  const contrasts = relationships.filter(r => r.relationshipType === 'contrasts');

  return { prerequisites, dependents, related, contrasts };
}

/**
 * Recommend new relationships that should be created
 */
export async function recommendContentRelationships(
  userId: string
): Promise<RelationshipRecommendation> {
  const userContent = await prisma.content.findMany({
    where: { createdBy: userId },
    select: {
      id: true,
      title: true,
      summary: true,
      topics: true,
      knowledgeMetadata: true,
    },
  });

  const suggestedRelationships: RelationshipRecommendation['suggestedRelationships'] = [];
  const missingConnections: RelationshipRecommendation['missingConnections'] = [];

  // Find content pairs with high topic overlap but no existing relationship
  for (let i = 0; i < userContent.length; i++) {
    for (let j = i + 1; j < userContent.length; j++) {
      const content1 = userContent[i];
      const content2 = userContent[j];
      
      const topicOverlap = calculateTopicOverlap(content1.topics, content2.topics);
      
      if (topicOverlap > 0.5) {
        // Check if relationship already exists
        const existingRelationship = await prisma.contentRelationship.findFirst({
          where: {
            OR: [
              { parentContentId: content1.id, childContentId: content2.id },
              { parentContentId: content2.id, childContentId: content1.id },
            ],
          },
        });

        if (!existingRelationship) {
          suggestedRelationships.push({
            contentId1: content1.id,
            contentId2: content2.id,
            type: 'related',
            confidence: topicOverlap,
            reasoning: `High topic overlap (${Math.round(topicOverlap * 100)}%)`,
          });
        }
      }
    }
  }

  // Find topics with isolated content (should be connected)
  const topicGroups = new Map<string, string[]>();
  for (const content of userContent) {
    for (const topic of content.topics) {
      if (!topicGroups.has(topic)) {
        topicGroups.set(topic, []);
      }
      topicGroups.get(topic)!.push(content.id);
    }
  }

  for (const [topic, contentIds] of topicGroups.entries()) {
    if (contentIds.length > 1) {
      // Check if these content pieces are connected
      const hasConnections = await prisma.contentRelationship.findFirst({
        where: {
          OR: [
            { parentContentId: { in: contentIds }, childContentId: { in: contentIds } },
          ],
        },
      });

      if (!hasConnections) {
        missingConnections.push({
          topic,
          contentIds,
          reason: `${contentIds.length} pieces of content about ${topic} are not connected`,
        });
      }
    }
  }

  return {
    suggestedRelationships: suggestedRelationships
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10), // Top 10 suggestions
    missingConnections,
  };
}

/**
 * Cross-Domain Connection Discovery (Story 3.3 Enhancement)
 * Identifies connections between different professional domains and interests
 */

export interface CrossDomainConnection {
  id: string;
  primaryContentId: string;
  secondaryContentId: string;
  primaryDomain: string;
  secondaryDomain: string;
  connectionType: 'synergistic' | 'competitive' | 'complementary' | 'causal' | 'transformative';
  connectionStrength: number; // 0-1
  bridgingConcepts: string[];
  professionalOpportunities: string[];
  implementationSynergies: string[];
  riskFactors: string[];
  confidence: number; // 0-1
  discoveredAt: Date;
}

export interface DomainAnalysis {
  domain: string;
  contentCount: number;
  keyTopics: string[];
  averageComplexity: number;
  connectionPotential: number; // 0-1
  professionalRelevance: number; // 0-1
}

export interface CrossDomainInsight {
  domains: string[];
  connectionPattern: string;
  strategicImplications: string[];
  actionableOpportunities: string[];
  skillTransferPotential: string[];
  marketDifferentiation: string[];
}

/**
 * Discover cross-domain connections for a user's content
 */
export async function discoverCrossDomainConnections(
  userId: string,
  professionalContext?: any
): Promise<{
  connections: CrossDomainConnection[];
  domainAnalysis: DomainAnalysis[];
  insights: CrossDomainInsight[];
  recommendations: string[];
}> {
  // Get user's content across all domains
  const userContent = await prisma.content.findMany({
    where: { createdBy: userId },
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      topics: true,
      knowledgeMetadata: true,
      vectorEmbedding: true,
    },
  });

  // Analyze domains present in user's content
  const domainAnalysis = analyzeDomains(userContent);

  // Discover cross-domain connections
  const connections = await findCrossDomainConnections(userContent, domainAnalysis);

  // Generate strategic insights
  const insights = generateCrossDomainInsights(connections, domainAnalysis, professionalContext);

  // Create actionable recommendations
  const recommendations = generateCrossDomainRecommendations(connections, insights, professionalContext);

  return {
    connections,
    domainAnalysis,
    insights,
    recommendations
  };
}

/**
 * Analyze domains present in user's content
 */
function analyzeDomains(content: any[]): DomainAnalysis[] {
  const domainMap = new Map<string, {
    contentIds: string[];
    topics: Set<string>;
    complexities: number[];
  }>();

  // Group content by domain (inferred from topics)
  for (const item of content) {
    const domain = inferDomain(item.topics);
    
    if (!domainMap.has(domain)) {
      domainMap.set(domain, {
        contentIds: [],
        topics: new Set(),
        complexities: []
      });
    }

    const domainData = domainMap.get(domain)!;
    domainData.contentIds.push(item.id);
    item.topics.forEach((topic: string) => domainData.topics.add(topic));
    
    if (item.knowledgeMetadata?.complexityScore) {
      domainData.complexities.push(item.knowledgeMetadata.complexityScore);
    }
  }

  // Create domain analysis
  return Array.from(domainMap.entries()).map(([domain, data]) => ({
    domain,
    contentCount: data.contentIds.length,
    keyTopics: Array.from(data.topics).slice(0, 10),
    averageComplexity: data.complexities.length > 0 
      ? data.complexities.reduce((sum, c) => sum + c, 0) / data.complexities.length
      : 0.5,
    connectionPotential: calculateConnectionPotential(data.topics),
    professionalRelevance: calculateProfessionalRelevance(domain, Array.from(data.topics))
  }));
}

/**
 * Infer domain from content topics
 */
function inferDomain(topics: string[]): string {
  const domainKeywords = {
    'technology': ['programming', 'software', 'development', 'tech', 'coding', 'api', 'framework'],
    'business': ['strategy', 'management', 'leadership', 'finance', 'marketing', 'sales'],
    'design': ['ui', 'ux', 'design', 'interface', 'user experience', 'visual'],
    'data': ['data', 'analytics', 'machine learning', 'ai', 'statistics', 'analysis'],
    'product': ['product', 'roadmap', 'feature', 'user', 'customer', 'requirement'],
    'operations': ['process', 'workflow', 'automation', 'efficiency', 'operations'],
    'security': ['security', 'privacy', 'compliance', 'risk', 'vulnerability'],
    'innovation': ['innovation', 'emerging', 'future', 'trends', 'disruption']
  };

  const topicText = topics.join(' ').toLowerCase();
  let bestMatch = 'general';
  let highestScore = 0;

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    const score = keywords.filter(keyword => topicText.includes(keyword)).length;
    if (score > highestScore) {
      highestScore = score;
      bestMatch = domain;
    }
  }

  return bestMatch;
}

/**
 * Find connections across different domains
 */
async function findCrossDomainConnections(
  content: any[],
  domainAnalysis: DomainAnalysis[]
): Promise<CrossDomainConnection[]> {
  const connections: CrossDomainConnection[] = [];

  // Only analyze if we have multiple domains
  if (domainAnalysis.length < 2) {
    return connections;
  }

  // Compare content across different domains
  for (let i = 0; i < content.length; i++) {
    for (let j = i + 1; j < content.length; j++) {
      const content1 = content[i];
      const content2 = content[j];

      const domain1 = inferDomain(content1.topics);
      const domain2 = inferDomain(content2.topics);

      // Skip if same domain
      if (domain1 === domain2) continue;

      const connection = await analyzeCrossDomainConnection(
        content1, content2, domain1, domain2
      );

      if (connection) {
        connections.push(connection);
      }
    }
  }

  return connections.sort((a, b) => b.connectionStrength - a.connectionStrength);
}

/**
 * Analyze connection between content from different domains
 */
async function analyzeCrossDomainConnection(
  content1: any,
  content2: any,
  domain1: string,
  domain2: string
): Promise<CrossDomainConnection | null> {
  // Calculate semantic similarity if embeddings available
  let semanticSimilarity = 0;
  if (content1.vectorEmbedding && content2.vectorEmbedding) {
    const embedding1 = content1.vectorEmbedding.embedding;
    const embedding2 = content2.vectorEmbedding.embedding;
    semanticSimilarity = cosineSimilarity(embedding1, embedding2);
  }

  // Calculate topic overlap for cross-domain bridging concepts
  const topicOverlap = calculateTopicOverlap(content1.topics, content2.topics);

  // Determine connection strength
  const connectionStrength = calculateCrossDomainStrength(
    semanticSimilarity, topicOverlap, domain1, domain2
  );

  // Minimum threshold for cross-domain connections
  if (connectionStrength < 0.4) {
    return null;
  }

  // Determine connection type
  const connectionType = determineCrossDomainConnectionType(
    content1, content2, domain1, domain2, semanticSimilarity
  );

  // Extract bridging concepts
  const bridgingConcepts = extractBridgingConcepts(content1.topics, content2.topics);

  // Identify professional opportunities
  const professionalOpportunities = identifyProfessionalOpportunities(
    domain1, domain2, bridgingConcepts, connectionType
  );

  // Assess implementation synergies
  const implementationSynergies = assessImplementationSynergies(
    content1, content2, connectionType
  );

  // Identify risk factors
  const riskFactors = identifyRiskFactors(domain1, domain2, connectionType);

  return {
    id: `cross-domain-${content1.id}-${content2.id}`,
    primaryContentId: content1.id,
    secondaryContentId: content2.id,
    primaryDomain: domain1,
    secondaryDomain: domain2,
    connectionType,
    connectionStrength,
    bridgingConcepts,
    professionalOpportunities,
    implementationSynergies,
    riskFactors,
    confidence: Math.min(0.9, connectionStrength + 0.1),
    discoveredAt: new Date()
  };
}

/**
 * Calculate connection strength across domains
 */
function calculateCrossDomainStrength(
  semanticSimilarity: number,
  topicOverlap: number,
  domain1: string,
  domain2: string
): number {
  // Base strength from semantic similarity and topic overlap
  let strength = (semanticSimilarity * 0.6) + (topicOverlap * 0.4);

  // Boost for strategic domain combinations
  const strategicCombinations = [
    ['technology', 'business'],
    ['data', 'business'],
    ['design', 'technology'],
    ['product', 'technology'],
    ['security', 'business']
  ];

  const isStrategicCombo = strategicCombinations.some(combo => 
    (combo[0] === domain1 && combo[1] === domain2) ||
    (combo[0] === domain2 && combo[1] === domain1)
  );

  if (isStrategicCombo) {
    strength += 0.2;
  }

  return Math.min(1.0, strength);
}

/**
 * Determine type of cross-domain connection
 */
function determineCrossDomainConnectionType(
  content1: any,
  content2: any,
  domain1: string,
  domain2: string,
  semanticSimilarity: number
): 'synergistic' | 'competitive' | 'complementary' | 'causal' | 'transformative' {
  const combinedContent = `${content1.title} ${content1.summary} ${content2.title} ${content2.summary}`.toLowerCase();

  // Look for transformation indicators
  if (combinedContent.includes('transform') || combinedContent.includes('disrupt') || 
      combinedContent.includes('innovate') || combinedContent.includes('revolutionize')) {
    return 'transformative';
  }

  // Look for causal relationships
  if (combinedContent.includes('cause') || combinedContent.includes('effect') || 
      combinedContent.includes('impact') || combinedContent.includes('result')) {
    return 'causal';
  }

  // High semantic similarity suggests synergistic relationship
  if (semanticSimilarity > 0.7) {
    return 'synergistic';
  }

  // Strategic domain combinations are often complementary
  const strategicCombinations = [
    ['technology', 'business'],
    ['design', 'technology'],
    ['product', 'data']
  ];

  const isStrategicCombo = strategicCombinations.some(combo => 
    (combo[0] === domain1 && combo[1] === domain2) ||
    (combo[0] === domain2 && combo[1] === domain1)
  );

  if (isStrategicCombo) {
    return 'complementary';
  }

  // Default to synergistic for cross-domain connections
  return 'synergistic';
}

/**
 * Extract concepts that bridge domains
 */
function extractBridgingConcepts(topics1: string[], topics2: string[]): string[] {
  const commonTopics = topics1.filter(topic => 
    topics2.some(t => t.toLowerCase() === topic.toLowerCase())
  );

  // Also look for related concepts that could bridge domains
  const bridgingKeywords = [
    'integration', 'platform', 'system', 'process', 'workflow', 
    'automation', 'optimization', 'strategy', 'implementation'
  ];

  const allTopics = [...topics1, ...topics2];
  const bridgingTopics = allTopics.filter(topic =>
    bridgingKeywords.some(keyword => 
      topic.toLowerCase().includes(keyword) || keyword.includes(topic.toLowerCase())
    )
  );

  return [...new Set([...commonTopics, ...bridgingTopics])].slice(0, 5);
}

/**
 * Identify professional opportunities from cross-domain connections
 */
function identifyProfessionalOpportunities(
  domain1: string,
  domain2: string,
  bridgingConcepts: string[],
  connectionType: string
): string[] {
  const opportunities: string[] = [];

  // Domain-specific opportunities
  const domainOpportunities = {
    'technology-business': [
      'Technical leadership with business acumen',
      'Product-technology strategy alignment',
      'Digital transformation initiatives'
    ],
    'data-business': [
      'Data-driven decision making',
      'Business intelligence leadership',
      'Analytics strategy development'
    ],
    'design-technology': [
      'User experience engineering',
      'Design system architecture',
      'Human-centered technology development'
    ],
    'product-technology': [
      'Technical product management',
      'Engineering-product collaboration',
      'Technology roadmap planning'
    ]
  };

  const key = `${domain1}-${domain2}`;
  const reverseKey = `${domain2}-${domain1}`;

  if (domainOpportunities[key as keyof typeof domainOpportunities]) {
    opportunities.push(...domainOpportunities[key as keyof typeof domainOpportunities]);
  } else if (domainOpportunities[reverseKey as keyof typeof domainOpportunities]) {
    opportunities.push(...domainOpportunities[reverseKey as keyof typeof domainOpportunities]);
  }

  // Connection-type specific opportunities
  if (connectionType === 'transformative') {
    opportunities.push('Innovation leadership', 'Market disruption strategy');
  } else if (connectionType === 'synergistic') {
    opportunities.push('Cross-functional expertise', 'Integrated solutions development');
  }

  return opportunities.slice(0, 3);
}

/**
 * Assess implementation synergies
 */
function assessImplementationSynergies(
  content1: any,
  content2: any,
  connectionType: string
): string[] {
  const synergies = [
    'Shared knowledge base leveraging',
    'Cross-domain skill application',
    'Integrated project approach'
  ];

  if (connectionType === 'complementary') {
    synergies.push('Complementary skill set utilization');
  } else if (connectionType === 'synergistic') {
    synergies.push('Amplified impact through combination');
  }

  return synergies.slice(0, 3);
}

/**
 * Identify risk factors for cross-domain implementation
 */
function identifyRiskFactors(
  domain1: string,
  domain2: string,
  connectionType: string
): string[] {
  const risks = [
    'Context switching complexity',
    'Skill depth vs breadth trade-offs',
    'Resource allocation challenges'
  ];

  if (connectionType === 'transformative') {
    risks.push('High uncertainty in outcomes');
  }

  return risks.slice(0, 3);
}

/**
 * Generate strategic insights from cross-domain connections
 */
function generateCrossDomainInsights(
  connections: CrossDomainConnection[],
  domainAnalysis: DomainAnalysis[],
  professionalContext?: any
): CrossDomainInsight[] {
  const insights: CrossDomainInsight[] = [];

  // Group connections by domain pairs
  const domainPairMap = new Map<string, CrossDomainConnection[]>();
  
  connections.forEach(conn => {
    const key = [conn.primaryDomain, conn.secondaryDomain].sort().join('-');
    if (!domainPairMap.has(key)) {
      domainPairMap.set(key, []);
    }
    domainPairMap.get(key)!.push(conn);
  });

  // Generate insights for each domain pair
  domainPairMap.forEach((conns, domainPair) => {
    const domains = domainPair.split('-');
    const connectionPatterns = conns.map(c => c.connectionType);
    const mostCommonPattern = getMostCommon(connectionPatterns);

    insights.push({
      domains,
      connectionPattern: `Primarily ${mostCommonPattern} relationships`,
      strategicImplications: [
        `Strong ${mostCommonPattern} potential between ${domains.join(' and ')}`,
        `${conns.length} connection opportunities identified`,
        `Average connection strength: ${Math.round(conns.reduce((sum, c) => sum + c.connectionStrength, 0) / conns.length * 100)}%`
      ],
      actionableOpportunities: [
        ...new Set(conns.flatMap(c => c.professionalOpportunities))
      ].slice(0, 3),
      skillTransferPotential: [
        `${domains[0]} skills applicable to ${domains[1]}`,
        `Integrated approach opportunities`,
        `Cross-pollination benefits`
      ],
      marketDifferentiation: [
        `Unique cross-domain expertise`,
        `Integrated solution capability`,
        `Multi-disciplinary perspective advantage`
      ]
    });
  });

  return insights;
}

/**
 * Generate actionable recommendations
 */
function generateCrossDomainRecommendations(
  connections: CrossDomainConnection[],
  insights: CrossDomainInsight[],
  professionalContext?: any
): string[] {
  const recommendations: string[] = [];

  if (connections.length === 0) {
    return ['Explore content from additional professional domains to discover cross-domain opportunities'];
  }

  // High-strength connections
  const strongConnections = connections.filter(c => c.connectionStrength > 0.7);
  if (strongConnections.length > 0) {
    recommendations.push(
      `Prioritize developing expertise in ${strongConnections[0].primaryDomain}-${strongConnections[0].secondaryDomain} integration`
    );
  }

  // Transformative connections
  const transformativeConnections = connections.filter(c => c.connectionType === 'transformative');
  if (transformativeConnections.length > 0) {
    recommendations.push('Explore transformative opportunities for competitive advantage');
  }

  // Multiple domain coverage
  const domains = [...new Set(connections.flatMap(c => [c.primaryDomain, c.secondaryDomain]))];
  if (domains.length >= 3) {
    recommendations.push('Leverage multi-domain expertise for unique market positioning');
  }

  // Professional opportunities
  const opportunities = [...new Set(connections.flatMap(c => c.professionalOpportunities))];
  if (opportunities.length > 0) {
    recommendations.push(`Focus on: ${opportunities.slice(0, 2).join(' and ')}`);
  }

  return recommendations.slice(0, 4);
}

// Helper functions
function calculateConnectionPotential(topics: Set<string>): number {
  // More diverse topics = higher connection potential
  return Math.min(1.0, topics.size / 10);
}

function calculateProfessionalRelevance(domain: string, topics: string[]): number {
  // Strategic domains have higher professional relevance
  const strategicDomains = ['technology', 'business', 'data', 'product'];
  return strategicDomains.includes(domain) ? 0.9 : 0.7;
}

function getMostCommon<T>(array: T[]): T {
  const counts = new Map<T, number>();
  array.forEach(item => counts.set(item, (counts.get(item) || 0) + 1));
  
  let maxCount = 0;
  let mostCommon = array[0];
  
  counts.forEach((count, item) => {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = item;
    }
  });
  
  return mostCommon;
}