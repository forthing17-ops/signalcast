import { describe, it, expect } from 'vitest'
import { UserPreferences } from '@prisma/client'
import {
  extractProfessionalContext,
  buildSynthesisContext,
  getDefaultProfessionalContext,
  validateProfessionalContext,
  getContextCompletenessScore,
  getProfileImprovementSuggestions,
  getContextSummary,
  ProfessionalContextProfile
} from '../../../lib/professional-context'

describe('Professional Context Functions', () => {
  describe('extractProfessionalContext', () => {
    it('should return default context when user preferences is null', () => {
      const result = extractProfessionalContext(null)
      
      expect(result).toEqual({
        role: 'Technology Professional',
        industry: 'Technology', 
        companySize: 'Not specified',
        experienceLevel: 'Intermediate',
        currentChallenges: ['Staying updated with technology trends', 'Making informed technology decisions'],
        decisionFocusAreas: ['Technology selection', 'Process improvement'],
        curiosityAreas: ['Emerging technologies', 'Industry best practices'],
        formalityLevel: 'professional',
        techStack: [],
        interests: []
      })
    })

    it('should extract professional context from complete user preferences', () => {
      const mockUserPreferences = {
        id: 'user-123',
        userId: 'user-123',
        professionalRole: 'Senior Software Engineer',
        industry: 'Fintech',
        companySize: 'Series B (51-200 employees)',
        experienceLevel: 'Senior',
        currentChallenges: ['Technical debt', 'Team scaling'],
        decisionFocusAreas: ['Architecture', 'Technology stack'],
        curiosityAreas: ['AI/ML', 'Blockchain'],
        formalityLevel: 'executive',
        techStack: ['React', 'Node.js'],
        interests: ['Web development'],
        deliveryTime: '09:00',
        contentDepth: 'detailed',
        noveltyPreference: 0.8,
        antiRepetitionEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as UserPreferences

      const result = extractProfessionalContext(mockUserPreferences)
      
      expect(result).toEqual({
        role: 'Senior Software Engineer',
        industry: 'Fintech',
        companySize: 'Series B (51-200 employees)',
        experienceLevel: 'Senior',
        currentChallenges: ['Technical debt', 'Team scaling'],
        decisionFocusAreas: ['Architecture', 'Technology stack'],
        curiosityAreas: ['AI/ML', 'Blockchain'], 
        formalityLevel: 'executive',
        techStack: ['React', 'Node.js'],
        interests: ['Web development']
      })
    })

    it('should use defaults for missing professional fields', () => {
      const mockUserPreferences = {
        id: 'user-123',
        userId: 'user-123',
        interests: ['Programming'],
        techStack: ['JavaScript'],
        deliveryTime: '09:00',
        contentDepth: 'brief',
        noveltyPreference: 0.5,
        antiRepetitionEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      } as UserPreferences

      const result = extractProfessionalContext(mockUserPreferences)
      
      expect(result.role).toBe('Professional')
      expect(result.industry).toBe('Technology')
      expect(result.experienceLevel).toBe('Intermediate')
      expect(result.formalityLevel).toBe('professional')
      expect(result.currentChallenges).toEqual([])
      expect(result.interests).toEqual(['Programming'])
      expect(result.techStack).toEqual(['JavaScript'])
    })
  })

  describe('buildSynthesisContext', () => {
    it('should convert professional context to synthesis context', () => {
      const professionalContext: ProfessionalContextProfile = {
        role: 'Product Manager',
        industry: 'E-commerce',
        companySize: 'Enterprise (500+ employees)',
        experienceLevel: 'Senior',
        currentChallenges: ['User retention', 'Feature prioritization'],
        decisionFocusAreas: ['Product strategy', 'User experience'],
        curiosityAreas: ['Growth hacking', 'Data analytics'],
        formalityLevel: 'professional',
        techStack: ['Analytics tools', 'Design systems'],
        interests: ['Product management', 'UX design']
      }

      const result = buildSynthesisContext(professionalContext)
      
      expect(result).toEqual({
        professionalRole: 'Product Manager',
        industry: 'E-commerce',
        companySize: 'Enterprise (500+ employees)',
        experienceLevel: 'Senior',
        currentChallenges: ['User retention', 'Feature prioritization'],
        decisionFocusAreas: ['Product strategy', 'User experience'],
        curiosityAreas: ['Growth hacking', 'Data analytics'],
        formalityLevel: 'professional',
        toolStack: ['Analytics tools', 'Design systems'],
        userInterests: ['Product management', 'UX design']
      })
    })
  })

  describe('validateProfessionalContext', () => {
    it('should validate complete professional context', () => {
      const completeContext: ProfessionalContextProfile = {
        role: 'Data Scientist',
        industry: 'Healthcare',
        companySize: 'Startup (1-10 employees)',
        experienceLevel: 'Mid-level',
        currentChallenges: ['Data quality'],
        decisionFocusAreas: ['ML models'],
        curiosityAreas: ['Deep learning'],
        formalityLevel: 'professional',
        techStack: ['Python'],
        interests: ['Machine learning']
      }

      const result = validateProfessionalContext(completeContext)
      
      expect(result.isValid).toBe(true)
      expect(result.missingFields).toHaveLength(0)
    })

    it('should identify missing required fields', () => {
      const incompleteContext: ProfessionalContextProfile = {
        role: '',
        industry: 'Technology',
        companySize: 'Not specified',
        experienceLevel: '',
        currentChallenges: [],
        decisionFocusAreas: [],
        curiosityAreas: [],
        formalityLevel: 'professional',
        techStack: [],
        interests: []
      }

      const result = validateProfessionalContext(incompleteContext)
      
      expect(result.isValid).toBe(false)
      expect(result.missingFields).toEqual(['role', 'experienceLevel'])
    })
  })

  describe('getContextCompletenessScore', () => {
    it('should calculate 100% completeness for fully filled context', () => {
      const completeContext: ProfessionalContextProfile = {
        role: 'DevOps Engineer',
        industry: 'Cloud Computing',
        companySize: 'Mid-size (51-200 employees)',
        experienceLevel: 'Senior',
        currentChallenges: ['Infrastructure scaling', 'Cost optimization'],
        decisionFocusAreas: ['Cloud architecture', 'Automation'],
        curiosityAreas: ['Kubernetes', 'Serverless'],
        formalityLevel: 'professional',
        techStack: ['Docker', 'AWS', 'Terraform'],
        interests: ['DevOps', 'Cloud architecture']
      }

      const score = getContextCompletenessScore(completeContext)
      expect(score).toBe(1.0)
    })

    it('should calculate partial completeness for incomplete context', () => {
      const partialContext: ProfessionalContextProfile = {
        role: 'Software Developer',
        industry: 'Technology',
        companySize: 'Not specified', // This counts as incomplete
        experienceLevel: 'Junior',
        currentChallenges: [], // Empty array counts as incomplete
        decisionFocusAreas: ['Code quality'],
        curiosityAreas: [],  // Empty array counts as incomplete
        formalityLevel: 'casual',
        techStack: ['JavaScript'],
        interests: [] // Empty array counts as incomplete
      }

      const score = getContextCompletenessScore(partialContext)
      // 5 completed fields out of 9 total = 5/9 ≈ 0.556
      expect(score).toBeCloseTo(0.556, 2)
    })

    it('should handle empty context', () => {
      const emptyContext: ProfessionalContextProfile = {
        role: '',
        industry: '',
        companySize: 'Not specified',
        experienceLevel: '',
        currentChallenges: [],
        decisionFocusAreas: [],
        curiosityAreas: [],
        formalityLevel: 'professional',
        techStack: [],
        interests: []
      }

      const score = getContextCompletenessScore(emptyContext)
      // Only formalityLevel is filled (not "Not specified") = 1/9 ≈ 0.111
      expect(score).toBeCloseTo(0.111, 2)
    })
  })

  describe('getProfileImprovementSuggestions', () => {
    it('should return suggestions for incomplete profile areas', () => {
      const incompleteContext: ProfessionalContextProfile = {
        role: 'Marketing Manager',
        industry: 'SaaS',
        companySize: 'Not specified',
        experienceLevel: 'Mid-level',
        currentChallenges: [],
        decisionFocusAreas: [],
        curiosityAreas: ['Growth marketing'],
        formalityLevel: 'professional',
        techStack: [],
        interests: ['Digital marketing']
      }

      const suggestions = getProfileImprovementSuggestions(incompleteContext)
      
      expect(suggestions).toContain('Add your current professional challenges for more targeted insights')
      expect(suggestions).toContain('Specify your decision focus areas to get relevant strategic insights')
      expect(suggestions).toContain('List your technology stack for more relevant technical insights')
      expect(suggestions).toContain('Specify your company size for context-appropriate recommendations')
      expect(suggestions).not.toContain('Define curiosity areas to explore emerging trends that interest you')
    })

    it('should return empty suggestions for complete profile', () => {
      const completeContext: ProfessionalContextProfile = {
        role: 'CTO',
        industry: 'EdTech',
        companySize: 'Series A (11-50 employees)',
        experienceLevel: 'Executive',
        currentChallenges: ['Team scaling', 'Technical vision'],
        decisionFocusAreas: ['Architecture', 'Hiring'],
        curiosityAreas: ['AI in education', 'Learning analytics'],
        formalityLevel: 'executive',
        techStack: ['Python', 'React', 'PostgreSQL'],
        interests: ['Education technology', 'Leadership']
      }

      const suggestions = getProfileImprovementSuggestions(completeContext)
      expect(suggestions).toHaveLength(0)
    })
  })

  describe('getContextSummary', () => {
    it('should generate context summary with completeness percentage', () => {
      const context: ProfessionalContextProfile = {
        role: 'Frontend Developer',
        industry: 'Gaming',
        companySize: 'Mid-size (51-200 employees)',
        experienceLevel: 'Mid-level',
        currentChallenges: ['Performance optimization'],
        decisionFocusAreas: [],
        curiosityAreas: ['WebGL', 'Game engines'],
        formalityLevel: 'casual',
        techStack: ['React', 'TypeScript', 'Three.js'],
        interests: ['Web development', 'Game development']
      }

      const summary = getContextSummary(context)
      
      expect(summary).toBe('Frontend Developer in Gaming (Mid-level, 78% complete profile)')
    })

    it('should handle minimal context', () => {
      const minimalContext = getDefaultProfessionalContext()
      const summary = getContextSummary(minimalContext)
      
      expect(summary).toBe('Technology Professional in Technology (Intermediate, 67% complete profile)')
    })
  })

  describe('getDefaultProfessionalContext', () => {
    it('should return consistent default values', () => {
      const defaultContext = getDefaultProfessionalContext()
      
      expect(defaultContext.role).toBe('Technology Professional')
      expect(defaultContext.industry).toBe('Technology')
      expect(defaultContext.experienceLevel).toBe('Intermediate')
      expect(defaultContext.formalityLevel).toBe('professional')
      expect(defaultContext.currentChallenges).toHaveLength(2)
      expect(defaultContext.decisionFocusAreas).toHaveLength(2)
      expect(defaultContext.curiosityAreas).toHaveLength(2)
      expect(defaultContext.techStack).toHaveLength(0)
      expect(defaultContext.interests).toHaveLength(0)
    })
  })

  describe('Input Validation and Security', () => {
    it('should handle malicious input safely', () => {
      const maliciousPreferences = {
        id: 'user-123',
        userId: 'user-123',
        professionalRole: '<script>alert("xss")</script>',
        industry: 'SELECT * FROM users; DROP TABLE users;',
        currentChallenges: ['"><img src=x onerror=alert(1)>'],
        formalityLevel: 'professional',
        deliveryTime: '09:00',
        contentDepth: 'brief',
        noveltyPreference: 0.5,
        antiRepetitionEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as UserPreferences

      const result = extractProfessionalContext(maliciousPreferences)
      
      // Should sanitize malicious input via validation system
      expect(result.role).toBe('scriptalert("xss")/script') // HTML tags removed
      expect(result.industry).toBe('SELECT * FROM users DROP TABLE users') // Semicolons removed
      expect(result.currentChallenges[0]).toBe('"imgsrcxonerroralert(1)') // HTML and special chars removed
    })

    it('should handle extremely long input strings', () => {
      const longString = 'a'.repeat(10000)
      const preferencesWithLongData = {
        id: 'user-123',
        userId: 'user-123',
        professionalRole: longString,
        industry: longString,
        currentChallenges: [longString, longString],
        formalityLevel: 'professional',
        deliveryTime: '09:00',
        contentDepth: 'brief',
        noveltyPreference: 0.5,
        antiRepetitionEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as UserPreferences

      const result = extractProfessionalContext(preferencesWithLongData)
      
      // Should be truncated by validation system (max 100 chars for role, 100 for industry, 200 for challenges)
      expect(result.role).toBe('a'.repeat(100))
      expect(result.industry).toBe('a'.repeat(100))
      expect(result.currentChallenges).toHaveLength(2)
      expect(result.currentChallenges[0]).toBe('a'.repeat(200))
    })

    it('should handle invalid formality level gracefully', () => {
      const preferencesWithInvalidFormality = {
        id: 'user-123', 
        userId: 'user-123',
        formalityLevel: 'invalid_level',
        deliveryTime: '09:00',
        contentDepth: 'brief',
        noveltyPreference: 0.5,
        antiRepetitionEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as UserPreferences

      const result = extractProfessionalContext(preferencesWithInvalidFormality)
      
      // Should fall back to default 'professional'
      expect(result.formalityLevel).toBe('professional')
    })
  })
})