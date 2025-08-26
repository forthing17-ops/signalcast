import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { SourceManager } from '@/lib/content-sources/source-manager';
import { ContentScoringEngine } from '@/lib/content-scoring';
import { ContentDeduplicationEngine } from '@/lib/content-deduplication';
import { dbRateLimitMonitor } from '@/lib/rate-limit-monitor-db';
import { contentModerationService } from '@/lib/content-moderation';

export async function POST(request: NextRequest) {
  try {
    // Verify cron authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting content fetching cron job');

    // Initialize engines
    const sourceManager = new SourceManager();
    const scoringEngine = new ContentScoringEngine();
    const deduplicationEngine = new ContentDeduplicationEngine();

    // Get all users with preferences
    const usersWithPreferences = await prisma.user.findMany({
      where: {
        preferences: {
          isNot: null,
        },
      },
      include: {
        preferences: true,
      },
    });

    logger.info(`Found ${usersWithPreferences.length} users with preferences`);

    let totalContentFetched = 0;
    const totalContentStored = 0;
    const errors: string[] = [];

    // Process each user
    for (const user of usersWithPreferences) {
      try {
        await processUserContent(
          user,
          sourceManager,
          scoringEngine,
          deduplicationEngine
        );
        totalContentFetched++;
      } catch (error) {
        logger.error(`Failed to process content for user ${user.id}`, error);
        errors.push(`User ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Get final usage statistics
    const usageStats = await dbRateLimitMonitor.getAllUsageStats();

    const response = {
      success: true,
      processed: totalContentFetched,
      stored: totalContentStored,
      errors: errors.length > 0 ? errors : undefined,
      usageStats,
      timestamp: new Date().toISOString(),
    };

    logger.info('Content fetching cron job completed', response);
    return NextResponse.json(response);

  } catch (error) {
    logger.error('Content fetching cron job failed', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function processUserContent(
  user: { id: string; preferences: any },
  sourceManager: SourceManager,
  scoringEngine: ContentScoringEngine,
  deduplicationEngine: ContentDeduplicationEngine
): Promise<void> {
  const { preferences } = user;
  
  if (!preferences.interests?.length && !preferences.techStack?.length) {
    logger.info(`Skipping user ${user.id} - no interests or tech stack defined`);
    return;
  }

  // Check source health before fetching
  const healthStatus = await sourceManager.checkSourceHealth();
  const healthySourceCount = Object.values(healthStatus).filter(Boolean).length;
  
  if (healthySourceCount === 0) {
    logger.warn(`No healthy sources available for user ${user.id}`);
    return;
  }

  logger.info(`Processing content for user ${user.id} with ${healthySourceCount} healthy sources`);

  try {
    // Fetch content from all sources
    const rawContent = await sourceManager.fetchAllContent(
      preferences.interests || [],
      preferences.techStack || [],
      { maxItems: 100 } // Fetch more, filter later
    );

    if (rawContent.length === 0) {
      logger.info(`No content fetched for user ${user.id}`);
      return;
    }

    // Convert to deduplication format
    const contentForDeduplication = rawContent.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      url: item.url,
      sourcePlatform: item.sourcePlatform,
    }));

    // Remove duplicates
    const deduplicationResult = deduplicationEngine.deduplicateContent(contentForDeduplication);
    const dedupeStats = deduplicationEngine.getDeduplicationStats(deduplicationResult);

    logger.info(`Deduplication for user ${user.id}:`, dedupeStats);

    // Score and rank unique content
    const userProfile = {
      interests: preferences.interests || [],
      techStack: preferences.techStack || [],
      contentDepth: preferences.contentDepth || 'detailed',
      professionalRole: preferences.professionalRole,
      industry: preferences.industry,
    };

    const scoringWeights = scoringEngine.getOptimizedWeights(userProfile);
    const uniqueRawContent = rawContent.filter(item => 
      deduplicationResult.uniqueContent.some(unique => unique.id === item.id)
    );

    const scoredContent = scoringEngine.scoreMultipleItems(
      uniqueRawContent,
      userProfile,
      scoringWeights
    );

    // Filter by minimum relevance score and limit results
    const minRelevanceScore = 30; // Configurable threshold
    const maxContentItems = 20;   // Configurable limit per user

    const relevantContent = scoredContent
      .filter(item => item.relevanceScore >= minRelevanceScore)
      .slice(0, maxContentItems);

    if (relevantContent.length === 0) {
      logger.info(`No content met relevance threshold for user ${user.id}`);
      return;
    }

    // Apply content moderation to filter inappropriate content
    const contentForModeration = relevantContent.map(item => ({
      title: item.title,
      summary: item.title, // Using title as summary for now
      sourceUrl: item.url
    }));

    const moderationResults = await contentModerationService.moderateContentBatch(contentForModeration);
    const moderationStats = contentModerationService.getModerationStats(moderationResults);
    
    logger.info(`Content moderation for user ${user.id}:`, moderationStats);

    // Filter out inappropriate content
    const finalContent = relevantContent.filter((item, index) => {
      const moderationResult = moderationResults[index];
      if (!moderationResult.isAppropriate) {
        logger.warn(`Blocked inappropriate content: ${item.title}`, {
          flags: moderationResult.flags,
          reasons: moderationResult.reasons
        });
        return false;
      }
      return true;
    });

    if (finalContent.length === 0) {
      logger.info(`No content passed moderation for user ${user.id}`);
      return;
    }

    // Store content in database
    const contentToStore = finalContent.map(item => ({
      title: item.title,
      summary: item.title, // Will be enhanced by AI synthesis in future stories
      content: item.content,
      sourceUrls: [item.url],
      topics: item.topics,
      createdBy: user.id,
      sourcePlatform: item.sourcePlatform,
      sourceMetadata: item.sourceMetadata,
      relevanceScore: item.relevanceScore,
      contentHash: deduplicationEngine.generateContentHash({
        id: item.id,
        title: item.title,
        content: item.content,
        url: item.url,
        sourcePlatform: item.sourcePlatform,
      }),
    }));

    // Batch insert content
    const createdContent = await prisma.content.createMany({
      data: contentToStore,
      skipDuplicates: true,
    });

    logger.info(`Stored ${createdContent.count} content items for user ${user.id} (scored ${finalContent.length} items)`);

  } catch (error) {
    logger.error(`Error processing content for user ${user.id}`, error);
    throw error;
  }
}

// Health check endpoint
export async function GET() {
  try {
    const sourceManager = new SourceManager();
    const healthStatus = await sourceManager.checkSourceHealth();
    const usageStats = rateLimitMonitor.getAllUsageStats();

    return NextResponse.json({
      healthy: true,
      sources: healthStatus,
      usage: usageStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { 
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}