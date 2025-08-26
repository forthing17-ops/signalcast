interface RateLimitOptions {
  interval: number // milliseconds
  uniqueTokenPerInterval?: number
}

interface TokenBucket {
  count: number
  lastRefill: number
}

class RateLimiter {
  private storage = new Map<string, TokenBucket>()
  private interval: number
  private uniqueTokenPerInterval: number

  constructor({ interval, uniqueTokenPerInterval = 500 }: RateLimitOptions) {
    this.interval = interval
    this.uniqueTokenPerInterval = uniqueTokenPerInterval
  }

  private refillTokens(bucket: TokenBucket): void {
    const now = Date.now()
    const timePassed = now - bucket.lastRefill
    const tokensToAdd = Math.floor(timePassed / this.interval)
    
    if (tokensToAdd > 0) {
      bucket.count = Math.min(this.uniqueTokenPerInterval, bucket.count + tokensToAdd)
      bucket.lastRefill = now
    }
  }

  public check(identifier: string): { success: boolean; remaining: number; resetTime: number } {
    // Clean up old entries
    if (this.storage.size > this.uniqueTokenPerInterval * 2) {
      const cutoff = Date.now() - this.interval * 2
      const entries = Array.from(this.storage.entries())
      for (const [key, bucket] of entries) {
        if (bucket.lastRefill < cutoff) {
          this.storage.delete(key)
        }
      }
    }

    let bucket = this.storage.get(identifier)
    if (!bucket) {
      bucket = {
        count: this.uniqueTokenPerInterval,
        lastRefill: Date.now()
      }
      this.storage.set(identifier, bucket)
    }

    this.refillTokens(bucket)

    if (bucket.count > 0) {
      bucket.count--
      return {
        success: true,
        remaining: bucket.count,
        resetTime: bucket.lastRefill + this.interval
      }
    }

    return {
      success: false,
      remaining: 0,
      resetTime: bucket.lastRefill + this.interval
    }
  }
}

// Rate limiters for different endpoints
export const authRateLimit = new RateLimiter({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 5, // 5 attempts per 15 minutes
})

export const apiRateLimit = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 60, // 60 requests per minute
})

export const profileRateLimit = new RateLimiter({
  interval: 5 * 60 * 1000, // 5 minutes
  uniqueTokenPerInterval: 10, // 10 updates per 5 minutes
})

export function getClientIP(request: Request): string {
  // Check for various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Fallback to a default if no IP is found
  return 'unknown'
}