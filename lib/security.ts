/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitize user input by removing potentially dangerous characters
 * and HTML/XSS attempts
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets to prevent basic XSS
    .replace(/javascript:/gi, '') // Remove javascript protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .replace(/data:/gi, '') // Remove data URIs
    .trim()
}

/**
 * Validate email format more strictly
 */
export function isValidEmail(email: string): boolean {
  // More strict email validation that rejects consecutive dots
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  // Check basic format and length
  if (!emailRegex.test(email) || email.length > 254) {
    return false
  }
  
  // Reject consecutive dots in local part
  const [localPart] = email.split('@')
  if (localPart && localPart.includes('..')) {
    return false
  }
  
  return true
}

/**
 * Check for common SQL injection patterns
 */
export function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bor\b|\band\b).*=.*=/i,
    /union.*select/i,
    /insert.*into/i,
    /delete.*from/i,
    /drop.*table/i,
    /exec.*\(/i,
    /script.*>/i,
    /--/,
    /\/\*/,
    /\*\//,
  ]
  
  return sqlPatterns.some(pattern => pattern.test(input))
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '123456', 'qwerty',
    'admin', 'letmein', 'welcome', 'monkey'
  ]
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common, please choose a stronger password')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  // Use crypto.getRandomValues if available (browser/Node.js)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      result += chars[array[i]! % chars.length]
    }
  } else {
    // Fallback to Math.random (less secure)
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
  }
  
  return result
}

/**
 * Validate and sanitize display name
 */
export function sanitizeDisplayName(name: string): string {
  if (typeof name !== 'string') return ''
  
  return sanitizeInput(name)
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .slice(0, 50) // Limit length
}

/**
 * Check if request origin is allowed (CSRF protection)
 */
export function isAllowedOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false
  return allowedOrigins.includes(origin)
}

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
} as const