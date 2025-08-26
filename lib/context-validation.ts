import { UserPreferences } from '@prisma/client'
import { ProfessionalContextProfile } from './professional-context'

/**
 * User Context Validation and Defaults System
 * Ensures professional context is valid and provides intelligent defaults
 */

// Validation rules for professional context fields
export interface ValidationRule {
  field: keyof ProfessionalContextProfile
  required: boolean
  minLength?: number
  maxLength?: number
  allowedValues?: string[]
  defaultValue?: string | string[]
}

export const VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'role',
    required: true,
    minLength: 2,
    maxLength: 100,
    defaultValue: 'Technology Professional'
  },
  {
    field: 'industry',
    required: true,
    minLength: 2,
    maxLength: 100,
    defaultValue: 'Technology'
  },
  {
    field: 'experienceLevel',
    required: true,
    allowedValues: ['Entry Level', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Principal', 'Executive'],
    defaultValue: 'Mid-Level'
  },
  {
    field: 'formalityLevel',
    required: true,
    allowedValues: ['casual', 'professional', 'executive'],
    defaultValue: 'professional'
  },
  {
    field: 'companySize',
    required: false,
    allowedValues: ['Startup (1-10)', 'Small (11-50)', 'Medium (51-200)', 'Large (201-1000)', 'Enterprise (1000+)'],
    defaultValue: 'Not specified'
  }
]

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: string[]
}

export interface ValidationError {
  field: keyof ProfessionalContextProfile
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  field: keyof ProfessionalContextProfile
  message: string
  suggestion: string
}

/**
 * Validate professional context profile
 */
export function validateProfessionalContext(
  context: ProfessionalContextProfile
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const suggestions: string[] = []

  // Validate each field against rules
  for (const rule of VALIDATION_RULES) {
    const value = context[rule.field]
    const fieldName = rule.field

    // Check required fields
    if (rule.required) {
      if (!value || (typeof value === 'string' && value.trim() === '') ||
          (Array.isArray(value) && value.length === 0)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} is required`,
          severity: 'error'
        })
        continue
      }
    }

    // Check string length constraints
    if (typeof value === 'string' && value.length > 0) {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be at least ${rule.minLength} characters`,
          severity: 'error'
        })
      }
      
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be no more than ${rule.maxLength} characters`,
          severity: 'error'
        })
      }
    }

    // Check allowed values
    if (rule.allowedValues && typeof value === 'string' && value.length > 0) {
      if (!rule.allowedValues.includes(value)) {
        errors.push({
          field: fieldName,
          message: `${fieldName} must be one of: ${rule.allowedValues.join(', ')}`,
          severity: 'error'
        })
      }
    }
  }

  // Generate contextual warnings and suggestions
  generateContextualFeedback(context, warnings, suggestions)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  }
}

/**
 * Apply default values to incomplete professional context
 */
export function applyDefaultValues(
  context: Partial<ProfessionalContextProfile>
): ProfessionalContextProfile {
  const defaultContext: ProfessionalContextProfile = {
    role: 'Technology Professional',
    industry: 'Technology',
    companySize: 'Not specified',
    experienceLevel: 'Mid-Level',
    currentChallenges: ['Staying current with technology trends', 'Making informed technical decisions'],
    decisionFocusAreas: ['Technology selection', 'Team processes'],
    curiosityAreas: ['Emerging technologies', 'Best practices'],
    formalityLevel: 'professional',
    techStack: [],
    interests: [],
  }

  // Apply provided values over defaults
  const result = { ...defaultContext, ...context }

  // Ensure arrays are properly initialized
  result.currentChallenges = result.currentChallenges || []
  result.decisionFocusAreas = result.decisionFocusAreas || []
  result.curiosityAreas = result.curiosityAreas || []
  result.techStack = result.techStack || []
  result.interests = result.interests || []

  return result
}

/**
 * Generate intelligent defaults based on role and industry
 */
export function generateIntelligentDefaults(
  role?: string,
  industry?: string
): Partial<ProfessionalContextProfile> {
  const defaults: Partial<ProfessionalContextProfile> = {}

  // Role-based defaults
  if (role) {
    const roleKeywords = role.toLowerCase()
    
    if (roleKeywords.includes('engineer') || roleKeywords.includes('developer')) {
      defaults.currentChallenges = [
        'Keeping up with rapidly evolving tech stack',
        'Balancing code quality with delivery speed',
        'Technical debt management'
      ]
      defaults.decisionFocusAreas = [
        'Technology stack selection',
        'Architecture decisions',
        'Development workflow optimization'
      ]
      defaults.curiosityAreas = [
        'New programming languages and frameworks',
        'Development tools and methodologies',
        'Software architecture patterns'
      ]
    } else if (roleKeywords.includes('manager') || roleKeywords.includes('lead')) {
      defaults.currentChallenges = [
        'Team scalability and productivity',
        'Technology strategy alignment',
        'Balancing technical and business priorities'
      ]
      defaults.decisionFocusAreas = [
        'Team processes and tools',
        'Technology roadmap planning',
        'Resource allocation'
      ]
      defaults.formalityLevel = 'professional'
    } else if (roleKeywords.includes('executive') || roleKeywords.includes('cto') || roleKeywords.includes('vp')) {
      defaults.formalityLevel = 'executive'
      defaults.currentChallenges = [
        'Digital transformation strategy',
        'Technology investment prioritization',
        'Competitive advantage through technology'
      ]
      defaults.decisionFocusAreas = [
        'Strategic technology planning',
        'Organizational capability building',
        'Technology risk management'
      ]
    }
  }

  // Industry-based defaults
  if (industry) {
    const industryKeywords = industry.toLowerCase()
    
    if (industryKeywords.includes('startup')) {
      defaults.companySize = 'Startup (1-10)'
      defaults.currentChallenges = [
        ...(defaults.currentChallenges || []),
        'Resource optimization',
        'Rapid scaling challenges'
      ]
    } else if (industryKeywords.includes('enterprise')) {
      defaults.companySize = 'Enterprise (1000+)'
      defaults.formalityLevel = 'executive'
    }
  }

  return defaults
}

/**
 * Generate contextual warnings and suggestions
 */
function generateContextualFeedback(
  context: ProfessionalContextProfile,
  warnings: ValidationWarning[],
  suggestions: string[]
): void {
  // Check profile completeness
  const emptyFields = Object.entries(context).filter(([key, value]) => {
    if (Array.isArray(value)) return value.length === 0
    return !value || value === 'Not specified'
  })

  if (emptyFields.length > 3) {
    suggestions.push(
      'Consider completing more profile fields for better personalized insights'
    )
  }

  // Check for inconsistencies
  if (context.experienceLevel === 'Entry Level' && context.formalityLevel === 'executive') {
    warnings.push({
      field: 'formalityLevel',
      message: 'Executive formality level with entry-level experience may be inconsistent',
      suggestion: 'Consider professional formality level for entry-level roles'
    })
  }

  // Suggest missing complementary fields
  if (context.currentChallenges.length === 0) {
    suggestions.push(
      'Add current professional challenges to get more targeted insights'
    )
  }

  if (context.curiosityAreas.length === 0) {
    suggestions.push(
      'Define your curiosity areas to explore emerging topics that interest you'
    )
  }

  if (context.techStack.length === 0) {
    suggestions.push(
      'List your technology stack for more relevant technical insights'
    )
  }
}

/**
 * Validate and normalize UserPreferences input
 */
export function validateUserPreferencesInput(
  input: Partial<UserPreferences>
): ValidationResult {
  const context: Partial<ProfessionalContextProfile> = {
    role: input.professionalRole || undefined,
    industry: input.industry || undefined,
    companySize: input.companySize || undefined,
    experienceLevel: input.experienceLevel || undefined,
    currentChallenges: input.currentChallenges || [],
    decisionFocusAreas: input.decisionFocusAreas || [],
    curiosityAreas: input.curiosityAreas || [],
    formalityLevel: (input.formalityLevel as 'casual' | 'professional' | 'executive') || 'professional',
    techStack: input.techStack || [],
    interests: input.interests || [],
  }

  const completeContext = applyDefaultValues(context)
  return validateProfessionalContext(completeContext)
}

/**
 * Get context quality score (0-100)
 */
export function getContextQualityScore(context: ProfessionalContextProfile): number {
  let score = 0
  const weights = {
    role: 15,
    industry: 15,
    experienceLevel: 10,
    currentChallenges: 20,
    decisionFocusAreas: 15,
    curiosityAreas: 10,
    techStack: 10,
    companySize: 5
  }

  Object.entries(weights).forEach(([field, weight]) => {
    const value = context[field as keyof ProfessionalContextProfile]
    if (Array.isArray(value)) {
      if (value.length > 0) score += weight
    } else if (value && value !== 'Not specified') {
      score += weight
    }
  })

  return Math.min(100, score)
}