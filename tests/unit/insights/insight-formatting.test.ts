import { describe, it, expect, vi } from 'vitest'
import {
  formatProfessionalInsight,
  FormattedProfessionalInsight,
  DecisionPoint,
  TrendInsight,
  ActionItem,
  BusinessImpactAssessment,
  ConfidenceMetrics
} from '../../../lib/insight-formatting'
import { ProfessionalContextProfile } from '../../../lib/professional-context'
import { ProfessionalSynthesisResult } from '../../../lib/openai'

describe('Insight Formatting Functions', () => {
  const mockProfessionalContext: ProfessionalContextProfile = {
    role: 'Senior Software Engineer',
    industry: 'Technology',
    companySize: 'Mid-size (51-200 employees)',
    experienceLevel: 'Senior',
    currentChallenges: ['Technical debt', 'Team scaling'],
    decisionFocusAreas: ['Architecture', 'Technology selection'],
    curiosityAreas: ['AI/ML', 'Cloud architecture'],
    formalityLevel: 'professional',
    techStack: ['React', 'Node.js', 'PostgreSQL'],
    interests: ['Software architecture', 'Performance optimization']
  }

  const mockSynthesisResult: ProfessionalSynthesisResult = {
    insights: [
      {
        id: 'insight-1',
        title: 'Microservices Architecture Transition Strategy',
        summary: 'Analysis of microservices adoption patterns and implementation strategies for medium-sized engineering teams.',
        details: 'Detailed analysis of microservices benefits, challenges, and implementation roadmap specifically tailored for teams transitioning from monolithic architectures.',
        professionalImpact: {
          decisionSupport: 'Recommend phased approach starting with bounded contexts identification',
          businessValue: 'Improved scalability and team autonomy, reduced deployment risks',
          implementationComplexity: 'high',
          toolsAndResources: ['Docker', 'Kubernetes', 'API Gateway']
        },
        actionItems: [
          'Conduct domain modeling workshop',
          'Implement service mesh architecture',
          'Establish monitoring and observability practices'
        ],
        confidenceLevel: 0.85,
        relevanceScore: 0.9,
        sources: [
          'Martin Fowler microservices article',
          'Netflix engineering blog post on service architecture'
        ],
        tags: ['microservices', 'architecture', 'emerging-trend', 'scalability'],
        crossDomainConnections: ['DevOps practices', 'Team organization patterns']
      }
    ],
    metadata: {
      processedAt: new Date(),
      totalInsights: 1,
      averageConfidence: 0.85,
      processingTimeMs: 1500
    },
    confidenceScore: 0.85,
    personalizationFactors: {
      roleAlignment: 0.9,
      industryRelevance: 0.8,
      challengeAlignment: 0.85
    }
  }

  const mockSourceData = [
    {
      url: 'https://martinfowler.com/articles/microservices.html',
      platform: 'martinfowler.com',
      publishedAt: new Date('2023-01-15')
    },
    {
      url: 'https://netflixtechblog.com/service-architecture',
      platform: 'netflix.com',
      publishedAt: new Date('2023-02-10')
    }
  ]

  describe('formatProfessionalInsight', () => {
    it('should format complete professional insight with all sections', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext,
        mockSourceData
      )

      expect(results).toHaveLength(1)
      const insight = results[0]

      // Verify basic structure
      expect(insight.id).toMatch(/insight-\d+-0/)
      expect(insight.title).toBe('Microservices Architecture Transition Strategy')
      expect(insight.executiveSummary).toContain('business impact score')
      
      // Verify key sections exist
      expect(insight.keyDecisions).toBeDefined()
      expect(insight.trendAnalysis).toBeDefined()
      expect(insight.actionItems).toBeDefined()
      expect(insight.businessImpact).toBeDefined()
      expect(insight.implementationGuidance).toBeDefined()
      expect(insight.confidence).toBeDefined()
      expect(insight.crossDomainConnections).toBeDefined()
      expect(insight.sourceAttribution).toBeDefined()
      expect(insight.formattedContent).toBeDefined()
      expect(insight.metadata).toBeDefined()
    })

    it('should handle multiple insights in synthesis result', async () => {
      const multiInsightResult = {
        ...mockSynthesisResult,
        insights: [
          mockSynthesisResult.insights[0],
          {
            ...mockSynthesisResult.insights[0],
            id: 'insight-2',
            title: 'Container Security Best Practices'
          }
        ]
      }

      const results = await formatProfessionalInsight(
        multiInsightResult,
        mockProfessionalContext
      )

      expect(results).toHaveLength(2)
      expect(results[0].title).toBe('Microservices Architecture Transition Strategy')
      expect(results[1].title).toBe('Container Security Best Practices')
      expect(results[0].id).toMatch(/insight-\d+-0/)
      expect(results[1].id).toMatch(/insight-\d+-1/)
    })

    it('should handle insights without optional fields', async () => {
      const minimalInsight = {
        insights: [{
          id: 'minimal-1',
          title: 'Basic Insight',
          summary: 'Simple insight without detailed fields',
          details: 'Basic details'
        }],
        metadata: {
          processedAt: new Date(),
          totalInsights: 1,
          averageConfidence: 0.7,
          processingTimeMs: 800
        },
        confidenceScore: 0.7
      }

      const results = await formatProfessionalInsight(
        minimalInsight as ProfessionalSynthesisResult,
        mockProfessionalContext
      )

      expect(results).toHaveLength(1)
      const insight = results[0]
      
      expect(insight.title).toBe('Basic Insight')
      expect(insight.actionItems).toEqual([])
      expect(insight.crossDomainConnections).toEqual([])
      expect(insight.sourceAttribution).toEqual([])
    })
  })

  describe('Formatted Content Structure', () => {
    it('should generate proper markdown content', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const markdown = results[0].formattedContent.markdown
      
      expect(markdown).toContain('# Microservices Architecture Transition Strategy')
      expect(markdown).toContain('## Executive Summary')
      expect(markdown).toContain('## Key Decisions')
      expect(markdown).toContain('## Trend Analysis')
      expect(markdown).toContain('## Action Items')
      expect(markdown).toContain('## Business Impact Score:')
    })

    it('should generate HTML content from markdown', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const html = results[0].formattedContent.html
      
      expect(html).toContain('<h1>Microservices Architecture Transition Strategy</h1>')
      expect(html).toContain('<h2>Executive Summary</h2>')
      expect(html).toContain('<strong>')
      expect(html).toContain('<li>')
    })

    it('should generate clean plain text content', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const plain = results[0].formattedContent.plain
      
      expect(plain).toContain('Microservices Architecture Transition Strategy')
      expect(plain).toContain('Key Decisions:')
      expect(plain).toContain('Action Items:')
      expect(plain).not.toContain('<')
      expect(plain).not.toContain('#')
      expect(plain).not.toContain('**')
    })
  })

  describe('Decision Point Extraction', () => {
    it('should extract decision points from professional impact', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const decisions = results[0].keyDecisions
      
      expect(decisions).toHaveLength(1)
      expect(decisions[0].title).toBe('Strategic Decision Point')
      expect(decisions[0].recommendation).toBe('Recommend phased approach starting with bounded contexts identification')
      expect(decisions[0].urgency).toBe('high') // Maps from high complexity
      expect(decisions[0].stakeholders).toContain('Senior Software Engineer')
      expect(decisions[0].stakeholders).toContain('Engineering Team')
    })

    it('should handle insights without decision support', async () => {
      const insightWithoutDecisions = {
        ...mockSynthesisResult,
        insights: [{
          ...mockSynthesisResult.insights[0],
          professionalImpact: {
            businessValue: 'Some value',
            implementationComplexity: 'low'
          }
        }]
      }

      const results = await formatProfessionalInsight(
        insightWithoutDecisions,
        mockProfessionalContext
      )

      expect(results[0].keyDecisions).toEqual([])
    })
  })

  describe('Trend Analysis Extraction', () => {
    it('should extract trends from insight tags', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const trends = results[0].trendAnalysis
      
      expect(trends).toHaveLength(1)
      expect(trends[0].trend).toBe('emerging-trend')
      expect(trends[0].direction).toBe('emerging')
      expect(trends[0].relevanceToRole).toContain('Senior Software Engineer')
      expect(trends[0].strategicImplications).toContain('Improved scalability and team autonomy, reduced deployment risks')
    })

    it('should handle insights without trend tags', async () => {
      const insightWithoutTrends = {
        ...mockSynthesisResult,
        insights: [{
          ...mockSynthesisResult.insights[0],
          tags: ['microservices', 'architecture'] // No trend-related tags
        }]
      }

      const results = await formatProfessionalInsight(
        insightWithoutTrends,
        mockProfessionalContext
      )

      expect(results[0].trendAnalysis).toEqual([])
    })
  })

  describe('Action Items Formatting', () => {
    it('should format action items with proper categorization', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const actionItems = results[0].actionItems
      
      expect(actionItems).toHaveLength(3)
      
      // Check first action item
      const workshopItem = actionItems.find(item => item.title.includes('domain modeling'))
      expect(workshopItem).toBeDefined()
      expect(workshopItem?.category).toBe('learning') // Contains "workshop" -> learning
      expect(workshopItem?.priority).toBe('high')
      expect(workshopItem?.timeframe).toBe('3-6 months') // High complexity mapping
      
      // Check implementation item
      const implementItem = actionItems.find(item => item.title.includes('service mesh'))
      expect(implementItem).toBeDefined()
      expect(implementItem?.category).toBe('tactical') // Contains "implement"
    })

    it('should assign proper priorities and timeframes', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const actionItems = results[0].actionItems
      
      actionItems.forEach(item => {
        expect(item.priority).toMatch(/^(low|medium|high|critical)$/)
        expect(item.complexity).toMatch(/^(low|medium|high)$/)
        expect(item.timeframe).toMatch(/^(immediate|short-term|medium-term|long-term)$/)
        expect(item.category).toMatch(/^(strategic|tactical|operational|learning)$/)
        expect(item.prerequisites).toBeInstanceOf(Array)
        expect(item.deliverables).toBeInstanceOf(Array)
        expect(item.successMetrics).toBeInstanceOf(Array)
      })
    })
  })

  describe('Business Impact Assessment', () => {
    it('should calculate business impact scores', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const businessImpact = results[0].businessImpact
      
      expect(businessImpact.overallScore).toBeGreaterThanOrEqual(0)
      expect(businessImpact.overallScore).toBeLessThanOrEqual(100)
      
      expect(businessImpact.categories).toHaveProperty('revenue')
      expect(businessImpact.categories).toHaveProperty('cost')
      expect(businessImpact.categories).toHaveProperty('efficiency')
      expect(businessImpact.categories).toHaveProperty('risk')
      expect(businessImpact.categories).toHaveProperty('innovation')
      
      expect(businessImpact.strategicAlignment).toBeGreaterThanOrEqual(0)
      expect(businessImpact.strategicAlignment).toBeLessThanOrEqual(100)
      expect(businessImpact.investmentRequired).toMatch(/^(low|medium|high)$/)
    })

    it('should provide impact explanations for each category', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const categories = results[0].businessImpact.categories
      
      Object.values(categories).forEach(category => {
        expect(category.score).toBeGreaterThanOrEqual(0)
        expect(category.score).toBeLessThanOrEqual(100)
        expect(category.explanation).toBeDefined()
        expect(category.explanation).toHaveLength.greaterThan(0)
      })
    })
  })

  describe('Implementation Guidance Generation', () => {
    it('should generate structured implementation phases', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const guidance = results[0].implementationGuidance
      
      expect(guidance.phases).toBeDefined()
      expect(guidance.phases.length).toBeGreaterThan(0)
      
      guidance.phases.forEach(phase => {
        expect(phase.name).toBeDefined()
        expect(phase.duration).toBeDefined()
        expect(phase.objectives).toBeInstanceOf(Array)
        expect(phase.deliverables).toBeInstanceOf(Array)
        expect(phase.dependencies).toBeInstanceOf(Array)
      })
    })

    it('should identify risk factors and mitigation strategies', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const guidance = results[0].implementationGuidance
      
      expect(guidance.risks).toBeInstanceOf(Array)
      guidance.risks.forEach(risk => {
        expect(risk.category).toMatch(/^(technical|business|organizational|external)$/)
        expect(risk.probability).toMatch(/^(low|medium|high)$/)
        expect(risk.impact).toMatch(/^(low|medium|high)$/)
        expect(risk.risk).toBeDefined()
        expect(risk.mitigation).toBeDefined()
      })
    })

    it('should provide resource requirements with skills mapping', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const guidance = results[0].implementationGuidance
      
      expect(guidance.resourceRequirements).toBeInstanceOf(Array)
      expect(guidance.resourceRequirements.length).toBeGreaterThan(0)
      
      const humanResources = guidance.resourceRequirements.filter(r => r.type === 'human')
      expect(humanResources.length).toBeGreaterThan(0)
      
      humanResources.forEach(resource => {
        expect(resource.skills).toBeInstanceOf(Array)
        expect(resource.quantity).toBeDefined()
        expect(resource.description).toBeDefined()
      })
    })
  })

  describe('Confidence Metrics Calculation', () => {
    it('should calculate comprehensive confidence metrics', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const confidence = results[0].confidence
      
      expect(confidence.overall).toBe(0.85) // From mock data
      expect(confidence.sourceQuality).toBeGreaterThan(0)
      expect(confidence.sourceQuality).toBeLessThanOrEqual(1)
      expect(confidence.analysisDepth).toBeGreaterThan(0)
      expect(confidence.analysisDepth).toBeLessThanOrEqual(1)
      expect(confidence.relevanceMatch).toBeGreaterThan(0)
      expect(confidence.relevanceMatch).toBeLessThanOrEqual(1)
      expect(confidence.recency).toBeGreaterThan(0)
      expect(confidence.recency).toBeLessThanOrEqual(1)
      expect(confidence.explanation).toBeDefined()
      expect(confidence.explanation).toContain('85%')
    })

    it('should handle missing confidence data gracefully', async () => {
      const insightWithoutConfidence = {
        ...mockSynthesisResult,
        confidenceScore: undefined,
        insights: [{
          ...mockSynthesisResult.insights[0],
          confidenceLevel: undefined
        }]
      }

      const results = await formatProfessionalInsight(
        insightWithoutConfidence,
        mockProfessionalContext
      )

      const confidence = results[0].confidence
      expect(confidence.overall).toBe(0.7) // Default fallback
    })
  })

  describe('Cross-Domain Connections', () => {
    it('should format cross-domain connections with relationship types', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const connections = results[0].crossDomainConnections
      
      expect(connections).toHaveLength(2)
      
      connections.forEach(connection => {
        expect(connection.domain).toBeDefined()
        expect(connection.relationship).toMatch(/^(synergistic|competitive|complementary|causal)$/)
        expect(connection.strength).toBeGreaterThan(0)
        expect(connection.strength).toBeLessThanOrEqual(1)
        expect(connection.description).toBeDefined()
        expect(connection.opportunities).toBeInstanceOf(Array)
        expect(connection.opportunities.length).toBeGreaterThan(0)
      })
    })

    it('should handle insights without cross-domain connections', async () => {
      const insightWithoutConnections = {
        ...mockSynthesisResult,
        insights: [{
          ...mockSynthesisResult.insights[0],
          crossDomainConnections: undefined
        }]
      }

      const results = await formatProfessionalInsight(
        insightWithoutConnections,
        mockProfessionalContext
      )

      expect(results[0].crossDomainConnections).toEqual([])
    })
  })

  describe('Source Attribution', () => {
    it('should format source attribution with credibility scores', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext,
        mockSourceData
      )

      const sources = results[0].sourceAttribution
      
      expect(sources).toHaveLength(2)
      
      sources.forEach((source, index) => {
        expect(source.title).toBe(mockSynthesisResult.insights[0].sources[index])
        expect(source.url).toBe(mockSourceData[index].url)
        expect(source.platform).toBe(mockSourceData[index].platform)
        expect(source.publishedAt).toEqual(mockSourceData[index].publishedAt)
        expect(source.credibilityScore).toBeGreaterThan(0)
        expect(source.credibilityScore).toBeLessThanOrEqual(1)
        expect(source.relevanceScore).toBeGreaterThan(0)
        expect(source.relevanceScore).toBeLessThanOrEqual(1)
      })
    })

    it('should handle missing source data gracefully', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
        // No source data provided
      )

      const sources = results[0].sourceAttribution
      
      sources.forEach(source => {
        expect(source.url).toBe('')
        expect(source.platform).toBe('unknown')
        expect(source.publishedAt).toBeInstanceOf(Date)
      })
    })
  })

  describe('Metadata Generation', () => {
    it('should generate comprehensive metadata', async () => {
      const results = await formatProfessionalInsight(
        mockSynthesisResult,
        mockProfessionalContext
      )

      const metadata = results[0].metadata
      
      expect(metadata.generatedAt).toBeInstanceOf(Date)
      expect(metadata.processingTime).toBeDefined()
      expect(metadata.aiModel).toBe('gpt-4o-mini')
      expect(metadata.contextProfile).toBe('Senior Software Engineer in Technology')
      expect(metadata.version).toBe('1.0')
      expect(metadata.tags).toEqual(['microservices', 'architecture', 'emerging-trend', 'scalability'])
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty synthesis results', async () => {
      const emptySynthesis = {
        insights: [],
        metadata: {
          processedAt: new Date(),
          totalInsights: 0,
          averageConfidence: 0,
          processingTimeMs: 0
        },
        confidenceScore: 0
      }

      const results = await formatProfessionalInsight(
        emptySynthesis,
        mockProfessionalContext
      )

      expect(results).toEqual([])
    })

    it('should handle malformed insight data without crashing', async () => {
      const malformedSynthesis = {
        insights: [
          {
            // Missing required fields like title and summary
            details: 'Some details'
          }
        ],
        metadata: {
          processedAt: new Date(),
          totalInsights: 1,
          averageConfidence: 0.5,
          processingTimeMs: 500
        },
        confidenceScore: 0.5
      }

      const results = await formatProfessionalInsight(
        malformedSynthesis as any,
        mockProfessionalContext
      )

      expect(results).toHaveLength(1)
      expect(results[0].title).toBeUndefined()
    })

    it('should handle extremely large insight data efficiently', async () => {
      const largeInsight = {
        ...mockSynthesisResult,
        insights: [
          {
            ...mockSynthesisResult.insights[0],
            actionItems: new Array(100).fill('Test action item'),
            tags: new Array(50).fill('test-tag'),
            crossDomainConnections: new Array(20).fill('test-domain')
          }
        ]
      }

      const startTime = Date.now()
      const results = await formatProfessionalInsight(
        largeInsight,
        mockProfessionalContext
      )
      const endTime = Date.now()

      expect(results).toHaveLength(1)
      expect(results[0].actionItems).toHaveLength(100)
      expect(results[0].crossDomainConnections).toHaveLength(20)
      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})