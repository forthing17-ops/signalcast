import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock environment variables
vi.mock('@/lib/env', () => ({
  env: {
    OPENAI_API_KEY: 'test-key',
    DATABASE_URL: 'test-db-url',
    DIRECT_URL: 'test-direct-url',
    NEXT_PUBLIC_SUPABASE_URL: 'test-supabase-url',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    NODE_ENV: 'test' as const
  }
}))

// Mock OpenAI module
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: vi.fn()
      }
    }
  }
}))

import { validateSynthesisResult, buildSynthesisPrompt, SynthesisContext } from '@/lib/openai'
import { validateSynthesizedInsight, SynthesizedInsight } from '@/lib/content-synthesis'

describe('OpenAI Content Synthesis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('buildSynthesisPrompt', () => {
    test('should build basic synthesis prompt', () => {
      const rawContent = [
        'Article 1: React performance optimization',
        'Article 2: Next.js 14 features'
      ]
      const context: SynthesisContext = {}

      const prompt = buildSynthesisPrompt(rawContent, context)
      
      expect(prompt).toContain('synthesize multiple pieces of raw content')
      expect(prompt).toContain('Article 1: React performance optimization')
      expect(prompt).toContain('Article 2: Next.js 14 features')
      expect(prompt).toContain('JSON object')
    })

    test('should include user context in prompt when provided', () => {
      const rawContent = ['Test content']
      const context: SynthesisContext = {
        userBackground: 'Senior Frontend Developer',
        userInterests: ['React', 'TypeScript'],
        toolStack: ['Next.js', 'Tailwind'],
        experienceLevel: 'Senior',
        industry: 'FinTech'
      }

      const prompt = buildSynthesisPrompt(rawContent, context)
      
      expect(prompt).toContain('PERSONALIZATION CONTEXT')
      expect(prompt).toContain('Senior Frontend Developer')
      expect(prompt).toContain('React, TypeScript')
      expect(prompt).toContain('Next.js, Tailwind')
      expect(prompt).toContain('FinTech')
    })
  })

  describe('validateSynthesisResult', () => {
    test('should validate correct synthesis result structure', () => {
      const validResult = {
        insights: [
          {
            title: 'Test Insight',
            summary: 'Test summary',
            details: 'Detailed analysis here',
            sources: ['Source 1'],
            relevanceScore: 0.8,
            tags: ['react', 'performance'],
            actionItems: ['Optimize components']
          }
        ],
        overallThemes: ['performance', 'optimization'],
        confidenceScore: 0.85
      }

      expect(validateSynthesisResult(validResult)).toBe(true)
    })

    test('should reject invalid synthesis result', () => {
      const invalidResults = [
        null,
        { insights: [] }, // Empty insights
        { insights: [{}], overallThemes: [], confidenceScore: 'invalid' }, // Wrong confidence score type
        { insights: [{}], overallThemes: 'not-array' }, // Wrong themes type
        { insights: 'not-array' }, // Wrong insights type
      ]

      invalidResults.forEach(result => {
        expect(validateSynthesisResult(result)).toBe(false)
      })
    })
  })
})

describe('Content Synthesis Utils', () => {
  describe('validateSynthesizedInsight', () => {
    test('should validate correct insight structure', () => {
      const validInsight: SynthesizedInsight = {
        title: 'React Performance Tips',
        summary: 'Key strategies for optimizing React applications',
        details: 'Detailed analysis of React performance optimization techniques including memoization, code splitting, and virtual DOM optimization',
        sources: ['Source 1', 'Source 2'],
        sourceUrls: ['https://example1.com', 'https://example2.com'],
        relevanceScore: 0.85,
        tags: ['react', 'performance', 'optimization'],
        actionItems: ['Implement React.memo', 'Add code splitting'],
        synthesizedAt: new Date(),
        userId: 'user123'
      }

      expect(validateSynthesizedInsight(validInsight)).toBe(true)
    })

    test('should reject invalid insights', () => {
      const baseInsight: SynthesizedInsight = {
        title: 'Valid Title',
        summary: 'Valid summary text',
        details: 'Valid detailed analysis content',
        sources: ['Source 1'],
        sourceUrls: ['https://example.com'],
        relevanceScore: 0.8,
        tags: ['tag1'],
        actionItems: ['action1'],
        synthesizedAt: new Date(),
        userId: 'user123'
      }

      // Test various invalid cases
      expect(validateSynthesizedInsight({ ...baseInsight, title: '' })).toBe(false)
      expect(validateSynthesizedInsight({ ...baseInsight, summary: 'short' })).toBe(false) // Too short
      expect(validateSynthesizedInsight({ ...baseInsight, details: 'short' })).toBe(false) // Too short
      expect(validateSynthesizedInsight({ ...baseInsight, sources: [] })).toBe(false) // Empty sources
      expect(validateSynthesizedInsight({ ...baseInsight, relevanceScore: -0.1 })).toBe(false) // Invalid score
      expect(validateSynthesizedInsight({ ...baseInsight, relevanceScore: 1.1 })).toBe(false) // Invalid score
      expect(validateSynthesizedInsight({ ...baseInsight, tags: [] })).toBe(false) // Empty tags
    })
  })
})