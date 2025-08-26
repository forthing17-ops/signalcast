import { OpenAI } from 'openai'
import { env } from './env'

// Initialize OpenAI client only if API key is available
const openai = env.OPENAI_API_KEY ? new OpenAI({
  apiKey: env.OPENAI_API_KEY,
}) : null

export interface ProcessedInterests {
  interests: string[]
  confidence: number
  error?: string
}

/**
 * Process natural language description into structured interests using OpenAI
 */
export async function processNaturalLanguageInterests(
  description: string
): Promise<ProcessedInterests> {
  // Fallback if no OpenAI key or empty description
  if (!openai || !description.trim()) {
    return {
      interests: [],
      confidence: 0,
      error: openai ? 'No description provided' : 'OpenAI not configured'
    }
  }

  try {
    const prompt = `
You are an expert at extracting professional technology interests from natural language descriptions. 

Given this description of someone's professional interests and learning goals:
"${description.trim()}"

Extract specific technology interests, tools, frameworks, and topics they would want to follow. Return ONLY a JSON array of strings, with 3-10 specific interests. Each interest should be:
- Specific and actionable (not vague like "AI" but "Machine Learning for Healthcare")
- Professional/technology focused
- Something they could actually follow news/updates about

Example format: ["Next.js Development", "React Performance Optimization", "TypeScript Best Practices", "Serverless Architecture"]

Return only the JSON array, nothing else.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model for structured extraction
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts structured technology interests from natural language. Always respond with valid JSON arrays only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.3, // Lower temperature for more consistent extraction
      response_format: { type: "json_object" }
    })

    const responseText = completion.choices[0]?.message?.content?.trim()
    
    if (!responseText) {
      throw new Error('Empty response from OpenAI')
    }

    // Parse the JSON response
    let parsedResponse: unknown
    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      // If response format isn't JSON, try to extract array manually
      const arrayMatch = responseText.match(/\[(.*?)\]/) // Fixed regex flag for compatibility
      if (arrayMatch) {
        parsedResponse = JSON.parse(arrayMatch[0])
      } else {
        throw new Error(`Invalid JSON response: ${responseText}`)
      }
    }

    // Extract interests array from response
    let interests: string[]
    if (Array.isArray(parsedResponse)) {
      interests = parsedResponse
    } else if (
      parsedResponse && 
      typeof parsedResponse === 'object' && 
      'interests' in parsedResponse &&
      Array.isArray(parsedResponse.interests)
    ) {
      interests = parsedResponse.interests
    } else {
      throw new Error('Response is not in expected format')
    }

    // Validate and clean interests
    const validInterests = interests
      .filter((interest): interest is string => 
        typeof interest === 'string' && interest.trim().length > 0
      )
      .map(interest => interest.trim())
      .slice(0, 10) // Limit to 10 interests max

    if (validInterests.length === 0) {
      throw new Error('No valid interests extracted')
    }

    return {
      interests: validInterests,
      confidence: validInterests.length >= 3 ? 1 : 0.7, // High confidence if we got good results
      error: undefined
    }

  } catch (error) {
    console.error('Error processing interests with OpenAI:', error)
    
    // Return fallback extraction attempt
    const fallbackInterests = extractFallbackInterests(description)
    
    return {
      interests: fallbackInterests,
      confidence: 0.3, // Low confidence for fallback
      error: error instanceof Error ? error.message : 'Unknown error processing interests'
    }
  }
}

/**
 * Fallback interest extraction using simple keyword matching
 * Used when OpenAI is unavailable or fails
 */
function extractFallbackInterests(description: string): string[] {
  const techKeywords = [
    'react', 'typescript', 'javascript', 'python', 'node.js', 'next.js',
    'vue', 'angular', 'svelte', 'docker', 'kubernetes', 'aws', 'azure',
    'machine learning', 'artificial intelligence', 'ai', 'ml', 'data science',
    'web development', 'mobile development', 'backend', 'frontend', 'fullstack',
    'database', 'postgresql', 'mongodb', 'redis', 'graphql', 'rest api',
    'devops', 'ci/cd', 'testing', 'performance', 'security', 'blockchain',
    'web3', 'serverless', 'microservices', 'cloud computing'
  ]

  const lowercaseDescription = description.toLowerCase()
  const foundKeywords = techKeywords
    .filter(keyword => lowercaseDescription.includes(keyword.toLowerCase()))
    .map(keyword => {
      // Capitalize properly
      return keyword.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    })
    .slice(0, 5) // Limit fallback to 5 interests

  // If no keywords found, return generic interests based on common patterns
  if (foundKeywords.length === 0) {
    if (lowercaseDescription.includes('development') || lowercaseDescription.includes('coding')) {
      return ['Web Development', 'Software Engineering']
    }
    if (lowercaseDescription.includes('data') || lowercaseDescription.includes('analytics')) {
      return ['Data Analysis', 'Data Science']
    }
    return ['Technology Trends'] // Very generic fallback
  }

  return foundKeywords
}