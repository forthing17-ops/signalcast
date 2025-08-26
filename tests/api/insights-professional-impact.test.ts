import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GET, POST } from '../../app/api/insights/professional-impact/route'
import { NextRequest } from 'next/server'
import { createMocks } from 'node-mocks-http'

// Mock external dependencies
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn()
    }
  }))
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({}))
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    userPreferences: {
      findUnique: vi.fn()
    },
    content: {
      findFirst: vi.fn()
    }
  }
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('@/lib/professional-context', () => ({
  extractProfessionalContext: vi.fn()
}))

// Import mocked modules
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { extractProfessionalContext } from '@/lib/professional-context'

const mockSupabaseClient = createRouteHandlerClient as any
const mockPrisma = prisma as any
const mockExtractProfessionalContext = extractProfessionalContext as any

describe('Professional Impact API Endpoint', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {}
  }

  const mockUserPreferences = {
    id: 'pref-123',
    userId: 'user-123',
    professionalRole: 'Senior Software Engineer',
    industry: 'Technology',
    currentChallenges: ['Technical debt', 'Team scaling'],
    decisionFocusAreas: ['Architecture', 'Performance'],
    curiosityAreas: ['AI/ML', 'Cloud computing'],
    techStack: ['React', 'Node.js', 'PostgreSQL'],
    interests: ['Software architecture'],
    formalityLevel: 'professional',
    deliveryTime: '09:00',
    contentDepth: 'detailed',
    noveltyPreference: 0.8,
    antiRepetitionEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockProfessionalContext = {
    role: 'Senior Software Engineer',
    industry: 'Technology',
    companySize: 'Mid-size',
    experienceLevel: 'Senior',
    currentChallenges: ['Technical debt', 'Team scaling'],
    decisionFocusAreas: ['Architecture', 'Performance'],
    curiosityAreas: ['AI/ML', 'Cloud computing'],
    formalityLevel: 'professional' as const,
    techStack: ['React', 'Node.js', 'PostgreSQL'],
    interests: ['Software architecture']
  }

  const mockContent = {
    id: 'content-123',
    createdBy: 'user-123',
    title: 'Microservices Architecture Best Practices',
    content: 'Comprehensive guide on microservices architecture implementation with performance optimization techniques and security considerations',
    sourceMetadata: { type: 'ai-synthesized' },
    topics: ['microservices', 'architecture', 'performance'],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    mockSupabaseClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      }
    })

    mockExtractProfessionalContext.mockReturnValue(mockProfessionalContext)
  })

  describe('GET /api/insights/professional-impact', () => {
    it('should return professional impact assessment for valid content', async () => {
      // Setup mocks
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockUserPreferences)
      mockPrisma.content.findFirst.mockResolvedValue(mockContent)

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-123')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      
      // Verify assessment structure
      expect(data.data.contentId).toBe('content-123')
      expect(data.data.userId).toBe('user-123')
      expect(data.data.overallImpactScore).toBeGreaterThanOrEqual(0)
      expect(data.data.overallImpactScore).toBeLessThanOrEqual(100)
      
      // Verify impact categories
      expect(data.data.impactCategories).toHaveProperty('strategicAlignment')
      expect(data.data.impactCategories).toHaveProperty('operationalEfficiency')
      expect(data.data.impactCategories).toHaveProperty('skillDevelopment')
      expect(data.data.impactCategories).toHaveProperty('decisionSupport')
      expect(data.data.impactCategories).toHaveProperty('competitiveAdvantage')
      expect(data.data.impactCategories).toHaveProperty('riskMitigation')
      
      // Verify each category has required structure
      Object.values(data.data.impactCategories).forEach((category: any) => {
        expect(category).toHaveProperty('score')
        expect(category).toHaveProperty('description')
        expect(category).toHaveProperty('factors')
        expect(category).toHaveProperty('evidence')
        expect(category.score).toBeGreaterThanOrEqual(0)
        expect(category.score).toBeLessThanOrEqual(100)
      })

      // Verify role-specific insights
      expect(data.data.roleSpecificInsights).toHaveProperty('relevanceScore')
      expect(data.data.roleSpecificInsights).toHaveProperty('applicability')
      expect(data.data.roleSpecificInsights).toHaveProperty('implementationBarriers')
      expect(data.data.roleSpecificInsights).toHaveProperty('successFactors')

      // Verify industry context analysis
      expect(data.data.industryContextAnalysis).toHaveProperty('industryRelevance')
      expect(data.data.industryContextAnalysis).toHaveProperty('marketTiming')
      expect(data.data.industryContextAnalysis).toHaveProperty('competitiveImplications')
      expect(data.data.industryContextAnalysis.marketTiming).toMatch(/^(early|optimal|late)$/)

      // Verify tool stack alignment
      expect(data.data.toolStackAlignment).toHaveProperty('compatibilityScore')
      expect(data.data.toolStackAlignment).toHaveProperty('integrationComplexity')
      expect(data.data.toolStackAlignment).toHaveProperty('requiredAdaptations')
      expect(data.data.toolStackAlignment.integrationComplexity).toMatch(/^(low|medium|high)$/)

      // Verify time to value structure
      expect(data.data.timeToValue).toHaveProperty('immediateValue')
      expect(data.data.timeToValue).toHaveProperty('shortTermValue')
      expect(data.data.timeToValue).toHaveProperty('longTermValue')

      // Verify confidence metrics
      expect(data.data.confidenceMetrics).toHaveProperty('assessmentConfidence')
      expect(data.data.confidenceMetrics).toHaveProperty('dataQuality')
      expect(data.data.confidenceMetrics).toHaveProperty('contextMatch')
      expect(data.data.confidenceMetrics.assessmentConfidence).toBeLessThanOrEqual(1)
      expect(data.data.confidenceMetrics.dataQuality).toBeLessThanOrEqual(1)
      expect(data.data.confidenceMetrics.contextMatch).toBeLessThanOrEqual(1)

      // Verify recommendations
      expect(data.data.recommendations).toHaveProperty('priority')
      expect(data.data.recommendations).toHaveProperty('nextSteps')
      expect(data.data.recommendations).toHaveProperty('monitoringMetrics')
      expect(data.data.recommendations.priority).toMatch(/^(low|medium|high|critical)$/)
      
      // Verify metadata
      expect(data.data.generatedAt).toBeDefined()
      expect(new Date(data.data.generatedAt)).toBeInstanceOf(Date)
    })

    it('should return 401 when user is not authenticated', async () => {
      // Mock unauthenticated user
      mockSupabaseClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated')
          })
        }
      })

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-123')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 400 when contentId is missing', async () => {
      const request = new NextRequest('http://localhost/api/insights/professional-impact')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('contentId parameter is required')
    })

    it('should return 404 when content is not found', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockUserPreferences)
      mockPrisma.content.findFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=nonexistent')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Content not found or access denied')
    })

    it('should return 404 when content belongs to different user', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockUserPreferences)
      mockPrisma.content.findFirst.mockResolvedValue(null) // Simulates access denied

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-456')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Content not found or access denied')

      // Verify the query included user ID check
      expect(mockPrisma.content.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'content-456',
          createdBy: 'user-123'
        }
      })
    })

    it('should handle different assessment types', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockUserPreferences)
      mockPrisma.content.findFirst.mockResolvedValue(mockContent)

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-123&assessmentType=comparative')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(logger.info).toHaveBeenCalledWith(
        'Processing professional impact assessment request',
        expect.objectContaining({ assessmentType: 'comparative' })
      )
    })

    it('should handle missing user preferences gracefully', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(null)
      mockPrisma.content.findFirst.mockResolvedValue(mockContent)
      // extractProfessionalContext should return defaults when null is passed
      mockExtractProfessionalContext.mockReturnValue({
        role: 'Technology Professional',
        industry: 'Technology',
        // ... other default values
      })

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-123')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockExtractProfessionalContext).toHaveBeenCalledWith(null)
    })

    it('should return 500 on database error', async () => {
      mockPrisma.userPreferences.findUnique.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-123')
      
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
      expect(logger.error).toHaveBeenCalledWith(
        'Error in professional impact assessment',
        expect.any(Error)
      )
    })
  })

  describe('POST /api/insights/professional-impact', () => {
    const mockInsights = [
      'Microservices architecture improves scalability and team autonomy',
      'Implementing GraphQL can optimize data fetching performance',
      'Container orchestration with Kubernetes enhances deployment reliability'
    ]

    it('should process batch professional impact assessment', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockUserPreferences)

      const requestBody = {
        insights: mockInsights,
        assessmentType: 'batch'
      }

      const request = new NextRequest('http://localhost/api/insights/professional-impact', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.assessments).toHaveLength(3)
      expect(data.data.summary).toBeDefined()
      expect(data.data.summary.totalAssessments).toBe(3)
      expect(data.data.summary.averageScore).toBeGreaterThanOrEqual(0)
      expect(data.data.summary.averageScore).toBeLessThanOrEqual(100)
      expect(data.data.summary.highestImpact).toBeGreaterThanOrEqual(0)
      expect(data.data.summary.highestImpact).toBeLessThanOrEqual(100)

      // Verify each assessment in the batch
      data.data.assessments.forEach((assessment: any, index: number) => {
        expect(assessment.contentId).toBe(`batch-${index}`)
        expect(assessment.userId).toBe('user-123')
        expect(assessment.overallImpactScore).toBeGreaterThanOrEqual(0)
        expect(assessment.overallImpactScore).toBeLessThanOrEqual(100)
        expect(assessment.impactCategories).toBeDefined()
        expect(assessment.roleSpecificInsights).toBeDefined()
        expect(assessment.generatedAt).toBeDefined()
      })
    })

    it('should return 401 when user is not authenticated for POST', async () => {
      mockSupabaseClient.mockReturnValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not authenticated')
          })
        }
      })

      const request = new NextRequest('http://localhost/api/insights/professional-impact', {
        method: 'POST',
        body: JSON.stringify({ insights: mockInsights }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Authentication required')
    })

    it('should return 400 when insights array is missing', async () => {
      const request = new NextRequest('http://localhost/api/insights/professional-impact', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Insights array is required')
    })

    it('should return 400 when insights array is empty', async () => {
      const request = new NextRequest('http://localhost/api/insights/professional-impact', {
        method: 'POST',
        body: JSON.stringify({ insights: [] }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Insights array is required')
    })

    it('should handle single insight in batch', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockUserPreferences)

      const request = new NextRequest('http://localhost/api/insights/professional-impact', {
        method: 'POST',
        body: JSON.stringify({ insights: ['Single insight for testing'] }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.assessments).toHaveLength(1)
      expect(data.data.summary.totalAssessments).toBe(1)
      expect(data.data.summary.averageScore).toBe(data.data.summary.highestImpact)
    })

    it('should handle large batch of insights efficiently', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockUserPreferences)

      const largeInsightBatch = Array(20).fill('Test insight for performance evaluation')

      const request = new NextRequest('http://localhost/api/insights/professional-impact', {
        method: 'POST',
        body: JSON.stringify({ insights: largeInsightBatch }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const startTime = Date.now()
      const response = await POST(request)
      const endTime = Date.now()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.assessments).toHaveLength(20)
      expect(data.data.summary.totalAssessments).toBe(20)
      
      // Performance check - should complete within reasonable time
      const processingTime = endTime - startTime
      expect(processingTime).toBeLessThan(5000) // 5 seconds max for 20 insights
    })

    it('should return 500 on error during batch processing', async () => {
      mockPrisma.userPreferences.findUnique.mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/insights/professional-impact', {
        method: 'POST',
        body: JSON.stringify({ insights: mockInsights }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
      expect(logger.error).toHaveBeenCalledWith(
        'Error in batch professional impact assessment',
        expect.any(Error)
      )
    })
  })

  describe('Assessment Algorithm Validation', () => {
    beforeEach(() => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockUserPreferences)
      mockPrisma.content.findFirst.mockResolvedValue(mockContent)
    })

    it('should score higher for content matching decision focus areas', async () => {
      const relevantContent = {
        ...mockContent,
        content: 'Architecture and performance optimization strategies for scalable systems'
      }
      mockPrisma.content.findFirst.mockResolvedValue(relevantContent)

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-123')
      
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.impactCategories.strategicAlignment.score).toBeGreaterThan(50)
      expect(data.data.impactCategories.strategicAlignment.factors).toContain('Aligns with decision focus areas')
    })

    it('should score higher for content matching tech stack', async () => {
      const techStackContent = {
        ...mockContent,
        content: 'React and Node.js best practices for PostgreSQL integration and optimization'
      }
      mockPrisma.content.findFirst.mockResolvedValue(techStackContent)

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-123')
      
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.impactCategories.operationalEfficiency.score).toBeGreaterThan(50)
      expect(data.data.impactCategories.operationalEfficiency.factors).toContain('Relevant to current technology stack')
      expect(data.data.toolStackAlignment.compatibilityScore).toBe(85)
      expect(data.data.toolStackAlignment.integrationComplexity).toBe('low')
    })

    it('should score higher for learning-oriented content', async () => {
      const learningContent = {
        ...mockContent,
        content: 'Learn advanced software architecture patterns and skill development techniques for engineers'
      }
      mockPrisma.content.findFirst.mockResolvedValue(learningContent)

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-123')
      
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.impactCategories.skillDevelopment.score).toBeGreaterThan(60)
      expect(data.data.impactCategories.skillDevelopment.factors).toContain('Contains learning opportunities')
    })

    it('should score higher for content with recommendations', async () => {
      const recommendationContent = {
        ...mockContent,
        content: 'We recommend implementing these architectural patterns and suggest the following optimization strategies'
      }
      mockPrisma.content.findFirst.mockResolvedValue(recommendationContent)

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-123')
      
      const response = await GET(request)
      const data = await response.json()

      expect(data.data.impactCategories.decisionSupport.score).toBeGreaterThan(60)
      expect(data.data.impactCategories.decisionSupport.factors).toContain('Contains actionable recommendations')
    })

    it('should assign appropriate priority based on overall score', async () => {
      // Test high score scenario
      const highImpactContent = {
        ...mockContent,
        content: 'React Node.js PostgreSQL architecture performance optimization with learning opportunities and security recommendations'
      }
      mockPrisma.content.findFirst.mockResolvedValue(highImpactContent)

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-123')
      
      const response = await GET(request)
      const data = await response.json()

      // Should score high due to tech stack match, performance focus, learning, and recommendations
      expect(data.data.overallImpactScore).toBeGreaterThan(70)
      expect(data.data.recommendations.priority).toMatch(/^(medium|high|critical)$/)
    })
  })

  describe('Professional Context Integration', () => {
    it('should call extractProfessionalContext with correct parameters', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockUserPreferences)
      mockPrisma.content.findFirst.mockResolvedValue(mockContent)

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-123')
      
      await GET(request)

      expect(mockExtractProfessionalContext).toHaveBeenCalledWith(mockUserPreferences)
    })

    it('should handle null user preferences in professional context extraction', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(null)
      mockPrisma.content.findFirst.mockResolvedValue(mockContent)

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-123')
      
      await GET(request)

      expect(mockExtractProfessionalContext).toHaveBeenCalledWith(null)
    })
  })

  describe('Logging and Monitoring', () => {
    it('should log request processing', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockUserPreferences)
      mockPrisma.content.findFirst.mockResolvedValue(mockContent)

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-123')
      
      await GET(request)

      expect(logger.info).toHaveBeenCalledWith(
        'Processing professional impact assessment request',
        {
          userId: 'user-123',
          contentId: 'content-123',
          assessmentType: 'individual'
        }
      )
    })

    it('should log successful completion', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockUserPreferences)
      mockPrisma.content.findFirst.mockResolvedValue(mockContent)

      const request = new NextRequest('http://localhost/api/insights/professional-impact?contentId=content-123')
      
      await GET(request)

      expect(logger.info).toHaveBeenCalledWith(
        'Professional impact assessment completed',
        {
          userId: 'user-123',
          contentId: 'content-123',
          overallScore: expect.any(Number)
        }
      )
    })

    it('should log batch processing details', async () => {
      mockPrisma.userPreferences.findUnique.mockResolvedValue(mockUserPreferences)

      const request = new NextRequest('http://localhost/api/insights/professional-impact', {
        method: 'POST',
        body: JSON.stringify({ insights: mockInsights }),
        headers: { 'Content-Type': 'application/json' }
      })
      
      await POST(request)

      expect(logger.info).toHaveBeenCalledWith(
        'Processing batch professional impact assessment',
        {
          userId: 'user-123',
          insightCount: 3
        }
      )

      expect(logger.info).toHaveBeenCalledWith(
        'Batch professional impact assessment completed',
        {
          userId: 'user-123',
          assessmentCount: 3
        }
      )
    })
  })
})