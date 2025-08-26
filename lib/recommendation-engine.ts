import { ProfessionalSynthesisResult } from './openai'
import { ProfessionalContextProfile } from './professional-context'
import { CuriosityExploration } from './curiosity-exploration'
import { CrossDomainConnection } from './content-relationships'
import { FormattedProfessionalInsight } from './insight-formatting'

/**
 * Actionable Recommendation Generation Engine
 * Consolidates insights from multiple sources to generate prioritized, actionable recommendations
 */

export interface ActionableRecommendation {
  id: string
  type: 'immediate' | 'short-term' | 'long-term' | 'strategic'
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: 'skill-development' | 'strategic-decision' | 'implementation' | 'exploration' | 'networking' | 'process-improvement'
  title: string
  description: string
  rationale: string
  expectedOutcome: string
  successMetrics: string[]
  timeframe: string
  complexity: 'low' | 'medium' | 'high'
  dependencies: string[]
  resources: RecommendationResource[]
  risks: string[]
  followUpActions: string[]
  confidenceLevel: number // 0-1
  professionalImpact: number // 0-1
  generatedFrom: string[] // Source insights that led to this recommendation
}

export interface RecommendationResource {
  type: 'time' | 'financial' | 'human' | 'technical' | 'educational'
  description: string
  estimatedAmount: string
  criticalLevel: 'nice-to-have' | 'helpful' | 'required' | 'critical'
}

export interface RecommendationSuite {
  userId: string
  generatedAt: Date
  recommendations: ActionableRecommendation[]
  prioritizedPlan: {
    phase1: ActionableRecommendation[] // Next 30 days
    phase2: ActionableRecommendation[] // 2-3 months
    phase3: ActionableRecommendation[] // 6+ months
  }
  summary: {
    totalRecommendations: number
    criticalActions: number
    estimatedTimeInvestment: string
    expectedOutcomes: string[]
    keyFocusAreas: string[]
  }
  metadata: {
    sourcesAnalyzed: number
    confidenceScore: number
    lastUpdated: Date
  }
}

/**
 * Generate comprehensive actionable recommendations
 */
export async function generateActionableRecommendations(
  userId: string,
  sources: {
    synthesisResults?: ProfessionalSynthesisResult[]
    professionalContext?: ProfessionalContextProfile
    curiosityExplorations?: CuriosityExploration[]
    crossDomainConnections?: CrossDomainConnection[]
    formattedInsights?: FormattedProfessionalInsight[]
    impactAssessments?: any[]
  }
): Promise<RecommendationSuite> {
  const recommendations: ActionableRecommendation[] = []

  // Extract recommendations from each source
  if (sources.synthesisResults) {
    recommendations.push(...extractSynthesisRecommendations(sources.synthesisResults, sources.professionalContext))
  }

  if (sources.curiosityExplorations) {
    recommendations.push(...extractCuriosityRecommendations(sources.curiosityExplorations, sources.professionalContext))
  }

  if (sources.crossDomainConnections) {
    recommendations.push(...extractCrossDomainRecommendations(sources.crossDomainConnections, sources.professionalContext))
  }

  if (sources.formattedInsights) {
    recommendations.push(...extractInsightRecommendations(sources.formattedInsights, sources.professionalContext))
  }

  if (sources.impactAssessments) {
    recommendations.push(...extractImpactRecommendations(sources.impactAssessments, sources.professionalContext))
  }

  // Deduplicate and merge similar recommendations
  const consolidatedRecommendations = consolidateRecommendations(recommendations)

  // Prioritize recommendations
  const prioritizedRecommendations = prioritizeRecommendations(consolidatedRecommendations, sources.professionalContext)

  // Create phased implementation plan
  const prioritizedPlan = createPhasedPlan(prioritizedRecommendations)

  // Generate summary
  const summary = generateRecommendationSummary(prioritizedRecommendations)

  return {
    userId,
    generatedAt: new Date(),
    recommendations: prioritizedRecommendations,
    prioritizedPlan,
    summary,
    metadata: {
      sourcesAnalyzed: Object.values(sources).filter(s => s && Array.isArray(s) ? s.length > 0 : s).length,
      confidenceScore: calculateOverallConfidence(prioritizedRecommendations),
      lastUpdated: new Date()
    }
  }
}

/**
 * Extract recommendations from synthesis results
 */
function extractSynthesisRecommendations(
  synthesisResults: ProfessionalSynthesisResult[],
  context?: ProfessionalContextProfile
): ActionableRecommendation[] {
  const recommendations: ActionableRecommendation[] = []

  synthesisResults.forEach((result, index) => {
    // Extract from professional recommendations
    result.professionalRecommendations?.forEach((rec, recIndex) => {
      recommendations.push({
        id: `synthesis-${index}-${recIndex}`,
        type: 'short-term',
        priority: 'medium',
        category: 'strategic-decision',
        title: rec,
        description: `Implement strategic recommendation: ${rec}`,
        rationale: 'Derived from AI synthesis of professional content',
        expectedOutcome: 'Enhanced strategic positioning and decision-making',
        successMetrics: ['Implementation completion', 'Strategic alignment improvement'],
        timeframe: '4-6 weeks',
        complexity: 'medium',
        dependencies: ['Stakeholder alignment', 'Resource allocation'],
        resources: [
          {
            type: 'time',
            description: 'Implementation time',
            estimatedAmount: '10-15 hours',
            criticalLevel: 'required'
          }
        ],
        risks: ['Implementation complexity', 'Change resistance'],
        followUpActions: ['Monitor implementation progress', 'Assess impact'],
        confidenceLevel: result.confidenceScore || 0.8,
        professionalImpact: 0.7,
        generatedFrom: [`synthesis-result-${index}`]
      })
    })

    // Extract from insights action items
    result.insights.forEach((insight, insightIndex) => {
      insight.actionItems?.forEach((action, actionIndex) => {
        recommendations.push({
          id: `synthesis-action-${index}-${insightIndex}-${actionIndex}`,
          type: 'immediate',
          priority: 'high',
          category: 'implementation',
          title: action,
          description: `Execute action item: ${action}`,
          rationale: `Based on professional insight: ${insight.title}`,
          expectedOutcome: 'Direct professional value and skill development',
          successMetrics: ['Action completion', 'Skill improvement'],
          timeframe: '1-2 weeks',
          complexity: insight.professionalImpact?.implementationComplexity || 'medium',
          dependencies: [],
          resources: [
            {
              type: 'time',
              description: 'Execution time',
              estimatedAmount: '5-10 hours',
              criticalLevel: 'required'
            }
          ],
          risks: ['Time constraints'],
          followUpActions: ['Validate results', 'Apply learnings'],
          confidenceLevel: insight.confidenceLevel || 0.8,
          professionalImpact: insight.relevanceScore || 0.8,
          generatedFrom: [`synthesis-insight-${index}-${insightIndex}`]
        })
      })
    })
  })

  return recommendations
}

/**
 * Extract recommendations from curiosity explorations
 */
function extractCuriosityRecommendations(
  explorations: CuriosityExploration[],
  context?: ProfessionalContextProfile
): ActionableRecommendation[] {
  const recommendations: ActionableRecommendation[] = []

  explorations.forEach((exploration, index) => {
    // Extract from actionable insights
    exploration.exploration.actionableInsights.forEach((insight, insightIndex) => {
      recommendations.push({
        id: `curiosity-${index}-${insightIndex}`,
        type: insight.type,
        priority: insight.riskLevel === 'high' ? 'low' : 'medium',
        category: 'skill-development',
        title: insight.action,
        description: insight.rationale,
        rationale: `Curiosity exploration of ${exploration.topic}`,
        expectedOutcome: insight.expectedOutcome,
        successMetrics: insight.successMetrics,
        timeframe: getTimeframeFromType(insight.type),
        complexity: 'medium',
        dependencies: insight.dependencies,
        resources: [
          {
            type: 'educational',
            description: 'Learning resources',
            estimatedAmount: '15-25 hours',
            criticalLevel: 'required'
          }
        ],
        risks: [insight.riskLevel === 'high' ? 'High complexity' : 'Moderate learning curve'],
        followUpActions: ['Track learning progress', 'Apply knowledge'],
        confidenceLevel: exploration.metadata.confidenceLevel,
        professionalImpact: exploration.exploration.professionalRelevance.roleAlignment,
        generatedFrom: [`curiosity-exploration-${index}`]
      })
    })

    // Extract from learning path
    exploration.exploration.learningPath.phases.forEach((phase, phaseIndex) => {
      recommendations.push({
        id: `learning-${index}-${phaseIndex}`,
        type: 'long-term',
        priority: 'medium',
        category: 'skill-development',
        title: `Complete ${phase.name} learning phase`,
        description: phase.objectives.join(', '),
        rationale: `Structured learning path for ${exploration.topic}`,
        expectedOutcome: 'Enhanced expertise and professional capability',
        successMetrics: phase.milestones,
        timeframe: phase.duration,
        complexity: 'medium',
        dependencies: phase.dependencies,
        resources: phase.resources.map(r => ({
          type: 'educational' as const,
          description: r.title,
          estimatedAmount: r.estimatedTime,
          criticalLevel: 'helpful' as const
        })),
        risks: ['Time commitment', 'Learning complexity'],
        followUpActions: ['Apply learned skills', 'Seek certification'],
        confidenceLevel: exploration.metadata.confidenceLevel,
        professionalImpact: exploration.exploration.professionalRelevance.roleAlignment,
        generatedFrom: [`curiosity-learning-${index}`]
      })
    })
  })

  return recommendations
}

/**
 * Extract recommendations from cross-domain connections
 */
function extractCrossDomainRecommendations(
  connections: CrossDomainConnection[],
  context?: ProfessionalContextProfile
): ActionableRecommendation[] {
  const recommendations: ActionableRecommendation[] = []

  connections.forEach((connection, index) => {
    // Extract from professional opportunities
    connection.professionalOpportunities.forEach((opportunity, oppIndex) => {
      recommendations.push({
        id: `cross-domain-${index}-${oppIndex}`,
        type: 'strategic',
        priority: connection.connectionStrength > 0.8 ? 'high' : 'medium',
        category: 'strategic-decision',
        title: `Pursue ${opportunity}`,
        description: `Leverage cross-domain connection between ${connection.primaryDomain} and ${connection.secondaryDomain}`,
        rationale: `Strong ${connection.connectionType} relationship identified`,
        expectedOutcome: 'Enhanced professional positioning and market differentiation',
        successMetrics: ['Cross-domain project completion', 'Recognition as multi-domain expert'],
        timeframe: '3-6 months',
        complexity: 'high',
        dependencies: ['Domain knowledge integration', 'Opportunity identification'],
        resources: [
          {
            type: 'time',
            description: 'Cross-domain integration work',
            estimatedAmount: '20-30 hours',
            criticalLevel: 'required'
          }
        ],
        risks: connection.riskFactors,
        followUpActions: ['Identify specific opportunities', 'Build cross-domain portfolio'],
        confidenceLevel: connection.confidence,
        professionalImpact: connection.connectionStrength,
        generatedFrom: [`cross-domain-${index}`]
      })
    })

    // Extract from implementation synergies
    connection.implementationSynergies.forEach((synergy, synIndex) => {
      recommendations.push({
        id: `synergy-${index}-${synIndex}`,
        type: 'short-term',
        priority: 'medium',
        category: 'implementation',
        title: `Implement ${synergy}`,
        description: `Apply synergy between ${connection.primaryDomain} and ${connection.secondaryDomain} domains`,
        rationale: 'Cross-domain synergy opportunity identified',
        expectedOutcome: 'Improved efficiency and integrated approach',
        successMetrics: ['Synergy implementation', 'Efficiency gains'],
        timeframe: '2-4 weeks',
        complexity: 'medium',
        dependencies: [],
        resources: [
          {
            type: 'time',
            description: 'Implementation effort',
            estimatedAmount: '8-12 hours',
            criticalLevel: 'required'
          }
        ],
        risks: ['Integration complexity'],
        followUpActions: ['Monitor synergy benefits', 'Scale successful approaches'],
        confidenceLevel: connection.confidence,
        professionalImpact: connection.connectionStrength * 0.8,
        generatedFrom: [`synergy-${index}`]
      })
    })
  })

  return recommendations
}

/**
 * Extract recommendations from formatted insights
 */
function extractInsightRecommendations(
  insights: FormattedProfessionalInsight[],
  context?: ProfessionalContextProfile
): ActionableRecommendation[] {
  const recommendations: ActionableRecommendation[] = []

  insights.forEach((insight, index) => {
    insight.actionItems.forEach((actionItem, actionIndex) => {
      recommendations.push({
        id: `insight-${index}-${actionIndex}`,
        type: actionItem.timeframe === 'immediate' ? 'immediate' : 'short-term',
        priority: actionItem.priority,
        category: actionItem.category,
        title: actionItem.title,
        description: actionItem.description,
        rationale: `Professional insight: ${insight.title}`,
        expectedOutcome: actionItem.expectedOutcome || 'Professional improvement',
        successMetrics: actionItem.successMetrics,
        timeframe: getTimeframeString(actionItem.timeframe),
        complexity: actionItem.complexity,
        dependencies: actionItem.prerequisites,
        resources: [
          {
            type: 'time',
            description: 'Implementation time',
            estimatedAmount: '5-15 hours',
            criticalLevel: 'required'
          }
        ],
        risks: ['Implementation challenges'],
        followUpActions: ['Monitor progress', 'Measure success'],
        confidenceLevel: insight.confidence.overall,
        professionalImpact: insight.businessImpact.overallScore / 100,
        generatedFrom: [`formatted-insight-${index}`]
      })
    })
  })

  return recommendations
}

/**
 * Extract recommendations from impact assessments
 */
function extractImpactRecommendations(
  assessments: any[],
  context?: ProfessionalContextProfile
): ActionableRecommendation[] {
  const recommendations: ActionableRecommendation[] = []

  assessments.forEach((assessment, index) => {
    assessment.recommendations?.nextSteps?.forEach((step: string, stepIndex: number) => {
      recommendations.push({
        id: `impact-${index}-${stepIndex}`,
        type: 'short-term',
        priority: assessment.recommendations.priority || 'medium',
        category: 'strategic-decision',
        title: step,
        description: `Next step based on professional impact assessment`,
        rationale: 'Professional impact analysis recommendation',
        expectedOutcome: 'Enhanced professional impact and value',
        successMetrics: assessment.recommendations.monitoringMetrics || ['Progress tracking'],
        timeframe: '2-4 weeks',
        complexity: 'medium',
        dependencies: ['Impact assessment review'],
        resources: [
          {
            type: 'time',
            description: 'Implementation time',
            estimatedAmount: '10-20 hours',
            criticalLevel: 'required'
          }
        ],
        risks: ['Execution challenges'],
        followUpActions: ['Track implementation', 'Measure impact'],
        confidenceLevel: assessment.confidenceMetrics?.assessmentConfidence || 0.8,
        professionalImpact: assessment.overallImpactScore / 100,
        generatedFrom: [`impact-assessment-${index}`]
      })
    })
  })

  return recommendations
}

/**
 * Consolidate and deduplicate similar recommendations
 */
function consolidateRecommendations(recommendations: ActionableRecommendation[]): ActionableRecommendation[] {
  const consolidated = new Map<string, ActionableRecommendation>()
  
  recommendations.forEach(rec => {
    const similarKey = `${rec.category}-${rec.title.toLowerCase().substring(0, 20)}`
    
    if (consolidated.has(similarKey)) {
      const existing = consolidated.get(similarKey)!
      // Merge similar recommendations, keeping the higher priority one
      if (getPriorityScore(rec.priority) > getPriorityScore(existing.priority)) {
        existing.generatedFrom.push(...rec.generatedFrom)
        existing.confidenceLevel = Math.max(existing.confidenceLevel, rec.confidenceLevel)
        existing.professionalImpact = Math.max(existing.professionalImpact, rec.professionalImpact)
      }
    } else {
      consolidated.set(similarKey, { ...rec })
    }
  })
  
  return Array.from(consolidated.values())
}

/**
 * Prioritize recommendations based on multiple factors
 */
function prioritizeRecommendations(
  recommendations: ActionableRecommendation[],
  context?: ProfessionalContextProfile
): ActionableRecommendation[] {
  return recommendations
    .map(rec => ({
      ...rec,
      priorityScore: calculatePriorityScore(rec, context)
    }))
    .sort((a, b) => (b as any).priorityScore - (a as any).priorityScore)
    .map(({ priorityScore, ...rec }) => rec)
}

/**
 * Create phased implementation plan
 */
function createPhasedPlan(recommendations: ActionableRecommendation[]): {
  phase1: ActionableRecommendation[]
  phase2: ActionableRecommendation[]
  phase3: ActionableRecommendation[]
} {
  const immediate = recommendations.filter(r => r.type === 'immediate' || r.priority === 'critical')
  const shortTerm = recommendations.filter(r => r.type === 'short-term' && r.priority === 'high')
  const longTerm = recommendations.filter(r => r.type === 'long-term' || r.type === 'strategic')

  return {
    phase1: immediate.slice(0, 5), // Top 5 immediate actions
    phase2: shortTerm.slice(0, 8), // Top 8 short-term actions
    phase3: longTerm.slice(0, 10) // Top 10 long-term actions
  }
}

/**
 * Generate recommendation summary
 */
function generateRecommendationSummary(recommendations: ActionableRecommendation[]): {
  totalRecommendations: number
  criticalActions: number
  estimatedTimeInvestment: string
  expectedOutcomes: string[]
  keyFocusAreas: string[]
} {
  const criticalActions = recommendations.filter(r => r.priority === 'critical').length
  
  const categories = recommendations.reduce((acc, rec) => {
    acc[rec.category] = (acc[rec.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category.replace('-', ' '))

  const outcomes = [...new Set(recommendations.map(r => r.expectedOutcome))].slice(0, 5)

  return {
    totalRecommendations: recommendations.length,
    criticalActions,
    estimatedTimeInvestment: '2-4 hours per week for optimal progress',
    expectedOutcomes: outcomes,
    keyFocusAreas: topCategories
  }
}

// Helper functions
function getTimeframeFromType(type: string): string {
  switch (type) {
    case 'immediate': return '1-2 weeks'
    case 'short-term': return '1-3 months'
    case 'long-term': return '6+ months'
    default: return '2-4 weeks'
  }
}

function getTimeframeString(timeframe: string): string {
  switch (timeframe) {
    case 'immediate': return '1-2 weeks'
    case 'short-term': return '1-3 months'
    case 'medium-term': return '3-6 months'
    case 'long-term': return '6+ months'
    default: return '2-4 weeks'
  }
}

function getPriorityScore(priority: string): number {
  switch (priority) {
    case 'critical': return 4
    case 'high': return 3
    case 'medium': return 2
    case 'low': return 1
    default: return 2
  }
}

function calculatePriorityScore(rec: ActionableRecommendation, context?: ProfessionalContextProfile): number {
  let score = 0
  
  // Base priority score
  score += getPriorityScore(rec.priority) * 25
  
  // Professional impact weight
  score += rec.professionalImpact * 30
  
  // Confidence level weight
  score += rec.confidenceLevel * 20
  
  // Type urgency weight
  const typeWeights = { immediate: 15, 'short-term': 10, 'long-term': 5, strategic: 8 }
  score += typeWeights[rec.type] || 5
  
  // Complexity factor (easier = higher priority for quick wins)
  const complexityWeights = { low: 10, medium: 5, high: 0 }
  score += complexityWeights[rec.complexity] || 5
  
  return score
}

function calculateOverallConfidence(recommendations: ActionableRecommendation[]): number {
  if (recommendations.length === 0) return 0
  
  return recommendations.reduce((sum, rec) => sum + rec.confidenceLevel, 0) / recommendations.length
}