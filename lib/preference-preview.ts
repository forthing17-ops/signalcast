interface PreferenceData {
  interests?: string[]
  tech_stack?: string[]
  content_depth?: 'brief' | 'detailed'
  enabled_sources?: string[]
  delivery_frequency?: string
  content_formats?: string[]
  professional_role?: string
  industry?: string
}

interface ContentItem {
  title: string
  source: string
  summary: string
  relevance_score: number
  tags: string[]
  content_type?: string
}

export function calculateContentRelevance(
  content: ContentItem,
  preferences: PreferenceData
): number {
  let relevance = 0

  // Base relevance
  relevance += content.relevance_score || 50

  // Interest matching
  if (preferences.interests) {
    const interestMatches = content.tags.filter(tag =>
      preferences.interests!.some(interest =>
        tag.toLowerCase().includes(interest.toLowerCase()) ||
        interest.toLowerCase().includes(tag.toLowerCase())
      )
    ).length

    relevance += interestMatches * 15
  }

  // Tech stack matching
  if (preferences.tech_stack) {
    const techMatches = content.tags.filter(tag =>
      preferences.tech_stack!.some(tech =>
        tag.toLowerCase().includes(tech.toLowerCase()) ||
        tech.toLowerCase().includes(tag.toLowerCase())
      )
    ).length

    relevance += techMatches * 12
  }

  // Professional role matching
  if (preferences.professional_role) {
    const roleMatches = content.tags.filter(tag =>
      tag.toLowerCase().includes(preferences.professional_role!.toLowerCase())
    ).length

    relevance += roleMatches * 10
  }

  // Industry matching
  if (preferences.industry) {
    const industryMatches = content.tags.filter(tag =>
      tag.toLowerCase().includes(preferences.industry!.toLowerCase())
    ).length

    relevance += industryMatches * 8
  }

  // Content format preference
  if (preferences.content_formats && content.content_type) {
    if (preferences.content_formats.includes(content.content_type)) {
      relevance += 5
    }
  }

  // Cap relevance at 100
  return Math.min(relevance, 100)
}

export function filterContentByPreferences(
  contentItems: ContentItem[],
  preferences: PreferenceData
): ContentItem[] {
  return contentItems
    .map(item => ({
      ...item,
      relevance_score: calculateContentRelevance(item, preferences),
    }))
    .filter(item => item.relevance_score >= 30) // Minimum relevance threshold
    .sort((a, b) => b.relevance_score - a.relevance_score)
}

export function formatContentForDelivery(
  content: ContentItem,
  contentDepth: 'brief' | 'detailed'
): ContentItem {
  if (contentDepth === 'brief' && content.summary.length > 150) {
    return {
      ...content,
      summary: content.summary.substring(0, 147) + '...',
    }
  }

  return content
}

export function generatePreferenceInsights(preferences: PreferenceData): {
  strengths: string[]
  gaps: string[]
  recommendations: string[]
} {
  const insights = {
    strengths: [] as string[],
    gaps: [] as string[],
    recommendations: [] as string[],
  }

  // Analyze interests
  if (preferences.interests && preferences.interests.length > 0) {
    insights.strengths.push(`${preferences.interests.length} defined interests for targeted content`)
  } else {
    insights.gaps.push('No interests specified')
    insights.recommendations.push('Add interests to receive more relevant content')
  }

  // Analyze tech stack
  if (preferences.tech_stack && preferences.tech_stack.length > 0) {
    insights.strengths.push(`Tech stack defined with ${preferences.tech_stack.length} technologies`)
  } else {
    insights.gaps.push('No tech stack specified')
    insights.recommendations.push('Add your technology stack for developer-focused content')
  }

  // Analyze professional context
  if (preferences.professional_role && preferences.industry) {
    insights.strengths.push('Professional context fully defined')
  } else {
    if (!preferences.professional_role) {
      insights.gaps.push('Professional role not specified')
    }
    if (!preferences.industry) {
      insights.gaps.push('Industry not specified')
    }
    insights.recommendations.push('Complete your professional profile for industry-specific content')
  }

  // Analyze content settings
  if (preferences.content_depth) {
    insights.strengths.push(`Content depth preference set to ${preferences.content_depth}`)
  }

  if (preferences.enabled_sources && preferences.enabled_sources.length > 0) {
    insights.strengths.push(`${preferences.enabled_sources.length} content sources enabled`)
  } else {
    insights.gaps.push('No content sources enabled')
    insights.recommendations.push('Enable content sources to receive regular updates')
  }

  return insights
}

export function simulateContentDelivery(
  preferences: PreferenceData,
  mockContentPool: ContentItem[]
): {
  delivered_items: ContentItem[]
  total_available: number
  filtering_stats: {
    relevance_filtered: number
    preference_matched: number
    final_delivered: number
  }
} {
  const relevanceFiltered = mockContentPool.filter(item => item.relevance_score >= 30)
  const preferenceMatched = filterContentByPreferences(relevanceFiltered, preferences)
  
  // Determine delivery count based on frequency and depth
  let deliveryCount = 10 // default
  if (preferences.delivery_frequency === 'daily' && preferences.content_depth === 'brief') {
    deliveryCount = 8
  } else if (preferences.delivery_frequency === 'daily' && preferences.content_depth === 'detailed') {
    deliveryCount = 15
  } else if (preferences.delivery_frequency === 'weekly') {
    deliveryCount = 25
  }

  const finalDelivered = preferenceMatched
    .slice(0, deliveryCount)
    .map(item => formatContentForDelivery(item, preferences.content_depth || 'brief'))

  return {
    delivered_items: finalDelivered,
    total_available: mockContentPool.length,
    filtering_stats: {
      relevance_filtered: relevanceFiltered.length,
      preference_matched: preferenceMatched.length,
      final_delivered: finalDelivered.length,
    },
  }
}