import { ProfessionalSynthesisResult } from './openai'
import { ProfessionalContextProfile } from './professional-context'

/**
 * Professional Insight Formatting System
 * Transforms raw AI synthesis results into structured professional insights
 */

export interface FormattedProfessionalInsight {
  id: string
  title: string
  executiveSummary: string
  keyDecisions: DecisionPoint[]
  trendAnalysis: TrendInsight[]
  actionItems: ActionItem[]
  businessImpact: BusinessImpactAssessment
  implementationGuidance: ImplementationGuidance
  confidence: ConfidenceMetrics
  crossDomainConnections: CrossDomainConnection[]
  sourceAttribution: SourceAttribution[]
  formattedContent: {
    html: string
    markdown: string
    plain: string
  }
  metadata: InsightMetadata
}

export interface DecisionPoint {
  id: string
  title: string
  context: string
  options: string[]
  recommendation: string
  rationale: string
  urgency: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  stakeholders: string[]
}

export interface TrendInsight {
  id: string
  trend: string
  direction: 'emerging' | 'accelerating' | 'plateauing' | 'declining'
  timeframe: string
  relevanceToRole: string
  strategicImplications: string[]
  monitoringMetrics: string[]
}

export interface ActionItem {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  complexity: 'low' | 'medium' | 'high'
  timeframe: 'immediate' | 'short-term' | 'medium-term' | 'long-term'
  category: 'strategic' | 'tactical' | 'operational' | 'learning'
  prerequisites: string[]
  deliverables: string[]
  successMetrics: string[]
}

export interface BusinessImpactAssessment {
  overallScore: number // 0-100
  categories: {
    revenue: { score: number; explanation: string }
    cost: { score: number; explanation: string }
    efficiency: { score: number; explanation: string }
    risk: { score: number; explanation: string }
    innovation: { score: number; explanation: string }
  }
  timeToValue: string
  investmentRequired: 'low' | 'medium' | 'high'
  strategicAlignment: number // 0-100
}

export interface ImplementationGuidance {
  phases: ImplementationPhase[]
  risks: RiskFactor[]
  successFactors: string[]
  resourceRequirements: ResourceRequirement[]
}

export interface ImplementationPhase {
  name: string
  duration: string
  objectives: string[]
  deliverables: string[]
  dependencies: string[]
}

export interface RiskFactor {
  category: 'technical' | 'business' | 'organizational' | 'external'
  risk: string
  probability: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  mitigation: string
}

export interface ResourceRequirement {
  type: 'human' | 'technical' | 'financial' | 'time'
  description: string
  quantity: string
  skills?: string[]
}

export interface ConfidenceMetrics {
  overall: number // 0-1
  sourceQuality: number // 0-1
  analysisDepth: number // 0-1
  relevanceMatch: number // 0-1
  recency: number // 0-1
  explanation: string
}

export interface CrossDomainConnection {
  domain: string
  relationship: 'synergistic' | 'competitive' | 'complementary' | 'causal'
  strength: number // 0-1
  description: string
  opportunities: string[]
}

export interface SourceAttribution {
  title: string
  url: string
  platform: string
  publishedAt: Date
  credibilityScore: number // 0-1
  relevanceScore: number // 0-1
}

export interface InsightMetadata {
  generatedAt: Date
  processingTime: number
  aiModel: string
  contextProfile: string
  version: string
  tags: string[]
}

/**
 * Main formatting function - transforms synthesis results into professional insights
 */
export async function formatProfessionalInsight(
  synthesisResult: ProfessionalSynthesisResult,
  professionalContext: ProfessionalContextProfile,
  sourceData?: any[]
): Promise<FormattedProfessionalInsight[]> {
  const formattedInsights: FormattedProfessionalInsight[] = []

  for (const [index, insight] of synthesisResult.insights.entries()) {
    const formattedInsight = await formatSingleInsight(
      insight,
      synthesisResult,
      professionalContext,
      sourceData,
      index
    )
    formattedInsights.push(formattedInsight)
  }

  return formattedInsights
}

/**
 * Format a single insight with full professional structure
 */
async function formatSingleInsight(
  insight: any,
  synthesisResult: ProfessionalSynthesisResult,
  professionalContext: ProfessionalContextProfile,
  sourceData?: any[],
  index: number = 0
): Promise<FormattedProfessionalInsight> {
  const insightId = `insight-${Date.now()}-${index}`

  // Extract and format key decisions
  const keyDecisions = extractDecisionPoints(insight, professionalContext)

  // Analyze trends
  const trendAnalysis = extractTrendAnalysis(insight, professionalContext)

  // Structure action items
  const actionItems = formatActionItems(insight.actionItems || [], professionalContext)

  // Assess business impact
  const businessImpact = assessBusinessImpact(insight, professionalContext)

  // Create implementation guidance
  const implementationGuidance = generateImplementationGuidance(
    actionItems,
    insight.professionalImpact,
    professionalContext
  )

  // Calculate confidence metrics
  const confidence = calculateConfidenceMetrics(insight, synthesisResult)

  // Format cross-domain connections
  const crossDomainConnections = formatCrossDomainConnections(
    insight.crossDomainConnections || [],
    professionalContext
  )

  // Format source attribution
  const sourceAttribution = formatSourceAttribution(insight.sources || [], sourceData)

  // Generate formatted content in multiple formats
  const formattedContent = generateFormattedContent(
    insight,
    keyDecisions,
    trendAnalysis,
    actionItems,
    businessImpact,
    professionalContext
  )

  return {
    id: insightId,
    title: insight.title,
    executiveSummary: generateExecutiveSummary(insight, keyDecisions, businessImpact),
    keyDecisions,
    trendAnalysis,
    actionItems,
    businessImpact,
    implementationGuidance,
    confidence,
    crossDomainConnections,
    sourceAttribution,
    formattedContent,
    metadata: {
      generatedAt: new Date(),
      processingTime: 0, // Would be calculated in real implementation
      aiModel: 'gpt-4o-mini',
      contextProfile: `${professionalContext.role} in ${professionalContext.industry}`,
      version: '1.0',
      tags: insight.tags || []
    }
  }
}

/**
 * Extract decision points from insight content
 */
function extractDecisionPoints(
  insight: any,
  context: ProfessionalContextProfile
): DecisionPoint[] {
  const decisions: DecisionPoint[] = []

  // Parse decision-related content from AI insight
  if (insight.professionalImpact?.decisionSupport) {
    decisions.push({
      id: `decision-${Date.now()}`,
      title: 'Strategic Decision Point',
      context: insight.details,
      options: [], // Would be extracted from content analysis
      recommendation: insight.professionalImpact.decisionSupport,
      rationale: insight.summary,
      urgency: mapComplexityToUrgency(insight.professionalImpact.implementationComplexity),
      impact: 'medium', // Would be calculated based on business impact
      stakeholders: inferStakeholders(context)
    })
  }

  return decisions
}

/**
 * Extract trend analysis from insight content
 */
function extractTrendAnalysis(
  insight: any,
  context: ProfessionalContextProfile
): TrendInsight[] {
  const trends: TrendInsight[] = []

  // Extract trend keywords and patterns from tags and content
  const trendKeywords = insight.tags?.filter((tag: string) => 
    tag.includes('trend') || tag.includes('emerging') || tag.includes('growing')
  ) || []

  trendKeywords.forEach((trend: string, index: number) => {
    trends.push({
      id: `trend-${Date.now()}-${index}`,
      trend: trend,
      direction: 'emerging', // Would be analyzed from content
      timeframe: '6-12 months',
      relevanceToRole: `Relevant for ${context.role} in decision-making and strategy`,
      strategicImplications: [insight.professionalImpact?.businessValue || 'Strategic consideration'],
      monitoringMetrics: ['Market adoption rate', 'Industry discussion volume']
    })
  })

  return trends
}

/**
 * Format action items with professional structure
 */
function formatActionItems(
  actionItems: string[],
  context: ProfessionalContextProfile
): ActionItem[] {
  return actionItems.map((item, index) => ({
    id: `action-${Date.now()}-${index}`,
    title: item,
    description: `Execute: ${item}`,
    priority: index === 0 ? 'high' : 'medium',
    complexity: 'medium',
    timeframe: 'short-term',
    category: categorizeActionItem(item, context),
    prerequisites: [],
    deliverables: [item],
    successMetrics: [`Completion of ${item}`]
  }))
}

/**
 * Assess business impact with structured scoring
 */
function assessBusinessImpact(
  insight: any,
  context: ProfessionalContextProfile
): BusinessImpactAssessment {
  const baseScore = insight.relevanceScore * 100 || 50

  return {
    overallScore: Math.round(baseScore),
    categories: {
      revenue: { 
        score: Math.round(baseScore * 0.8), 
        explanation: 'Potential revenue impact based on insight relevance' 
      },
      cost: { 
        score: Math.round(baseScore * 0.7), 
        explanation: 'Cost optimization opportunities identified' 
      },
      efficiency: { 
        score: Math.round(baseScore * 0.9), 
        explanation: 'Process improvement potential' 
      },
      risk: { 
        score: Math.round(baseScore * 0.6), 
        explanation: 'Risk mitigation value' 
      },
      innovation: { 
        score: Math.round(baseScore * 0.8), 
        explanation: 'Innovation enablement potential' 
      }
    },
    timeToValue: mapComplexityToTimeframe(insight.professionalImpact?.implementationComplexity),
    investmentRequired: insight.professionalImpact?.implementationComplexity || 'medium',
    strategicAlignment: Math.round(baseScore * 0.85)
  }
}

/**
 * Generate implementation guidance
 */
function generateImplementationGuidance(
  actionItems: ActionItem[],
  professionalImpact: any,
  context: ProfessionalContextProfile
): ImplementationGuidance {
  const phases: ImplementationPhase[] = [
    {
      name: 'Assessment & Planning',
      duration: '1-2 weeks',
      objectives: ['Evaluate current state', 'Define success criteria'],
      deliverables: ['Assessment report', 'Implementation plan'],
      dependencies: []
    },
    {
      name: 'Implementation',
      duration: '2-4 weeks',
      objectives: actionItems.slice(0, 3).map(item => item.title),
      deliverables: actionItems.slice(0, 3).map(item => item.description),
      dependencies: ['Assessment & Planning']
    }
  ]

  const risks: RiskFactor[] = [
    {
      category: 'technical',
      risk: 'Implementation complexity higher than expected',
      probability: 'medium',
      impact: 'medium',
      mitigation: 'Start with pilot implementation and iterate'
    }
  ]

  return {
    phases,
    risks,
    successFactors: [
      'Clear stakeholder alignment',
      'Adequate resource allocation',
      'Regular progress monitoring'
    ],
    resourceRequirements: [
      {
        type: 'human',
        description: 'Project team',
        quantity: '2-3 people',
        skills: context.techStack.slice(0, 3)
      }
    ]
  }
}

/**
 * Calculate comprehensive confidence metrics
 */
function calculateConfidenceMetrics(
  insight: any,
  synthesisResult: ProfessionalSynthesisResult
): ConfidenceMetrics {
  const overall = insight.confidenceLevel || synthesisResult.confidenceScore || 0.7

  return {
    overall,
    sourceQuality: 0.8, // Would be calculated from source analysis
    analysisDepth: overall * 0.9,
    relevanceMatch: insight.relevanceScore || 0.8,
    recency: 0.8, // Would be calculated from source timestamps
    explanation: `Confidence based on ${Math.round(overall * 100)}% AI certainty and source quality analysis`
  }
}

/**
 * Format cross-domain connections
 */
function formatCrossDomainConnections(
  connections: string[],
  context: ProfessionalContextProfile
): CrossDomainConnection[] {
  return connections.map((connection, index) => ({
    domain: connection,
    relationship: 'synergistic' as const,
    strength: 0.7,
    description: `Connection between current insight and ${connection}`,
    opportunities: [`Leverage ${connection} for enhanced results`]
  }))
}

/**
 * Format source attribution
 */
function formatSourceAttribution(
  sources: string[],
  sourceData?: any[]
): SourceAttribution[] {
  return sources.map((source, index) => ({
    title: source,
    url: sourceData?.[index]?.url || '',
    platform: sourceData?.[index]?.platform || 'unknown',
    publishedAt: sourceData?.[index]?.publishedAt || new Date(),
    credibilityScore: 0.8,
    relevanceScore: 0.8
  }))
}

/**
 * Generate formatted content in multiple formats
 */
function generateFormattedContent(
  insight: any,
  keyDecisions: DecisionPoint[],
  trendAnalysis: TrendInsight[],
  actionItems: ActionItem[],
  businessImpact: BusinessImpactAssessment,
  context: ProfessionalContextProfile
): { html: string; markdown: string; plain: string } {
  const markdown = generateMarkdownContent(insight, keyDecisions, trendAnalysis, actionItems, businessImpact)
  const html = generateHtmlContent(markdown)
  const plain = generatePlainTextContent(insight, keyDecisions, actionItems)

  return { html, markdown, plain }
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(
  insight: any,
  keyDecisions: DecisionPoint[],
  businessImpact: BusinessImpactAssessment
): string {
  return `${insight.summary} This insight presents ${keyDecisions.length} key decision point(s) with an overall business impact score of ${businessImpact.overallScore}/100.`
}

// Helper functions
function mapComplexityToUrgency(complexity?: string): 'low' | 'medium' | 'high' {
  switch (complexity) {
    case 'high': return 'high'
    case 'low': return 'low'
    default: return 'medium'
  }
}

function mapComplexityToTimeframe(complexity?: string): string {
  switch (complexity) {
    case 'low': return '2-4 weeks'
    case 'high': return '3-6 months'
    default: return '6-8 weeks'
  }
}

function inferStakeholders(context: ProfessionalContextProfile): string[] {
  const stakeholders = [context.role]
  
  if (context.role.toLowerCase().includes('engineer')) {
    stakeholders.push('Engineering Team', 'Technical Lead')
  } else if (context.role.toLowerCase().includes('manager')) {
    stakeholders.push('Development Team', 'Product Manager', 'Executive Team')
  }
  
  return stakeholders
}

function categorizeActionItem(item: string, context: ProfessionalContextProfile): 'strategic' | 'tactical' | 'operational' | 'learning' {
  const itemLower = item.toLowerCase()
  
  if (itemLower.includes('learn') || itemLower.includes('research') || itemLower.includes('study')) {
    return 'learning'
  } else if (itemLower.includes('strategy') || itemLower.includes('plan') || itemLower.includes('roadmap')) {
    return 'strategic'
  } else if (itemLower.includes('implement') || itemLower.includes('deploy') || itemLower.includes('execute')) {
    return 'tactical'
  }
  
  return 'operational'
}

function generateMarkdownContent(
  insight: any,
  keyDecisions: DecisionPoint[],
  trendAnalysis: TrendInsight[],
  actionItems: ActionItem[],
  businessImpact: BusinessImpactAssessment
): string {
  return `# ${insight.title}

## Executive Summary
${insight.summary}

## Key Decisions
${keyDecisions.map(d => `- **${d.title}**: ${d.recommendation}`).join('\n')}

## Trend Analysis
${trendAnalysis.map(t => `- **${t.trend}**: ${t.direction} trend with ${t.relevanceToRole}`).join('\n')}

## Action Items
${actionItems.map(a => `- [ ] **${a.title}** (${a.priority} priority)`).join('\n')}

## Business Impact Score: ${businessImpact.overallScore}/100

${insight.details}
`
}

function generateHtmlContent(markdown: string): string {
  // Simple markdown to HTML conversion - in real implementation, use a proper markdown parser
  return markdown
    .replace(/# (.*)/g, '<h1>$1</h1>')
    .replace(/## (.*)/g, '<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/- (.*)/g, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
}

function generatePlainTextContent(
  insight: any,
  keyDecisions: DecisionPoint[],
  actionItems: ActionItem[]
): string {
  return `${insight.title}

${insight.summary}

Key Decisions:
${keyDecisions.map(d => `- ${d.title}: ${d.recommendation}`).join('\n')}

Action Items:
${actionItems.map(a => `- ${a.title}`).join('\n')}

${insight.details}
`
}