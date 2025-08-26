import { prisma } from './prisma'
import { synthesizeContent, SynthesisContext, validateSynthesisResult, ProfessionalSynthesisResult } from './openai'
import { extractProfessionalContext, buildSynthesisContext } from './professional-context'
import { logger } from './logger'

export interface RawContentItem {
  id: string
  title: string
  content: string
  sourcePlatform: string
  sourceUrls: string[]
  topics: string[]
  publishedAt: Date
  relevanceScore?: number
}

export interface SynthesizedInsight {
  title: string
  summary: string
  details: string
  sources: string[]
  sourceUrls: string[]
  relevanceScore: number
  tags: string[]
  actionItems: string[]
  synthesizedAt: Date
  userId: string
  // Professional insight enhancements
  professionalImpact?: {
    decisionSupport: string
    businessValue: string
    implementationComplexity: 'low' | 'medium' | 'high'
  }
  confidenceLevel?: number
  crossDomainConnections?: string[]
  professionalRecommendations?: string[]
}

// Fetch user context for professional personalization
async function getUserContext(userId: string): Promise<SynthesisContext> {
  try {
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId }
    })

    // Extract professional context using the new context extraction system
    const professionalContext = extractProfessionalContext(userPreferences)
    const synthesisContext = buildSynthesisContext(professionalContext)

    logger.info('Built synthesis context for user', { 
      userId, 
      hasContext: Boolean(professionalContext.role && professionalContext.industry),
      contextCompleteness: `${Math.round((Object.values(professionalContext).filter(v => 
        Array.isArray(v) ? v.length > 0 : v && v !== 'Not specified'
      ).length / Object.keys(professionalContext).length) * 100)}%`
    })

    return synthesisContext
  } catch (error) {
    logger.error('Error fetching user context', error as Error)
    return {}
  }
}

// Multi-source content aggregation - get existing stored content from the last 24 hours
export async function aggregateContentForUser(
  userId: string,
  limit: number = 10
): Promise<RawContentItem[]> {
  try {
    // Fetch content for this user from the last 24 hours
    const rawContent = await prisma.content.findMany({
      where: {
        createdBy: userId,
        // Only get content from the last 24 hours for synthesis
        publishedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: [
        { relevanceScore: 'desc' },
        { publishedAt: 'desc' }
      ],
      take: limit
    })

    logger.info('Aggregated content for synthesis', {
      userId,
      contentItems: rawContent.length
    })

    return rawContent.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      sourcePlatform: item.sourcePlatform || 'unknown',
      sourceUrls: item.sourceUrls,
      topics: item.topics,
      publishedAt: item.publishedAt,
      relevanceScore: item.relevanceScore || 0
    }))

  } catch (error) {
    logger.error('Error aggregating content', error as Error)
    return []
  }
}

// Main synthesis engine
export async function synthesizeContentForUser(
  userId: string,
  contentLimit: number = 10
): Promise<SynthesizedInsight[]> {
  try {
    logger.info('Starting content synthesis for user', { userId })

    // 1. Aggregate raw content
    const rawContent = await aggregateContentForUser(userId, contentLimit)
    
    if (rawContent.length === 0) {
      logger.info('No raw content available for synthesis', { userId })
      return []
    }

    // 2. Get user context for personalization
    const userContext = await getUserContext(userId)

    // 3. Prepare content for AI synthesis (combine title + content)
    const contentTexts = rawContent.map(item => 
      `Title: ${item.title}\nSource: ${item.sourcePlatform}\nContent: ${item.content}\nURL: ${item.sourceUrls[0] || ''}\nTopics: ${item.topics.join(', ')}`
    )

    // 4. Synthesize using AI with professional context
    const synthesisResult = await synthesizeContent(contentTexts, userContext)

    if (!synthesisResult || !validateSynthesisResult(synthesisResult)) {
      logger.warn('AI synthesis failed or returned invalid results', { userId })
      return []
    }

    // 5. Transform AI results to our enhanced professional format
    const synthesizedInsights: SynthesizedInsight[] = synthesisResult.insights.map(insight => ({
      title: insight.title,
      summary: insight.summary,
      details: insight.details,
      sources: insight.sources,
      sourceUrls: rawContent
        .filter((_, index) => insight.sources.includes(`Source ${index + 1}`))
        .flatMap(item => item.sourceUrls),
      relevanceScore: insight.relevanceScore,
      tags: insight.tags,
      actionItems: insight.actionItems,
      synthesizedAt: new Date(),
      userId,
      // Enhanced professional insight data
      professionalImpact: insight.professionalImpact,
      confidenceLevel: insight.confidenceLevel,
      crossDomainConnections: insight.crossDomainConnections,
      professionalRecommendations: synthesisResult.professionalRecommendations
    }))

    logger.info('Content synthesis completed successfully', {
      userId,
      rawContentItems: rawContent.length,
      synthesizedInsights: synthesizedInsights.length,
      confidenceScore: synthesisResult.confidenceScore
    })

    return synthesizedInsights

  } catch (error) {
    logger.error('Error in content synthesis pipeline', error as Error)
    return []
  }
}

// Batch processing function for multiple users
export async function batchSynthesizeContent(
  userIds: string[],
  contentLimit: number = 10
): Promise<{
  successful: number
  failed: number
  totalInsights: number
}> {
  let successful = 0
  let failed = 0
  let totalInsights = 0

  logger.info('Starting batch content synthesis', { 
    userCount: userIds.length 
  })

  for (const userId of userIds) {
    try {
      const insights = await synthesizeContentForUser(userId, contentLimit)
      
      if (insights.length > 0) {
        // Store synthesized insights in database
        await storeSynthesizedInsights(insights)
        successful++
        totalInsights += insights.length
      } else {
        logger.warn('No insights generated for user', { userId })
      }

    } catch (error) {
      logger.error('Batch synthesis failed for user', error as Error)
      failed++
    }

    // Add small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  logger.info('Batch synthesis completed', {
    successful,
    failed,
    totalInsights
  })

  return { successful, failed, totalInsights }
}

// Store synthesized insights in database using the existing Content table
async function storeSynthesizedInsights(insights: SynthesizedInsight[]): Promise<void> {
  try {
    for (const insight of insights) {
      await prisma.content.create({
        data: {
          title: insight.title,
          summary: insight.summary,
          content: insight.details, // Store detailed analysis in content field
          sourceUrls: insight.sourceUrls,
          topics: insight.tags, // Use tags as topics
          createdBy: insight.userId,
          sourcePlatform: 'ai-synthesis', // Special platform for AI synthesized content
          sourceMetadata: {
            sources: insight.sources,
            actionItems: insight.actionItems,
            synthesizedAt: insight.synthesizedAt.toISOString(),
            type: 'ai-synthesized',
            // Professional insight metadata
            professionalImpact: insight.professionalImpact,
            confidenceLevel: insight.confidenceLevel,
            crossDomainConnections: insight.crossDomainConnections,
            professionalRecommendations: insight.professionalRecommendations
          },
          relevanceScore: insight.relevanceScore,
          publishedAt: insight.synthesizedAt
        }
      })
    }

    logger.info('Stored synthesized insights', { 
      insightCount: insights.length,
      userId: insights[0]?.userId 
    })

  } catch (error) {
    logger.error('Error storing synthesized insights', error as Error)
    throw error
  }
}

// Quality validation for synthesized content
export function validateSynthesizedInsight(insight: SynthesizedInsight): boolean {
  return (
    insight.title.length > 0 &&
    insight.summary.length > 10 &&
    insight.details.length > 20 &&
    insight.sources.length > 0 &&
    insight.relevanceScore >= 0 &&
    insight.relevanceScore <= 1 &&
    insight.tags.length > 0
  )
}