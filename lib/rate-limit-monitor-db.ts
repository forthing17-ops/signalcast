import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface RateLimitConfig {
  service: string;
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
  alertThreshold: number; // Percentage (0-100) when to alert
}

export interface UsageRecord {
  service: string;
  timestamp: number;
  requestCount: number;
  windowStart: number;
  windowEnd: number;
}

/**
 * Database-backed rate limit monitor that persists state
 * across server restarts and provides accurate usage tracking
 */
export class DatabaseRateLimitMonitor {
  private configs = new Map<string, RateLimitConfig>();

  constructor() {
    this.initializeConfigs();
  }

  private initializeConfigs(): void {
    // Reddit API: 100 queries per minute
    this.configs.set('reddit', {
      service: 'reddit',
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
      alertThreshold: parseInt(process.env.API_USAGE_ALERT_THRESHOLD_PERCENT || '80', 10),
    });

    // Product Hunt RSS: No rate limits, but we'll monitor anyway
    this.configs.set('producthunt-rss', {
      service: 'producthunt-rss',
      maxRequests: 1000, // Generous limit for monitoring
      windowMs: 60 * 60 * 1000, // 1 hour
      alertThreshold: 90,
    });

    // RSS2JSON API: 10 requests per hour for free tier
    this.configs.set('rss2json', {
      service: 'rss2json',
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
      alertThreshold: 80,
    });
  }

  async recordRequest(service: string): Promise<boolean> {
    const config = this.configs.get(service);
    if (!config) {
      logger.warn(`No rate limit config found for service: ${service}`);
      return true; // Allow request if no config
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    // Clean up old records
    await this.cleanupOldRecords(service, windowStart);

    // Get current usage
    const currentUsage = await this.getCurrentUsage(service, windowStart);
    
    // Check if we're at the limit
    if (currentUsage >= config.maxRequests) {
      logger.warn(`Rate limit exceeded for ${service}: ${currentUsage}/${config.maxRequests}`);
      return false;
    }

    // Record this request in database
    await prisma.apiRateLimit.create({
      data: {
        service,
        timestamp: now,
        windowStart,
        windowEnd: new Date(now.getTime() + config.windowMs),
        requestCount: 1,
      },
    });

    // Check if we should alert
    const newUsage = currentUsage + 1;
    const usagePercentage = (newUsage / config.maxRequests) * 100;
    
    if (usagePercentage >= config.alertThreshold) {
      await this.sendUsageAlert(service, newUsage, config.maxRequests, usagePercentage);
    }

    return true;
  }

  async getCurrentUsage(service: string, windowStart?: Date): Promise<number> {
    const config = this.configs.get(service);
    if (!config) return 0;

    const start = windowStart || new Date(Date.now() - config.windowMs);

    const usageResult = await prisma.apiRateLimit.aggregate({
      _sum: {
        requestCount: true,
      },
      where: {
        service,
        timestamp: {
          gte: start,
        },
      },
    });

    return usageResult._sum.requestCount || 0;
  }

  async getUsageStats(service: string): Promise<{
    current: number;
    limit: number;
    percentage: number;
    timeUntilReset: number;
  } | null> {
    const config = this.configs.get(service);
    if (!config) return null;

    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);
    const current = await this.getCurrentUsage(service, windowStart);
    const percentage = (current / config.maxRequests) * 100;

    // Find the oldest request in the current window to calculate reset time
    const oldestRecord = await prisma.apiRateLimit.findFirst({
      where: {
        service,
        timestamp: {
          gte: windowStart,
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    const timeUntilReset = oldestRecord 
      ? Math.max(0, (oldestRecord.timestamp.getTime() + config.windowMs) - now.getTime())
      : 0;

    return {
      current,
      limit: config.maxRequests,
      percentage,
      timeUntilReset,
    };
  }

  async getAllUsageStats(): Promise<Record<string, Awaited<ReturnType<DatabaseRateLimitMonitor['getUsageStats']>>>> {
    const stats: Record<string, Awaited<ReturnType<DatabaseRateLimitMonitor['getUsageStats']>>> = {};
    
    for (const [service] of this.configs) {
      stats[service] = await this.getUsageStats(service);
    }

    return stats;
  }

  private async cleanupOldRecords(service: string, windowStart: Date): Promise<void> {
    try {
      const result = await prisma.apiRateLimit.deleteMany({
        where: {
          service,
          timestamp: {
            lt: windowStart,
          },
        },
      });

      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} old rate limit records for ${service}`);
      }
    } catch (error) {
      logger.error(`Failed to cleanup old rate limit records for ${service}:`, error);
    }
  }

  private async sendUsageAlert(
    service: string, 
    currentUsage: number, 
    maxRequests: number, 
    percentage: number
  ): Promise<void> {
    const message = `API usage alert for ${service}: ${currentUsage}/${maxRequests} (${percentage.toFixed(1)}%)`;
    
    logger.warn(message, {
      service,
      currentUsage,
      maxRequests,
      percentage,
    });

    // In production, you might want to send this to a monitoring service
    // or email/Slack notification system
  }

  async canMakeRequest(service: string): Promise<boolean> {
    const config = this.configs.get(service);
    if (!config) return true;

    const windowStart = new Date(Date.now() - config.windowMs);
    const currentUsage = await this.getCurrentUsage(service, windowStart);
    
    return currentUsage < config.maxRequests;
  }

  async getTimeUntilReset(service: string): Promise<number> {
    const stats = await this.getUsageStats(service);
    return stats ? stats.timeUntilReset : 0;
  }

  /**
   * Get rate limit statistics for monitoring dashboard
   */
  async getDashboardStats(): Promise<{
    services: Record<string, {
      name: string;
      current: number;
      limit: number;
      percentage: number;
      status: 'healthy' | 'warning' | 'critical';
      nextReset: Date | null;
    }>;
    totalRequests24h: number;
    alertsTriggered: number;
  }> {
    const services: Record<string, any> = {};
    let alertsTriggered = 0;

    for (const [serviceName, config] of this.configs) {
      const stats = await this.getUsageStats(serviceName);
      if (stats) {
        const status = stats.percentage >= 90 ? 'critical' : 
                      stats.percentage >= config.alertThreshold ? 'warning' : 'healthy';
        
        if (stats.percentage >= config.alertThreshold) {
          alertsTriggered++;
        }

        const nextReset = stats.timeUntilReset > 0 
          ? new Date(Date.now() + stats.timeUntilReset)
          : null;

        services[serviceName] = {
          name: serviceName,
          current: stats.current,
          limit: stats.limit,
          percentage: stats.percentage,
          status,
          nextReset,
        };
      }
    }

    // Get total requests in last 24 hours across all services
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const totalResult = await prisma.apiRateLimit.aggregate({
      _sum: {
        requestCount: true,
      },
      where: {
        timestamp: {
          gte: twentyFourHoursAgo,
        },
      },
    });

    return {
      services,
      totalRequests24h: totalResult._sum.requestCount || 0,
      alertsTriggered,
    };
  }
}

// Singleton instance
export const dbRateLimitMonitor = new DatabaseRateLimitMonitor();