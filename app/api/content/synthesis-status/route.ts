import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { getRateLimitStatus } from '@/lib/openai'

export async function GET() {
  try {
    // Get OpenAI rate limit status
    const rateLimitStatus = getRateLimitStatus()
    
    // Get synthesis statistics
    const stats = await prisma.$transaction(async (tx) => {
      // Count AI-synthesized content in last 24 hours
      const recentSynthesized = await tx.content.count({
        where: {
          sourcePlatform: 'ai-synthesis',
          publishedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })

      // Count raw content available for synthesis
      const rawContentAvailable = await tx.content.count({
        where: {
          sourcePlatform: {
            not: 'ai-synthesis'
          },
          publishedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })

      // Count users who have raw content but no synthesized content today
      const usersNeedingSynthesis = await tx.user.count({
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
            },
            none: {
              sourcePlatform: 'ai-synthesis',
              publishedAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
              }
            }
          }
        }
      })

      // Get recent synthesis examples
      const recentSynthesisExamples = await tx.content.findMany({
        where: {
          sourcePlatform: 'ai-synthesis',
          publishedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        select: {
          id: true,
          title: true,
          summary: true,
          topics: true,
          relevanceScore: true,
          publishedAt: true,
          createdBy: true
        },
        orderBy: {
          publishedAt: 'desc'
        },
        take: 5
      })

      return {
        recentSynthesized,
        rawContentAvailable,
        usersNeedingSynthesis,
        recentSynthesisExamples
      }
    })

    // Calculate synthesis health score
    const healthScore = calculateSynthesisHealth(stats, rateLimitStatus)

    const response = {
      status: 'operational',
      healthScore,
      statistics: stats,
      rateLimits: rateLimitStatus,
      recommendations: generateRecommendations(stats, rateLimitStatus),
      timestamp: new Date().toISOString()
    }

    logger.info('Synthesis status requested', {
      healthScore,
      usersNeedingSynthesis: stats.usersNeedingSynthesis,
      rateLimitOk: rateLimitStatus.rateLimitOk
    })

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Error fetching synthesis status', error as Error)
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Calculate synthesis system health (0-100)
function calculateSynthesisHealth(
  stats: {
    recentSynthesized: number
    rawContentAvailable: number
    usersNeedingSynthesis: number
  },
  rateLimitStatus: ReturnType<typeof getRateLimitStatus>
): number {
  let health = 100

  // Rate limit health (40% weight)
  if (!rateLimitStatus.rateLimitOk) {
    health -= 40
  } else if (rateLimitStatus.currentMinuteRequests > rateLimitStatus.limitsPerMinute * 0.8) {
    health -= 20 // Near limit warning
  }

  // Content synthesis activity (30% weight)
  if (stats.recentSynthesized === 0 && stats.rawContentAvailable > 0) {
    health -= 30 // No synthesis despite available content
  } else if (stats.recentSynthesized < stats.rawContentAvailable * 0.1) {
    health -= 15 // Low synthesis rate
  }

  // Pending synthesis backlog (30% weight)
  if (stats.usersNeedingSynthesis > 100) {
    health -= 30 // Large backlog
  } else if (stats.usersNeedingSynthesis > 50) {
    health -= 15 // Moderate backlog
  }

  return Math.max(0, health)
}

// Generate recommendations based on current status
function generateRecommendations(
  stats: {
    recentSynthesized: number
    rawContentAvailable: number
    usersNeedingSynthesis: number
  },
  rateLimitStatus: ReturnType<typeof getRateLimitStatus>
): string[] {
  const recommendations: string[] = []

  if (!rateLimitStatus.rateLimitOk) {
    recommendations.push('Rate limit exceeded - synthesis is temporarily paused')
  }

  if (stats.usersNeedingSynthesis > 50) {
    recommendations.push(`${stats.usersNeedingSynthesis} users need synthesis - consider running manual synthesis job`)
  }

  if (stats.rawContentAvailable > 0 && stats.recentSynthesized === 0) {
    recommendations.push('Raw content available but no synthesis completed - check system health')
  }

  if (rateLimitStatus.currentDayRequests > rateLimitStatus.limitsPerDay * 0.8) {
    recommendations.push('Approaching daily API limit - monitor usage closely')
  }

  if (recommendations.length === 0) {
    recommendations.push('System operating normally')
  }

  return recommendations
}