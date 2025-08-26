'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  Target, 
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BarChart3
} from 'lucide-react'

interface ProfessionalInsightCardProps {
  insight: {
    id: string
    title: string
    executiveSummary: string
    keyDecisions: Array<{
      id: string
      title: string
      recommendation: string
      urgency: 'low' | 'medium' | 'high'
      impact: 'low' | 'medium' | 'high'
    }>
    actionItems: Array<{
      id: string
      title: string
      priority: 'low' | 'medium' | 'high' | 'critical'
      complexity: 'low' | 'medium' | 'high'
      timeframe: string
    }>
    businessImpact: {
      overallScore: number
      categories: {
        revenue: { score: number; explanation: string }
        efficiency: { score: number; explanation: string }
        innovation: { score: number; explanation: string }
      }
    }
    confidence: {
      overall: number
      explanation: string
    }
    crossDomainConnections: Array<{
      domain: string
      relationship: string
      description: string
    }>
  }
  onActionSelect?: (actionId: string) => void
  onDecisionSelect?: (decisionId: string) => void
  className?: string
}

export default function ProfessionalInsightCard({ 
  insight, 
  onActionSelect, 
  onDecisionSelect,
  className = '' 
}: ProfessionalInsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'high': return <AlertTriangle className="w-4 h-4" />
      case 'medium': return <Clock className="w-4 h-4" />
      default: return <CheckCircle className="w-4 h-4" />
    }
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold text-gray-900 mb-2">
              {insight.title}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {insight.executiveSummary}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Badge variant="outline" className="text-sm">
              Impact: {insight.businessImpact.overallScore}/100
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Confidence Indicator */}
        <div className="flex items-center space-x-3 mt-3">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-600">Confidence</span>
          </div>
          <Progress value={insight.confidence.overall * 100} className="flex-1 h-2" />
          <span className="text-sm font-medium text-gray-700">
            {Math.round(insight.confidence.overall * 100)}%
          </span>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="decisions">Decisions</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="impact">Impact</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {insight.keyDecisions.length}
                    </div>
                    <div className="text-sm text-blue-700">Key Decisions</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {insight.actionItems.length}
                    </div>
                    <div className="text-sm text-green-700">Action Items</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {insight.crossDomainConnections.length}
                    </div>
                    <div className="text-sm text-purple-700">Connections</div>
                  </div>
                </div>

                {/* Cross-Domain Connections */}
                {insight.crossDomainConnections.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Cross-Domain Connections
                    </h4>
                    <div className="space-y-2">
                      {insight.crossDomainConnections.map((connection, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium text-gray-900">{connection.domain}</span>
                            <span className="text-sm text-gray-600 ml-2">({connection.relationship})</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {connection.description.length > 30 
                              ? connection.description.substring(0, 30) + '...'
                              : connection.description}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="decisions" className="mt-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Strategic Decisions ({insight.keyDecisions.length})
                </h4>
                {insight.keyDecisions.map((decision) => (
                  <div 
                    key={decision.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onDecisionSelect?.(decision.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{decision.title}</h5>
                      <div className="flex space-x-1">
                        <Badge className={getUrgencyColor(decision.urgency)} variant="secondary">
                          {decision.urgency} urgency
                        </Badge>
                        <Badge className={getUrgencyColor(decision.impact)} variant="secondary">
                          {decision.impact} impact
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{decision.recommendation}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="actions" className="mt-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Action Items ({insight.actionItems.length})
                </h4>
                {insight.actionItems.map((action) => (
                  <div 
                    key={action.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onActionSelect?.(action.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getComplexityIcon(action.complexity)}
                        <h5 className="font-medium text-gray-900">{action.title}</h5>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getPriorityColor(action.priority)}>
                          {action.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {action.timeframe}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-3 h-3 mr-1" />
                      Complexity: {action.complexity}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="impact" className="mt-4">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Business Impact Analysis
                </h4>
                
                {/* Overall Score */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {insight.businessImpact.overallScore}/100
                    </div>
                    <div className="text-sm text-gray-600">Overall Impact Score</div>
                  </div>
                </div>

                {/* Impact Categories */}
                <div className="space-y-3">
                  {Object.entries(insight.businessImpact.categories).map(([category, data]) => (
                    <div key={category} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize text-gray-900">
                          {category}
                        </span>
                        <span className="text-sm font-bold text-gray-700">
                          {data.score}/100
                        </span>
                      </div>
                      <Progress value={data.score} className="mb-2 h-2" />
                      <p className="text-xs text-gray-600">{data.explanation}</p>
                    </div>
                  ))}
                </div>

                {/* Confidence Explanation */}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-1">Confidence Assessment</h5>
                  <p className="text-sm text-gray-600">{insight.confidence.explanation}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  )
}