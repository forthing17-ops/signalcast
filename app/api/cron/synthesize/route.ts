import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { batchSynthesizeContent } from '@/lib/content-synthesis'
import { getRateLimitStatus } from '@/lib/openai'

export async function POST(request: NextRequest) {
  try {
    // Verify cron authorization
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Starting AI content synthesis cron job')

    // Check OpenAI rate limits before starting
    const rateLimitStatus = getRateLimitStatus()
    if (!rateLimitStatus.rateLimitOk) {
      logger.warn('OpenAI rate limit exceeded, skipping synthesis', rateLimitStatus)
      return NextResponse.json({
        success: false,
        message: 'OpenAI rate limit exceeded',
        rateLimitStatus,
        timestamp: new Date().toISOString()
      })
    }

    // Get users who have raw content from the last 24 hours but no AI-synthesized content today
    const usersWithContent = await prisma.user.findMany({
      where: {
        preferences: {
          isNot: null
        },
        content: {
          some: {
            // Has raw content from last 24 hours
            publishedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            },
            sourcePlatform: {
              not: 'ai-synthesis' // Exclude already synthesized content
            }
          }
        }
      },
      include: {
        preferences: true,
        content: {
          where: {
            sourcePlatform: 'ai-synthesis',
            publishedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }
      }
    })

    // Filter out users who already have synthesized content today
    const usersNeedingSynthesis = usersWithContent.filter(user => user.content.length === 0)

    logger.info(`Found ${usersNeedingSynthesis.length} users needing AI synthesis`)

    if (usersNeedingSynthesis.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users need synthesis at this time',
        processed: 0,
        timestamp: new Date().toISOString()
      })
    }

    // Limit batch size to respect OpenAI rate limits
    const maxBatchSize = 50 // Conservative limit
    const userIdsToProcess = usersNeedingSynthesis
      .slice(0, maxBatchSize)
      .map(user => user.id)

    // Process synthesis in batches
    const synthesisResult = await batchSynthesizeContent(userIdsToProcess)

    // Get final rate limit status
    const finalRateLimitStatus = getRateLimitStatus()

    const response = {
      success: true,
      processed: synthesisResult.successful,
      failed: synthesisResult.failed,
      totalInsights: synthesisResult.totalInsights,
      rateLimitStatus: finalRateLimitStatus,
      timestamp: new Date().toISOString()
    }

    logger.info('AI synthesis cron job completed', response)
    return NextResponse.json(response)

  } catch (error) {
    logger.error('AI synthesis cron job failed', error as Error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Health check endpoint for synthesis system
export async function GET() {
  try {
    // Check OpenAI API status
    const rateLimitStatus = getRateLimitStatus()
    
    // Get recent synthesis activity stats
    const recentSynthesis = await prisma.content.count({
      where: {
        sourcePlatform: 'ai-synthesis',
        publishedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    })

    // Get users with content available for synthesis
    const usersWithContentCount = await prisma.user.count({
      where: {
        preferences: {
          isNot: null
        },
        content: {
          some: {
            publishedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            },
            sourcePlatform: {
              not: 'ai-synthesis'
            }
          }
        }
      }
    })

    return NextResponse.json({
      healthy: true,
      synthesis: {
        recent24hSynthesized: recentSynthesis,
        usersWithContentAvailable: usersWithContentCount,
        rateLimitOk: rateLimitStatus.rateLimitOk
      },
      rateLimitStatus,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      { 
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}