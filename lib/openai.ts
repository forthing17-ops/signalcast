import OpenAI from 'openai'
import { env } from './env'
import { logger } from './logger'
import { validateProfessionalContextForPrompts, validateContentForSynthesis, createSafeContextSummary } from './input-validation'

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
})

// Rate limiting configuration for OpenAI API
const OPENAI_RATE_LIMIT = {
  requestsPerMinute: 500, // Conservative limit for GPT models
  requestsPerDay: 10000,
  maxRetries: 3,
  retryDelay: 1000, // ms
}

let requestCount = 0
let dailyRequestCount = 0
let lastResetTime = Date.now()

// Rate limiting helper
function checkRateLimit(): boolean {
  const now = Date.now()
  const minutesPassed = (now - lastResetTime) / 60000

  if (minutesPassed >= 1) {
    requestCount = 0
    lastResetTime = now
  }

  if (minutesPassed >= 1440) { // 24 hours
    dailyRequestCount = 0
  }

  return requestCount < OPENAI_RATE_LIMIT.requestsPerMinute && 
         dailyRequestCount < OPENAI_RATE_LIMIT.requestsPerDay
}

// Content synthesis prompt engineering
export interface SynthesisContext {
  userBackground?: string
  userInterests?: string[]
  toolStack?: string[]
  experienceLevel?: string
  industry?: string
  contentSources?: string[]
  // Professional context for personalized insights
  professionalRole?: string
  currentChallenges?: string[]
  curiosityAreas?: string[]
  formalityLevel?: 'casual' | 'professional' | 'executive'
  decisionFocusAreas?: string[]
  companySize?: string
}

export function buildSynthesisPrompt(
  rawContent: string[],
  context: SynthesisContext
): string {
  // Validate and sanitize professional context to prevent prompt injection
  const validationResult = validateProfessionalContextForPrompts(context)
  
  if (!validationResult.isValid) {
    logger.warn('Professional context validation failed', {
      errors: validationResult.errors,
      contextSummary: createSafeContextSummary(context)
    })
  }

  if (validationResult.warnings.length > 0) {
    logger.info('Professional context warnings', {
      warnings: validationResult.warnings,
      contextSummary: createSafeContextSummary(context)
    })
  }

  const safeContext = validationResult.sanitizedContext
  const hasContext = safeContext.role || safeContext.userInterests?.length || safeContext.professionalRole
  
  const contextSection = hasContext ? `
PROFESSIONAL PERSONALIZATION CONTEXT:
- Role: ${safeContext.professionalRole || safeContext.userBackground || 'Not specified'}
- Industry: ${safeContext.industry || 'Not specified'}
- Company Size: ${safeContext.companySize || 'Not specified'}
- Experience Level: ${safeContext.experienceLevel || 'Not specified'}
- Current Challenges: ${safeContext.currentChallenges?.join(', ') || 'Not specified'}
- Decision Focus Areas: ${safeContext.decisionFocusAreas?.join(', ') || 'Not specified'}
- Curiosity Areas: ${safeContext.curiosityAreas?.join(', ') || 'Not specified'}
- Key Interests: ${safeContext.userInterests?.join(', ') || 'Not specified'}
- Technology Stack: ${safeContext.toolStack?.join(', ') || 'Not specified'}
- Communication Style: ${safeContext.formalityLevel || 'professional'}
` : ''

  const formalityInstructions = getFormalityInstructions(safeContext.formalityLevel)

  return `You are an expert professional intelligence analyst specializing in personalized business insights. Your task is to synthesize multiple pieces of raw content into coherent, actionable insights specifically tailored for this professional's context and challenges.

${contextSection}

SYNTHESIS INSTRUCTIONS:
1. Synthesize content into 2-3 connected insights that directly address the user's professional challenges and curiosity areas
2. Focus on actionable intelligence that supports their decision-making in their specific role and industry
3. Highlight key decisions, trends, and opportunities relevant to their professional context
4. Extract specific action items and next steps appropriate for their role
5. Connect insights to their technology stack and areas of responsibility
6. Assess professional impact and relevance for their decision focus areas
7. Use ${formalityInstructions} language and tone
8. Include confidence indicators for recommendations
9. Preserve source attribution for credibility

RAW CONTENT TO SYNTHESIZE:
${rawContent.map((content, index) => `--- Source ${index + 1} ---\n${content}`).join('\n\n')}

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "insights": [
    {
      "title": "Professional insight title",
      "summary": "2-3 sentence executive summary",
      "details": "Detailed analysis with professional implications and context",
      "sources": ["Source 1", "Source 2"],
      "relevanceScore": 0.8,
      "tags": ["tag1", "tag2"],
      "actionItems": ["Specific actionable step 1", "Next step 2"],
      "professionalImpact": {
        "decisionSupport": "How this helps with key decisions",
        "businessValue": "Potential business impact",
        "implementationComplexity": "low|medium|high"
      },
      "confidenceLevel": 0.9,
      "crossDomainConnections": ["related area 1", "related area 2"]
    }
  ],
  "overallThemes": ["theme1", "theme2"],
  "confidenceScore": 0.85,
  "professionalRecommendations": ["Strategic recommendation 1", "Tactical recommendation 2"]
}`
}

function getFormalityInstructions(formalityLevel?: string): string {
  switch (formalityLevel) {
    case 'casual':
      return 'conversational, approachable'
    case 'executive': 
      return 'formal, strategic, executive-level'
    case 'professional':
    default:
      return 'professional, clear, business-appropriate'
  }
}

// Enhanced synthesis result type for professional insights
export interface ProfessionalSynthesisResult {
  insights: Array<{
    title: string
    summary: string
    details: string
    sources: string[]
    relevanceScore: number
    tags: string[]
    actionItems: string[]
    professionalImpact: {
      decisionSupport: string
      businessValue: string
      implementationComplexity: 'low' | 'medium' | 'high'
    }
    confidenceLevel: number
    crossDomainConnections: string[]
  }>
  overallThemes: string[]
  confidenceScore: number
  professionalRecommendations: string[]
}

// Main synthesis function with latest OpenAI API conventions
export async function synthesizeContent(
  rawContent: string[],
  context: SynthesisContext = {}
): Promise<ProfessionalSynthesisResult | null> {
  try {
    // Check rate limits
    if (!checkRateLimit()) {
      logger.warn('OpenAI rate limit exceeded, skipping synthesis')
      return null
    }

    // Validate and sanitize raw content to prevent prompt injection
    const sanitizedContent: string[] = []
    const contentWarnings: string[] = []
    
    for (let i = 0; i < rawContent.length; i++) {
      const validation = validateContentForSynthesis(rawContent[i])
      
      if (!validation.isValid) {
        logger.warn(`Content piece ${i + 1} failed validation`, {
          errors: validation.errors,
          contentLength: rawContent[i].length
        })
        // Skip invalid content entirely
        continue
      }
      
      sanitizedContent.push(validation.sanitizedValue)
      if (validation.warnings.length > 0) {
        contentWarnings.push(`Content ${i + 1}: ${validation.warnings.join(', ')}`)
      }
    }

    if (sanitizedContent.length === 0) {
      logger.error('All content pieces failed validation, cannot proceed with synthesis')
      return null
    }

    if (contentWarnings.length > 0) {
      logger.info('Content validation warnings', { warnings: contentWarnings })
    }

    // Increment request counters
    requestCount++
    dailyRequestCount++

    const prompt = buildSynthesisPrompt(sanitizedContent, context)
    
    logger.info('Starting AI content synthesis', {
      originalContentPieces: rawContent.length,
      sanitizedContentPieces: sanitizedContent.length,
      hasUserContext: Boolean(context.userBackground || context.userInterests?.length),
      contextSummary: createSafeContextSummary(context)
    })

    // Use GPT-4 with latest API conventions
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini', // Most cost-effective model for content synthesis
      messages: [
        {
          role: 'system',
          content: 'You are an expert professional intelligence analyst specializing in technology and business insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent, factual synthesis
      response_format: { type: 'json_object' }
    })

    const result = completion.choices[0]?.message?.content
    if (!result) {
      logger.warn('Empty response from OpenAI API')
      return null
    }

    // Parse and validate the JSON response
    const synthesisResult = JSON.parse(result)
    
    logger.info('AI synthesis completed successfully', {
      insightsGenerated: synthesisResult.insights?.length || 0,
      confidenceScore: synthesisResult.confidenceScore
    })

    return synthesisResult

  } catch (error) {
    logger.error('Error in AI content synthesis', error as Error)
    
    // Return null on error - calling code should handle gracefully
    return null
  }
}

// Validation function for enhanced synthesis results
export function validateSynthesisResult(result: unknown): boolean {
  try {
    if (!result || result === null) {
      return false
    }
    
    const typedResult = result as { 
      insights?: unknown; 
      overallThemes?: unknown; 
      confidenceScore?: unknown;
      professionalRecommendations?: unknown;
    }
    
    return (
      Array.isArray(typedResult.insights) &&
      typedResult.insights.length > 0 &&
      Array.isArray(typedResult.overallThemes) &&
      Array.isArray(typedResult.professionalRecommendations) &&
      typeof typedResult.confidenceScore === 'number' &&
      typedResult.confidenceScore >= 0 &&
      typedResult.confidenceScore <= 1
    )
  } catch {
    return false
  }
}

// Export rate limiting info for monitoring
export function getRateLimitStatus() {
  return {
    currentMinuteRequests: requestCount,
    currentDayRequests: dailyRequestCount,
    limitsPerMinute: OPENAI_RATE_LIMIT.requestsPerMinute,
    limitsPerDay: OPENAI_RATE_LIMIT.requestsPerDay,
    rateLimitOk: checkRateLimit()
  }
}