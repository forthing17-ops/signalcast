import { describe, it, expect } from 'vitest'
import {
  sanitizeInput,
  sanitizeDisplayName,
  isValidEmail,
  containsSqlInjection,
  validatePasswordStrength,
  generateSecureToken,
  isAllowedOrigin,
} from '@/lib/security'

describe('Security utilities', () => {
  describe('sanitizeInput', () => {
    it('removes dangerous HTML characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script')
      expect(sanitizeInput('test<>data')).toBe('testdata')
    })

    it('removes javascript protocol', () => {
      expect(sanitizeInput('javascript:alert("xss")')).toBe('alert("xss")')
    })

    it('removes event handlers', () => {
      expect(sanitizeInput('onclick=alert("xss")')).toBe('alert("xss")')
      expect(sanitizeInput('onload=malicious()')).toBe('malicious()')
    })

    it('removes data URIs', () => {
      expect(sanitizeInput('data:text/html,<script>alert(1)</script>')).toBe('text/html,scriptalert(1)/script')
    })

    it('trims whitespace', () => {
      expect(sanitizeInput('  test data  ')).toBe('test data')
    })

    it('handles non-string input', () => {
      expect(sanitizeInput(null as any)).toBe('')
      expect(sanitizeInput(undefined as any)).toBe('')
      expect(sanitizeInput(123 as any)).toBe('')
    })
  })

  describe('sanitizeDisplayName', () => {
    it('normalizes multiple spaces', () => {
      expect(sanitizeDisplayName('John   Doe')).toBe('John Doe')
      expect(sanitizeDisplayName('  Multiple    Spaces  ')).toBe('Multiple Spaces')
    })

    it('limits length to 50 characters', () => {
      const longName = 'a'.repeat(100)
      expect(sanitizeDisplayName(longName)).toBe('a'.repeat(50))
    })

    it('removes dangerous characters', () => {
      expect(sanitizeDisplayName('John <script>Doe</script>')).toBe('John scriptDoe/script')
    })
  })

  describe('isValidEmail', () => {
    it('validates correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true)
      expect(isValidEmail('test123@test-domain.com')).toBe(true)
    })

    it('rejects invalid email formats', () => {
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('test..email@example.com')).toBe(false)
    })

    it('rejects emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      expect(isValidEmail(longEmail)).toBe(false)
    })
  })

  describe('containsSqlInjection', () => {
    it('detects common SQL injection patterns', () => {
      expect(containsSqlInjection("' OR 1=1 --")).toBe(true)
      expect(containsSqlInjection('UNION SELECT * FROM users')).toBe(true)
      expect(containsSqlInjection('DROP TABLE users')).toBe(true)
      expect(containsSqlInjection('INSERT INTO users')).toBe(true)
      expect(containsSqlInjection('DELETE FROM users')).toBe(true)
      expect(containsSqlInjection('/* comment */')).toBe(true)
    })

    it('allows normal text', () => {
      expect(containsSqlInjection('normal text')).toBe(false)
      expect(containsSqlInjection('user@example.com')).toBe(false)
      expect(containsSqlInjection('John Doe')).toBe(false)
    })
  })

  describe('validatePasswordStrength', () => {
    it('validates strong passwords', () => {
      const result = validatePasswordStrength('StrongPass123')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects passwords that are too short', () => {
      const result = validatePasswordStrength('Short1')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('rejects passwords that are too long', () => {
      const result = validatePasswordStrength('a'.repeat(130))
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must be less than 128 characters')
    })

    it('requires lowercase letters', () => {
      const result = validatePasswordStrength('PASSWORD123')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('requires uppercase letters', () => {
      const result = validatePasswordStrength('password123')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('requires numbers', () => {
      const result = validatePasswordStrength('PasswordOnly')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('rejects common weak passwords', () => {
      const result = validatePasswordStrength('password123')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Password is too common, please choose a stronger password')
    })

    it('returns multiple errors for very weak passwords', () => {
      const result = validatePasswordStrength('weak')
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })
  })

  describe('generateSecureToken', () => {
    it('generates token of specified length', () => {
      const token = generateSecureToken(16)
      expect(token).toHaveLength(16)
    })

    it('generates different tokens on multiple calls', () => {
      const token1 = generateSecureToken(32)
      const token2 = generateSecureToken(32)
      expect(token1).not.toBe(token2)
    })

    it('uses default length of 32', () => {
      const token = generateSecureToken()
      expect(token).toHaveLength(32)
    })

    it('generates tokens with valid characters only', () => {
      const token = generateSecureToken(100)
      const validChars = /^[A-Za-z0-9]+$/
      expect(validChars.test(token)).toBe(true)
    })
  })

  describe('isAllowedOrigin', () => {
    const allowedOrigins = ['https://example.com', 'https://app.example.com']

    it('allows whitelisted origins', () => {
      expect(isAllowedOrigin('https://example.com', allowedOrigins)).toBe(true)
      expect(isAllowedOrigin('https://app.example.com', allowedOrigins)).toBe(true)
    })

    it('rejects non-whitelisted origins', () => {
      expect(isAllowedOrigin('https://malicious.com', allowedOrigins)).toBe(false)
      expect(isAllowedOrigin('http://example.com', allowedOrigins)).toBe(false)
    })

    it('rejects null or undefined origins', () => {
      expect(isAllowedOrigin(null, allowedOrigins)).toBe(false)
      expect(isAllowedOrigin(undefined as any, allowedOrigins)).toBe(false)
    })
  })
})