import { UserPreferences } from '@prisma/client'
import { SynthesisContext } from './openai'
import { validateAndSanitizeInput, validateAndSanitizeArray } from './input-validation'
import { logger } from './logger'

/**
 * Professional Context Extraction for Personalized Insights
 * Converts user preferences data into structured context for AI synthesis
 */

export interface ProfessionalContextProfile {
  role: string
  industry: string
  companySize: string
  experienceLevel: string
  currentChallenges: string[]
  decisionFocusAreas: string[]
  curiosityAreas: string[]
  formalityLevel: 'casual' | 'professional' | 'executive'
  techStack: string[]
  interests: string[]
}

/**
 * Extract professional context from user preferences
 */
export function extractProfessionalContext(
  userPreferences: UserPreferences | null
): ProfessionalContextProfile {
  if (!userPreferences) {
    return getDefaultProfessionalContext()
  }

  // Validate and sanitize all input fields to prevent security issues
  const roleValidation = validateAndSanitizeInput(userPreferences.professionalRole, 'role')
  const industryValidation = validateAndSanitizeInput(userPreferences.industry, 'industry')
  const companySizeValidation = validateAndSanitizeInput(userPreferences.companySize, 'generic')
  const experienceLevelValidation = validateAndSanitizeInput(userPreferences.experienceLevel, 'generic')
  
  const challengesValidation = validateAndSanitizeArray(userPreferences.currentChallenges, 'challenge', 10)
  const focusAreasValidation = validateAndSanitizeArray(userPreferences.decisionFocusAreas, 'generic', 10)
  const curiosityValidation = validateAndSanitizeArray(userPreferences.curiosityAreas, 'generic', 10)
  const techStackValidation = validateAndSanitizeArray(userPreferences.techStack, 'techStack', 15)
  const interestsValidation = validateAndSanitizeArray(userPreferences.interests, 'generic', 15)

  // Log any validation issues
  const allErrors = [
    ...roleValidation.errors.map(e => `Role: ${e}`),
    ...industryValidation.errors.map(e => `Industry: ${e}`),
    ...companySizeValidation.errors.map(e => `Company Size: ${e}`),
    ...experienceLevelValidation.errors.map(e => `Experience: ${e}`),
    ...challengesValidation.errors,
    ...focusAreasValidation.errors,
    ...curiosityValidation.errors,
    ...techStackValidation.errors,
    ...interestsValidation.errors
  ]

  if (allErrors.length > 0) {
    logger.warn('Professional context validation errors during extraction', {
      userId: userPreferences.userId,
      errors: allErrors
    })
  }

  // Validate formality level enum
  const allowedFormalityLevels = ['casual', 'professional', 'executive']
  const formalityLevel = allowedFormalityLevels.includes(userPreferences.formalityLevel as string) 
    ? (userPreferences.formalityLevel as 'casual' | 'professional' | 'executive')
    : 'professional'

  return {
    role: roleValidation.sanitizedValue || 'Professional',
    industry: industryValidation.sanitizedValue || 'Technology',
    companySize: companySizeValidation.sanitizedValue || 'Not specified',
    experienceLevel: experienceLevelValidation.sanitizedValue || 'Intermediate',
    currentChallenges: challengesValidation.sanitizedArray,
    decisionFocusAreas: focusAreasValidation.sanitizedArray,
    curiosityAreas: curiosityValidation.sanitizedArray,
    formalityLevel,
    techStack: techStackValidation.sanitizedArray,
    interests: interestsValidation.sanitizedArray,
  }
}

/**
 * Convert professional context to synthesis context for OpenAI
 */
export function buildSynthesisContext(
  professionalContext: ProfessionalContextProfile
): SynthesisContext {
  return {
    professionalRole: professionalContext.role,
    industry: professionalContext.industry,
    companySize: professionalContext.companySize,
    experienceLevel: professionalContext.experienceLevel,
    currentChallenges: professionalContext.currentChallenges,
    decisionFocusAreas: professionalContext.decisionFocusAreas,
    curiosityAreas: professionalContext.curiosityAreas,
    formalityLevel: professionalContext.formalityLevel,
    toolStack: professionalContext.techStack,
    userInterests: professionalContext.interests,
  }
}

/**
 * Get default professional context for users without preferences
 */
export function getDefaultProfessionalContext(): ProfessionalContextProfile {
  return {
    role: 'Technology Professional',
    industry: 'Technology',
    companySize: 'Not specified',
    experienceLevel: 'Intermediate',
    currentChallenges: ['Staying updated with technology trends', 'Making informed technology decisions'],
    decisionFocusAreas: ['Technology selection', 'Process improvement'],
    curiosityAreas: ['Emerging technologies', 'Industry best practices'],
    formalityLevel: 'professional',
    techStack: [],
    interests: [],
  }
}

/**
 * Validate professional context completeness
 */
export function validateProfessionalContext(
  context: ProfessionalContextProfile
): { isValid: boolean; missingFields: string[] } {
  const requiredFields = ['role', 'industry', 'experienceLevel', 'formalityLevel']
  const missingFields = requiredFields.filter(field => 
    !context[field as keyof ProfessionalContextProfile] || 
    context[field as keyof ProfessionalContextProfile] === ''
  )

  return {
    isValid: missingFields.length === 0,
    missingFields
  }
}

/**
 * Calculate context completeness score (0-1)
 */
export function getContextCompletenessScore(
  context: ProfessionalContextProfile
): number {
  const fields = [
    'role', 'industry', 'companySize', 'experienceLevel',
    'currentChallenges', 'decisionFocusAreas', 'curiosityAreas',
    'techStack', 'interests'
  ]
  
  let completedFields = 0
  
  fields.forEach(field => {
    const value = context[field as keyof ProfessionalContextProfile]
    if (Array.isArray(value)) {
      if (value.length > 0) completedFields++
    } else if (value && value !== 'Not specified') {
      completedFields++
    }
  })
  
  return completedFields / fields.length
}

/**
 * Get contextual recommendations for improving profile
 */
export function getProfileImprovementSuggestions(
  context: ProfessionalContextProfile
): string[] {
  const suggestions: string[] = []
  
  if (!context.currentChallenges.length) {
    suggestions.push('Add your current professional challenges for more targeted insights')
  }
  
  if (!context.decisionFocusAreas.length) {
    suggestions.push('Specify your decision focus areas to get relevant strategic insights')
  }
  
  if (!context.curiosityAreas.length) {
    suggestions.push('Define curiosity areas to explore emerging trends that interest you')
  }
  
  if (!context.techStack.length) {
    suggestions.push('List your technology stack for more relevant technical insights')
  }
  
  if (context.companySize === 'Not specified') {
    suggestions.push('Specify your company size for context-appropriate recommendations')
  }
  
  return suggestions
}

/**
 * Generate context summary for debugging and logging
 */
export function getContextSummary(context: ProfessionalContextProfile): string {
  const completenessScore = Math.round(getContextCompletenessScore(context) * 100)
  
  return `${context.role} in ${context.industry} (${context.experienceLevel}, ${completenessScore}% complete profile)`
}