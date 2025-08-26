/**
 * Input Validation and Sanitization for Professional Context
 * Prevents prompt injection and ensures data security
 */

export interface ValidationResult {
  isValid: boolean
  sanitizedValue: string
  errors: string[]
  warnings: string[]
}

export interface ValidationOptions {
  maxLength?: number
  allowedChars?: RegExp
  blockedPatterns?: RegExp[]
  stripHtml?: boolean
  normalizeWhitespace?: boolean
}

// Default validation options for different field types
const DEFAULT_OPTIONS: Record<string, ValidationOptions> = {
  role: {
    maxLength: 100,
    allowedChars: /^[a-zA-Z0-9\s\-./()&]+$/,
    stripHtml: true,
    normalizeWhitespace: true,
    blockedPatterns: [
      /\bscript\b/i,
      /\balert\b/i,
      /\bprompt\b/i,
      /\bconfirm\b/i,
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /on\w+=/i,
      /<[^>]*>/g,
      /[{}]/g, // Block template literals
      /\$\{[^}]*\}/g, // Block template interpolations
    ]
  },
  industry: {
    maxLength: 100,
    allowedChars: /^[a-zA-Z0-9\s\-./()&]+$/,
    stripHtml: true,
    normalizeWhitespace: true,
    blockedPatterns: [
      /\bscript\b/i,
      /\balert\b/i,
      /javascript:/i,
      /<[^>]*>/g,
      /[{}]/g,
    ]
  },
  challenge: {
    maxLength: 200,
    allowedChars: /^[a-zA-Z0-9\s\-.,;:!?'"/()&]+$/,
    stripHtml: true,
    normalizeWhitespace: true,
    blockedPatterns: [
      /\bscript\b/i,
      /\balert\b/i,
      /\bprompt\b/i,
      /javascript:/i,
      /data:/i,
      /<[^>]*>/g,
      /\$\{[^}]*\}/g,
      /\\\\/g, // Block excessive escaping
      /[{}]/g,
    ]
  },
  techStack: {
    maxLength: 50,
    allowedChars: /^[a-zA-Z0-9\s\-./#+]+$/,
    stripHtml: true,
    normalizeWhitespace: true,
    blockedPatterns: [
      /\bscript\b/i,
      /javascript:/i,
      /<[^>]*>/g,
      /[{}]/g,
    ]
  },
  generic: {
    maxLength: 500,
    allowedChars: /^[a-zA-Z0-9\s\-.,;:!?'"/()&]+$/,
    stripHtml: true,
    normalizeWhitespace: true,
    blockedPatterns: [
      /\bscript\b/i,
      /\balert\b/i,
      /\bprompt\b/i,
      /\bconfirm\b/i,
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /on\w+=/i,
      /<[^>]*>/g,
      /\$\{[^}]*\}/g,
      /[{}]/g,
      /\\\\/g,
    ]
  }
}

/**
 * Comprehensive input validation and sanitization
 */
export function validateAndSanitizeInput(
  input: string | null | undefined,
  fieldType: keyof typeof DEFAULT_OPTIONS = 'generic',
  customOptions?: Partial<ValidationOptions>
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Handle null/undefined
  if (!input) {
    return {
      isValid: true,
      sanitizedValue: '',
      errors: [],
      warnings: ['Empty input provided']
    }
  }

  // Convert to string and get options
  let value = String(input)
  const options = { ...DEFAULT_OPTIONS[fieldType], ...customOptions }

  // Strip HTML if requested
  if (options.stripHtml) {
    const originalLength = value.length
    value = stripHtmlTags(value)
    if (value.length !== originalLength) {
      warnings.push('HTML tags removed from input')
    }
  }

  // Normalize whitespace
  if (options.normalizeWhitespace) {
    const originalValue = value
    value = value.trim().replace(/\s+/g, ' ')
    if (value !== originalValue) {
      warnings.push('Whitespace normalized')
    }
  }

  // Length validation
  if (options.maxLength && value.length > options.maxLength) {
    errors.push(`Input exceeds maximum length of ${options.maxLength} characters`)
    value = value.substring(0, options.maxLength)
    warnings.push(`Input truncated to ${options.maxLength} characters`)
  }

  // Character validation
  if (options.allowedChars && !options.allowedChars.test(value)) {
    errors.push('Input contains disallowed characters')
    // Remove disallowed characters
    const sanitizedValue = value.replace(new RegExp(`[^${options.allowedChars.source.slice(2, -2)}]`, 'g'), '')
    if (sanitizedValue !== value) {
      value = sanitizedValue
      warnings.push('Disallowed characters removed')
    }
  }

  // Blocked pattern validation
  if (options.blockedPatterns) {
    let foundBlockedPatterns = false
    for (const pattern of options.blockedPatterns) {
      if (pattern.test(value)) {
        foundBlockedPatterns = true
        errors.push('Input contains potentially dangerous patterns')
        value = value.replace(pattern, '')
        warnings.push('Blocked patterns removed')
      }
    }
  }

  // Additional security checks
  const securityIssues = detectSecurityIssues(value)
  if (securityIssues.length > 0) {
    errors.push(...securityIssues)
  }

  return {
    isValid: errors.length === 0,
    sanitizedValue: value,
    errors,
    warnings
  }
}

/**
 * Validate an array of strings (for challenges, tech stack, etc.)
 */
export function validateAndSanitizeArray(
  input: string[] | null | undefined,
  fieldType: keyof typeof DEFAULT_OPTIONS = 'generic',
  maxItems: number = 20
): { isValid: boolean; sanitizedArray: string[]; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const sanitizedArray: string[] = []

  if (!input || !Array.isArray(input)) {
    return {
      isValid: true,
      sanitizedArray: [],
      errors: [],
      warnings: ['Empty or invalid array provided']
    }
  }

  if (input.length > maxItems) {
    errors.push(`Array exceeds maximum items of ${maxItems}`)
    input = input.slice(0, maxItems)
    warnings.push(`Array truncated to ${maxItems} items`)
  }

  for (let i = 0; i < input.length; i++) {
    const result = validateAndSanitizeInput(input[i], fieldType)
    
    if (result.sanitizedValue.trim()) {
      sanitizedArray.push(result.sanitizedValue)
    }
    
    if (result.errors.length > 0) {
      errors.push(`Item ${i + 1}: ${result.errors.join(', ')}`)
    }
    
    if (result.warnings.length > 0) {
      warnings.push(`Item ${i + 1}: ${result.warnings.join(', ')}`)
    }
  }

  return {
    isValid: errors.length === 0,
    sanitizedArray,
    errors,
    warnings
  }
}

/**
 * Validate professional context object comprehensively
 */
export function validateProfessionalContextForPrompts(context: any): {
  isValid: boolean
  sanitizedContext: any
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const sanitizedContext: any = {}

  // Validate individual fields
  const roleResult = validateAndSanitizeInput(context.role, 'role')
  sanitizedContext.role = roleResult.sanitizedValue
  errors.push(...roleResult.errors.map(e => `Role: ${e}`))
  warnings.push(...roleResult.warnings.map(w => `Role: ${w}`))

  const industryResult = validateAndSanitizeInput(context.industry, 'industry')
  sanitizedContext.industry = industryResult.sanitizedValue
  errors.push(...industryResult.errors.map(e => `Industry: ${e}`))
  warnings.push(...industryResult.warnings.map(w => `Industry: ${w}`))

  const companySizeResult = validateAndSanitizeInput(context.companySize, 'generic')
  sanitizedContext.companySize = companySizeResult.sanitizedValue
  errors.push(...companySizeResult.errors.map(e => `Company Size: ${e}`))
  warnings.push(...companySizeResult.warnings.map(w => `Company Size: ${w}`))

  const experienceLevelResult = validateAndSanitizeInput(context.experienceLevel, 'generic')
  sanitizedContext.experienceLevel = experienceLevelResult.sanitizedValue
  errors.push(...experienceLevelResult.errors.map(e => `Experience Level: ${e}`))
  warnings.push(...experienceLevelResult.warnings.map(w => `Experience Level: ${w}`))

  // Validate arrays
  const challengesResult = validateAndSanitizeArray(context.currentChallenges, 'challenge', 10)
  sanitizedContext.currentChallenges = challengesResult.sanitizedArray
  errors.push(...challengesResult.errors.map(e => `Challenges: ${e}`))
  warnings.push(...challengesResult.warnings.map(w => `Challenges: ${w}`))

  const focusAreasResult = validateAndSanitizeArray(context.decisionFocusAreas, 'generic', 10)
  sanitizedContext.decisionFocusAreas = focusAreasResult.sanitizedArray
  errors.push(...focusAreasResult.errors.map(e => `Decision Focus: ${e}`))
  warnings.push(...focusAreasResult.warnings.map(w => `Decision Focus: ${w}`))

  const curiosityResult = validateAndSanitizeArray(context.curiosityAreas, 'generic', 10)
  sanitizedContext.curiosityAreas = curiosityResult.sanitizedArray
  errors.push(...curiosityResult.errors.map(e => `Curiosity Areas: ${e}`))
  warnings.push(...curiosityResult.warnings.map(w => `Curiosity Areas: ${w}`))

  const techStackResult = validateAndSanitizeArray(context.techStack, 'techStack', 15)
  sanitizedContext.techStack = techStackResult.sanitizedArray
  errors.push(...techStackResult.errors.map(e => `Tech Stack: ${e}`))
  warnings.push(...techStackResult.warnings.map(w => `Tech Stack: ${w}`))

  const interestsResult = validateAndSanitizeArray(context.interests, 'generic', 15)
  sanitizedContext.interests = interestsResult.sanitizedArray
  errors.push(...interestsResult.errors.map(e => `Interests: ${e}`))
  warnings.push(...interestsResult.warnings.map(w => `Interests: ${w}`))

  // Validate formality level (enum)
  const allowedFormalityLevels = ['casual', 'professional', 'executive']
  if (context.formalityLevel && !allowedFormalityLevels.includes(context.formalityLevel)) {
    errors.push('Invalid formality level')
    sanitizedContext.formalityLevel = 'professional' // Default fallback
    warnings.push('Formality level reset to professional')
  } else {
    sanitizedContext.formalityLevel = context.formalityLevel || 'professional'
  }

  return {
    isValid: errors.length === 0,
    sanitizedContext,
    errors,
    warnings
  }
}

/**
 * Strip HTML tags from input
 */
function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}

/**
 * Detect common security issues
 */
function detectSecurityIssues(input: string): string[] {
  const issues: string[] = []

  // Detect potential XSS
  if (/<script[^>]*>.*?<\/script>/i.test(input)) {
    issues.push('Script tags detected')
  }

  // Detect potential SQL injection patterns
  if (/('|(\\-\\-)|(;)|(\|)|(\*)|(%))/.test(input)) {
    issues.push('Potential SQL injection patterns detected')
  }

  // Detect template injection patterns
  if (/(\{\{|\}\})|(\$\{[^}]*\})/.test(input)) {
    issues.push('Template injection patterns detected')
  }

  // Detect excessive special characters (potential encoding attacks)
  const specialCharCount = (input.match(/[^\w\s\-.,;:!?'"\/()&]/g) || []).length
  if (specialCharCount > input.length * 0.3) {
    issues.push('Excessive special characters detected')
  }

  // Detect extremely long words (potential buffer overflow attempts)
  const words = input.split(/\s+/)
  if (words.some(word => word.length > 100)) {
    issues.push('Extremely long words detected')
  }

  // Detect control characters
  if (/[\x00-\x1F\x7F]/.test(input)) {
    issues.push('Control characters detected')
  }

  return issues
}

/**
 * Create a safe summary of context for logging (removes sensitive data)
 */
export function createSafeContextSummary(context: any): string {
  return `Role: ${context.role?.substring(0, 20) || 'N/A'}, Industry: ${context.industry?.substring(0, 20) || 'N/A'}, ChallengeCount: ${context.currentChallenges?.length || 0}, TechStackCount: ${context.techStack?.length || 0}`
}

/**
 * Validate content for AI synthesis (prevent prompt injection in content)
 */
export function validateContentForSynthesis(content: string): ValidationResult {
  const suspiciousPatterns = [
    /ignore\s+previous\s+instructions/i,
    /forget\s+everything/i,
    /you\s+are\s+now/i,
    /new\s+instructions/i,
    /system\s*:/i,
    /assistant\s*:/i,
    /human\s*:/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
    /<\|endoftext\|>/i,
    /\}\}\s*\{\{/g, // Template boundary injection
  ]

  let sanitizedContent = content
  const warnings: string[] = []
  const errors: string[] = []

  // Check for suspicious patterns
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      errors.push('Content contains potential prompt injection patterns')
      sanitizedContent = sanitizedContent.replace(pattern, '[FILTERED]')
      warnings.push('Suspicious patterns replaced with [FILTERED]')
    }
  }

  // Length check
  if (content.length > 50000) {
    errors.push('Content exceeds maximum safe length')
    sanitizedContent = sanitizedContent.substring(0, 50000)
    warnings.push('Content truncated to safe length')
  }

  return {
    isValid: errors.length === 0,
    sanitizedValue: sanitizedContent,
    errors,
    warnings
  }
}