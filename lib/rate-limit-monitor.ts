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

export class RateLimitMonitor {
  private usageRecords = new Map<string, UsageRecord[]>();
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

    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Clean up old records
    this.cleanupOldRecords(service, windowStart);

    // Get current usage
    const currentUsage = this.getCurrentUsage(service, windowStart);
    
    // Check if we're at the limit
    if (currentUsage >= config.maxRequests) {
      logger.warn(`Rate limit exceeded for ${service}: ${currentUsage}/${config.maxRequests}`);
      return false;
    }

    // Record this request
    const records = this.usageRecords.get(service) || [];
    records.push({
      service,
      timestamp: now,
      requestCount: 1,
      windowStart,
      windowEnd: now + config.windowMs,
    });
    this.usageRecords.set(service, records);

    // Check if we should alert
    const newUsage = currentUsage + 1;
    const usagePercentage = (newUsage / config.maxRequests) * 100;
    
    if (usagePercentage >= config.alertThreshold) {
      await this.sendUsageAlert(service, newUsage, config.maxRequests, usagePercentage);
    }

    return true;
  }

  getCurrentUsage(service: string, windowStart?: number): number {
    const config = this.configs.get(service);
    if (!config) return 0;

    const start = windowStart || (Date.now() - config.windowMs);
    const records = this.usageRecords.get(service) || [];

    return records
      .filter(record => record.timestamp >= start)
      .reduce((sum, record) => sum + record.requestCount, 0);
  }

  getUsageStats(service: string): {
    current: number;
    limit: number;
    percentage: number;
    timeUntilReset: number;
  } | null {
    const config = this.configs.get(service);
    if (!config) return null;

    const now = Date.now();
    const windowStart = now - config.windowMs;
    const current = this.getCurrentUsage(service, windowStart);
    const percentage = (current / config.maxRequests) * 100;

    // Find the oldest request in the current window to calculate reset time
    const records = this.usageRecords.get(service) || [];
    const validRecords = records.filter(record => record.timestamp >= windowStart);
    const oldestRecord = validRecords.reduce((oldest, record) => 
      record.timestamp < oldest.timestamp ? record : oldest,
      validRecords[0]
    );

    const timeUntilReset = oldestRecord 
      ? Math.max(0, (oldestRecord.timestamp + config.windowMs) - now)
      : 0;

    return {
      current,
      limit: config.maxRequests,
      percentage,
      timeUntilReset,
    };
  }

  getAllUsageStats(): Record<string, ReturnType<RateLimitMonitor['getUsageStats']>> {
    const stats: Record<string, ReturnType<RateLimitMonitor['getUsageStats']>> = {};
    
    for (const [service] of this.configs) {
      stats[service] = this.getUsageStats(service);
    }

    return stats;
  }

  private cleanupOldRecords(service: string, windowStart: number): void {
    const records = this.usageRecords.get(service) || [];
    const validRecords = records.filter(record => record.timestamp >= windowStart);
    this.usageRecords.set(service, validRecords);
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

    const windowStart = Date.now() - config.windowMs;
    const currentUsage = this.getCurrentUsage(service, windowStart);
    
    return currentUsage < config.maxRequests;
  }

  getTimeUntilReset(service: string): number {
    const stats = this.getUsageStats(service);
    return stats ? stats.timeUntilReset : 0;
  }
}

// Singleton instance
export const rateLimitMonitor = new RateLimitMonitor();