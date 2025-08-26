interface ContentModerationResult {
  isAppropriate: boolean
  confidence: number
  flags: string[]
  reasons?: string[]
}

interface ContentToModerate {
  title: string
  summary: string
  sourceUrl?: string
}

/**
 * Content moderation service to filter inappropriate content from external sources
 * Implements basic rule-based filtering for MVP - can be enhanced with ML/API services later
 */
export class ContentModerationService {
  // Blocklist patterns for inappropriate content
  private readonly inappropriatePatterns = [
    // Explicit content
    /\b(porn|sex|adult|xxx|explicit)\b/i,
    // Violence and harmful content  
    /\b(violence|murder|death|kill|suicide|harm)\b/i,
    // Hate speech basics
    /\b(hate|racist|discrimination)\b/i,
    // Spam/scam patterns
    /\b(click here|free money|get rich|scam|phishing)\b/i,
    // Cryptocurrency scams (common on Reddit)
    /\b(pump and dump|ponzi|crypto scam)\b/i
  ]

  // Suspicious domains that often host inappropriate content
  private readonly suspiciousDomains = [
    'bit.ly', 'tinyurl.com', 't.co', // URL shorteners (potential spam)
    'clickbait.com', 'spam.com' // Example spam domains
  ]

  // Quality signals - content with these patterns gets higher confidence scores
  private readonly qualityPatterns = [
    /\b(tutorial|guide|documentation|open source|github)\b/i,
    /\b(research|analysis|study|development)\b/i,
    /\b(technology|programming|software|engineering)\b/i
  ]

  /**
   * Moderate content from external sources
   */
  async moderateContent(content: ContentToModerate): Promise<ContentModerationResult> {
    const flags: string[] = []
    const reasons: string[] = []
    let confidence = 0.7 // Base confidence

    const textToCheck = `${content.title} ${content.summary}`.toLowerCase()

    // Check for inappropriate patterns
    for (const pattern of this.inappropriatePatterns) {
      if (pattern.test(textToCheck)) {
        flags.push('inappropriate_content')
        reasons.push(`Contains potentially inappropriate content: ${pattern.source}`)
        confidence = 0.9
      }
    }

    // Check source URL for suspicious domains
    if (content.sourceUrl) {
      const url = new URL(content.sourceUrl)
      if (this.suspiciousDomains.some(domain => url.hostname.includes(domain))) {
        flags.push('suspicious_source')
        reasons.push(`Source from suspicious domain: ${url.hostname}`)
        confidence = Math.max(confidence, 0.8)
      }
    }

    // Check for quality signals (increases confidence in appropriate content)
    const qualityMatches = this.qualityPatterns.filter(pattern => pattern.test(textToCheck))
    if (qualityMatches.length > 0) {
      confidence = Math.max(confidence, 0.85)
    }

    // Additional heuristics
    if (content.title.length < 10 || content.summary.length < 20) {
      flags.push('low_quality')
      reasons.push('Content too short to be meaningful')
    }

    if (textToCheck.includes('click here') || textToCheck.includes('!!!!')) {
      flags.push('spam_indicators')
      reasons.push('Contains spam-like patterns')
    }

    // Determine if content is appropriate
    const inappropriateFlags = ['inappropriate_content', 'suspicious_source', 'spam_indicators']
    const hasInappropriateFlags = flags.some(flag => inappropriateFlags.includes(flag))
    
    const isAppropriate = !hasInappropriateFlags

    return {
      isAppropriate,
      confidence,
      flags,
      reasons: reasons.length > 0 ? reasons : undefined
    }
  }

  /**
   * Batch moderate multiple content items
   */
  async moderateContentBatch(contentItems: ContentToModerate[]): Promise<ContentModerationResult[]> {
    return Promise.all(contentItems.map(item => this.moderateContent(item)))
  }

  /**
   * Get moderation statistics for monitoring
   */
  getModerationStats(results: ContentModerationResult[]) {
    const total = results.length
    const blocked = results.filter(r => !r.isAppropriate).length
    const flaggedByType = results.reduce((acc, result) => {
      result.flags.forEach(flag => {
        acc[flag] = (acc[flag] || 0) + 1
      })
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      blocked,
      approved: total - blocked,
      blockRate: total > 0 ? blocked / total : 0,
      flaggedByType
    }
  }
}

// Export singleton instance
export const contentModerationService = new ContentModerationService()