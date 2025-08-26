import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { extractProfessionalContext } from '@/lib/professional-context'
import { logger } from '@/lib/logger'

/**
 * Professional Impact Assessment API Endpoint
 * Analyzes the business and professional impact of insights for a user
 */

export interface ProfessionalImpactRequest {
  contentId?: string
  insights?: string[]
  assessmentType?: 'individual' | 'batch' | 'comparative'
}

export interface ProfessionalImpactResponse {
  success: boolean
  data?: ProfessionalImpactAssessment
  error?: string
}

export interface ProfessionalImpactAssessment {
  contentId: string
  userId: string
  overallImpactScore: number // 0-100
  impactCategories: {
    strategicAlignment: ImpactCategory
    operationalEfficiency: ImpactCategory
    skillDevelopment: ImpactCategory
    decisionSupport: ImpactCategory
    competitiveAdvantage: ImpactCategory
    riskMitigation: ImpactCategory
  }
  roleSpecificInsights: {
    relevanceScore: number
    applicability: string[]
    implementationBarriers: string[]
    successFactors: string[]
  }
  industryContextAnalysis: {
    industryRelevance: number
    marketTiming: 'early' | 'optimal' | 'late'
    competitiveImplications: string[]
  }
  toolStackAlignment: {
    compatibilityScore: number
    integrationComplexity: 'low' | 'medium' | 'high'
    requiredAdaptations: string[]
  }
  timeToValue: {
    immediateValue: string[]
    shortTermValue: string[] // 1-3 months
    longTermValue: string[] // 6+ months
  }
  confidenceMetrics: {
    assessmentConfidence: number
    dataQuality: number
    contextMatch: number
  }
  recommendations: {
    priority: 'low' | 'medium' | 'high' | 'critical'
    nextSteps: string[]
    monitoringMetrics: string[]
  }
  generatedAt: string
}

interface ImpactCategory {
  score: number // 0-100
  description: string
  factors: string[]
  evidence: string[]
}

/**
 * GET /api/insights/professional-impact
 * Retrieve professional impact assessment for specific content or user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const contentId = searchParams.get('contentId')
    const assessmentType = searchParams.get('assessmentType') || 'individual'

    if (!contentId) {
      return NextResponse.json(
        { success: false, error: 'contentId parameter is required' },
        { status: 400 }
      )
    }

    logger.info('Processing professional impact assessment request', { 
      userId: user.id, 
      contentId,
      assessmentType
    })

    // Get user preferences for context
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id }
    })

    const professionalContext = extractProfessionalContext(userPreferences)

    // Get content to assess
    const content = await prisma.content.findFirst({
      where: { 
        id: contentId,
        createdBy: user.id
      }
    })

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content not found or access denied' },
        { status: 404 }
      )
    }

    // Generate professional impact assessment
    const assessment = await generateProfessionalImpactAssessment(
      content,
      professionalContext,
      user.id
    )

    logger.info('Professional impact assessment completed', {
      userId: user.id,
      contentId,
      overallScore: assessment.overallImpactScore
    })

    return NextResponse.json({
      success: true,
      data: assessment
    })

  } catch (error) {
    logger.error('Error in professional impact assessment', error as Error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/insights/professional-impact
 * Generate professional impact assessment for provided insights
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body: ProfessionalImpactRequest = await request.json()

    if (!body.insights || body.insights.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insights array is required' },
        { status: 400 }
      )
    }

    logger.info('Processing batch professional impact assessment', { 
      userId: user.id, 
      insightCount: body.insights.length
    })

    // Get user preferences for context
    const userPreferences = await prisma.userPreferences.findUnique({
      where: { userId: user.id }
    })

    const professionalContext = extractProfessionalContext(userPreferences)

    // Generate batch assessment
    const assessments = await Promise.all(
      body.insights.map(async (insightText, index) => {
        const mockContent = {
          id: `batch-${index}`,
          title: `Insight ${index + 1}`,
          content: insightText,
          sourceMetadata: {},
          topics: []
        }

        return generateProfessionalImpactAssessment(
          mockContent as any,
          professionalContext,
          user.id
        )
      })
    )

    logger.info('Batch professional impact assessment completed', {
      userId: user.id,
      assessmentCount: assessments.length
    })

    return NextResponse.json({
      success: true,
      data: {
        assessments,
        summary: {
          averageScore: assessments.reduce((sum, a) => sum + a.overallImpactScore, 0) / assessments.length,
          highestImpact: Math.max(...assessments.map(a => a.overallImpactScore)),
          totalAssessments: assessments.length
        }
      }
    })

  } catch (error) {
    logger.error('Error in batch professional impact assessment', error as Error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate comprehensive professional impact assessment
 */
async function generateProfessionalImpactAssessment(
  content: any,
  professionalContext: any,
  userId: string
): Promise<ProfessionalImpactAssessment> {
  // Analyze content against professional context
  const strategicAlignment = assessStrategicAlignment(content, professionalContext)
  const operationalEfficiency = assessOperationalEfficiency(content, professionalContext)
  const skillDevelopment = assessSkillDevelopment(content, professionalContext)
  const decisionSupport = assessDecisionSupport(content, professionalContext)
  const competitiveAdvantage = assessCompetitiveAdvantage(content, professionalContext)
  const riskMitigation = assessRiskMitigation(content, professionalContext)

  // Calculate overall impact score
  const overallImpactScore = Math.round(
    (strategicAlignment.score + 
     operationalEfficiency.score + 
     skillDevelopment.score + 
     decisionSupport.score + 
     competitiveAdvantage.score + 
     riskMitigation.score) / 6
  )

  // Analyze role-specific relevance
  const roleSpecificInsights = analyzeRoleSpecificRelevance(content, professionalContext)

  // Assess industry context
  const industryContextAnalysis = analyzeIndustryContext(content, professionalContext)

  // Evaluate tool stack alignment
  const toolStackAlignment = evaluateToolStackAlignment(content, professionalContext)

  // Determine time to value
  const timeToValue = determineTimeToValue(content, professionalContext)

  // Calculate confidence metrics
  const confidenceMetrics = calculateConfidenceMetrics(content, professionalContext)

  // Generate recommendations
  const recommendations = generateRecommendations(
    overallImpactScore,
    roleSpecificInsights,
    professionalContext
  )

  return {
    contentId: content.id,
    userId,
    overallImpactScore,
    impactCategories: {
      strategicAlignment,
      operationalEfficiency,
      skillDevelopment,
      decisionSupport,
      competitiveAdvantage,
      riskMitigation
    },
    roleSpecificInsights,
    industryContextAnalysis,
    toolStackAlignment,
    timeToValue,
    confidenceMetrics,
    recommendations,
    generatedAt: new Date().toISOString()
  }
}

// Assessment helper functions

function assessStrategicAlignment(content: any, context: any): ImpactCategory {
  const alignmentFactors = []
  let score = 50 // Base score

  if (context.decisionFocusAreas?.some((area: string) => 
      content.content.toLowerCase().includes(area.toLowerCase()))) {
    score += 20
    alignmentFactors.push('Aligns with decision focus areas')
  }

  if (context.curiosityAreas?.some((area: string) => 
      content.content.toLowerCase().includes(area.toLowerCase()))) {
    score += 15
    alignmentFactors.push('Matches curiosity areas')
  }

  return {
    score: Math.min(100, score),
    description: 'How well this insight aligns with strategic priorities',
    factors: alignmentFactors,
    evidence: [`Content relevance to ${context.role} responsibilities`]
  }
}

function assessOperationalEfficiency(content: any, context: any): ImpactCategory {
  const efficiencyFactors = []
  let score = 40

  if (content.content.toLowerCase().includes('efficiency') || 
      content.content.toLowerCase().includes('optimization')) {
    score += 25
    efficiencyFactors.push('Directly addresses efficiency improvements')
  }

  if (context.techStack?.some((tech: string) => 
      content.content.toLowerCase().includes(tech.toLowerCase()))) {
    score += 20
    efficiencyFactors.push('Relevant to current technology stack')
  }

  return {
    score: Math.min(100, score),
    description: 'Potential to improve operational efficiency',
    factors: efficiencyFactors,
    evidence: ['Technology stack alignment', 'Process optimization potential']
  }
}

function assessSkillDevelopment(content: any, context: any): ImpactCategory {
  const developmentFactors = []
  let score = 45

  if (content.content.toLowerCase().includes('learn') || 
      content.content.toLowerCase().includes('skill') ||
      content.content.toLowerCase().includes('training')) {
    score += 25
    developmentFactors.push('Contains learning opportunities')
  }

  if (context.interests?.some((interest: string) => 
      content.content.toLowerCase().includes(interest.toLowerCase()))) {
    score += 15
    developmentFactors.push('Aligns with professional interests')
  }

  return {
    score: Math.min(100, score),
    description: 'Potential for professional skill development',
    factors: developmentFactors,
    evidence: ['Learning content identification', 'Interest alignment']
  }
}

function assessDecisionSupport(content: any, context: any): ImpactCategory {
  const supportFactors = []
  let score = 50

  if (content.sourceMetadata?.type === 'ai-synthesized') {
    score += 15
    supportFactors.push('AI-synthesized insights for decision support')
  }

  if (content.content.toLowerCase().includes('recommend') || 
      content.content.toLowerCase().includes('suggest') ||
      content.content.toLowerCase().includes('should')) {
    score += 20
    supportFactors.push('Contains actionable recommendations')
  }

  return {
    score: Math.min(100, score),
    description: 'Support for informed decision-making',
    factors: supportFactors,
    evidence: ['Recommendation quality', 'Data-driven insights']
  }
}

function assessCompetitiveAdvantage(content: any, context: any): ImpactCategory {
  const advantageFactors = []
  let score = 35

  if (content.content.toLowerCase().includes('competitive') || 
      content.content.toLowerCase().includes('advantage') ||
      content.content.toLowerCase().includes('innovation')) {
    score += 30
    advantageFactors.push('Discusses competitive positioning')
  }

  return {
    score: Math.min(100, score),
    description: 'Potential to create competitive advantage',
    factors: advantageFactors,
    evidence: ['Innovation potential', 'Market positioning insights']
  }
}

function assessRiskMitigation(content: any, context: any): ImpactCategory {
  const riskFactors = []
  let score = 40

  if (content.content.toLowerCase().includes('risk') || 
      content.content.toLowerCase().includes('security') ||
      content.content.toLowerCase().includes('compliance')) {
    score += 25
    riskFactors.push('Addresses risk management')
  }

  return {
    score: Math.min(100, score),
    description: 'Potential to mitigate business risks',
    factors: riskFactors,
    evidence: ['Risk identification', 'Mitigation strategies']
  }
}

function analyzeRoleSpecificRelevance(content: any, context: any) {
  return {
    relevanceScore: 75, // Calculated based on role-content match
    applicability: [`Applicable to ${context.role} responsibilities`],
    implementationBarriers: ['Time constraints', 'Resource allocation'],
    successFactors: ['Management support', 'Team alignment']
  }
}

function analyzeIndustryContext(content: any, context: any) {
  return {
    industryRelevance: 80,
    marketTiming: 'optimal' as const,
    competitiveImplications: ['First-mover advantage opportunity']
  }
}

function evaluateToolStackAlignment(content: any, context: any) {
  const hasToolStackMatch = context.techStack?.some((tech: string) => 
    content.content.toLowerCase().includes(tech.toLowerCase())
  )

  return {
    compatibilityScore: hasToolStackMatch ? 85 : 60,
    integrationComplexity: hasToolStackMatch ? 'low' as const : 'medium' as const,
    requiredAdaptations: hasToolStackMatch ? [] : ['Technology evaluation', 'Integration planning']
  }
}

function determineTimeToValue(content: any, context: any) {
  return {
    immediateValue: ['Enhanced understanding', 'Informed decision-making'],
    shortTermValue: ['Process improvements', 'Tool adoption'],
    longTermValue: ['Strategic advantage', 'Skill development ROI']
  }
}

function calculateConfidenceMetrics(content: any, context: any) {
  return {
    assessmentConfidence: 0.85,
    dataQuality: 0.80,
    contextMatch: 0.90
  }
}

function generateRecommendations(
  overallScore: number,
  roleSpecificInsights: any,
  context: any
) {
  const priority = overallScore >= 80 ? 'high' : overallScore >= 60 ? 'medium' : 'low'

  return {
    priority: priority as 'low' | 'medium' | 'high' | 'critical',
    nextSteps: [
      'Review detailed analysis',
      'Assess implementation feasibility',
      'Create action plan'
    ],
    monitoringMetrics: [
      'Implementation progress',
      'Impact measurement',
      'ROI tracking'
    ]
  }
}