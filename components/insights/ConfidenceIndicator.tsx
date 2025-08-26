'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  BarChart3, 
  Shield, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react'

interface ConfidenceIndicatorProps {
  confidence: {
    overall: number // 0-1
    sourceQuality?: number // 0-1
    analysisDepth?: number // 0-1
    relevanceMatch?: number // 0-1
    recency?: number // 0-1
    explanation: string
  }
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
  className?: string
}

export default function ConfidenceIndicator({ 
  confidence, 
  size = 'md',
  showDetails = true,
  className = ''
}: ConfidenceIndicatorProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  const getConfidenceLevel = (score: number): {
    level: string
    color: string
    icon: React.ReactNode
    description: string
  } => {
    if (score >= 0.8) {
      return {
        level: 'High',
        color: 'text-green-600 bg-green-50',
        icon: <CheckCircle className="w-4 h-4" />,
        description: 'Very reliable insights with strong data backing'
      }
    } else if (score >= 0.6) {
      return {
        level: 'Medium',
        color: 'text-blue-600 bg-blue-50',
        icon: <BarChart3 className="w-4 h-4" />,
        description: 'Reliable insights with good data quality'
      }
    } else if (score >= 0.4) {
      return {
        level: 'Moderate',
        color: 'text-yellow-600 bg-yellow-50',
        icon: <AlertTriangle className="w-4 h-4" />,
        description: 'Useful insights but consider additional validation'
      }
    } else {
      return {
        level: 'Low',
        color: 'text-red-600 bg-red-50',
        icon: <AlertTriangle className="w-4 h-4" />,
        description: 'Limited confidence - seek additional data sources'
      }
    }
  }

  const confidenceInfo = getConfidenceLevel(confidence.overall)
  const percentage = Math.round(confidence.overall * 100)

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const progressSizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  if (size === 'sm') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center space-x-2 ${className}`}>
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${confidenceInfo.color}`}>
                {confidenceInfo.icon}
                <span className={sizeClasses[size]}>{percentage}%</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="max-w-xs">
              <p className="font-medium">{confidenceInfo.level} Confidence</p>
              <p className="text-sm text-gray-600">{confidence.explanation}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center space-x-2 ${sizeClasses[size]}`}>
            {confidenceInfo.icon}
            <span>Confidence Assessment</span>
          </CardTitle>
          <Badge className={confidenceInfo.color} variant="secondary">
            {confidenceInfo.level}
          </Badge>
        </div>
        <CardDescription className={sizeClasses[size]}>
          {confidenceInfo.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Confidence */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={`font-medium ${sizeClasses[size]}`}>Overall Confidence</span>
            <span className={`font-bold ${sizeClasses[size]}`}>{percentage}%</span>
          </div>
          <Progress value={percentage} className={`${progressSizes[size]} mb-2`} />
          <p className={`text-gray-600 ${sizeClasses[size]}`}>
            {confidence.explanation}
          </p>
        </div>

        {/* Detailed Breakdown */}
        {showDetails && (confidence.sourceQuality || confidence.analysisDepth || confidence.relevanceMatch || confidence.recency) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className={`font-medium ${sizeClasses[size]}`}>Confidence Factors</h4>
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="text-blue-600 hover:text-blue-800 text-xs flex items-center space-x-1"
              >
                <Info className="w-3 h-3" />
                <span>{showBreakdown ? 'Hide' : 'Show'} Details</span>
              </button>
            </div>

            {showBreakdown && (
              <div className="grid grid-cols-1 gap-3">
                {confidence.sourceQuality && (
                  <div className="flex items-center space-x-3">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className={`text-gray-700 ${sizeClasses[size]}`}>Source Quality</span>
                        <span className={`font-medium ${sizeClasses[size]}`}>
                          {Math.round(confidence.sourceQuality * 100)}%
                        </span>
                      </div>
                      <Progress value={confidence.sourceQuality * 100} className="h-1" />
                    </div>
                  </div>
                )}

                {confidence.analysisDepth && (
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className={`text-gray-700 ${sizeClasses[size]}`}>Analysis Depth</span>
                        <span className={`font-medium ${sizeClasses[size]}`}>
                          {Math.round(confidence.analysisDepth * 100)}%
                        </span>
                      </div>
                      <Progress value={confidence.analysisDepth * 100} className="h-1" />
                    </div>
                  </div>
                )}

                {confidence.relevanceMatch && (
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className={`text-gray-700 ${sizeClasses[size]}`}>Relevance Match</span>
                        <span className={`font-medium ${sizeClasses[size]}`}>
                          {Math.round(confidence.relevanceMatch * 100)}%
                        </span>
                      </div>
                      <Progress value={confidence.relevanceMatch * 100} className="h-1" />
                    </div>
                  </div>
                )}

                {confidence.recency && (
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className={`text-gray-700 ${sizeClasses[size]}`}>Data Recency</span>
                        <span className={`font-medium ${sizeClasses[size]}`}>
                          {Math.round(confidence.recency * 100)}%
                        </span>
                      </div>
                      <Progress value={confidence.recency * 100} className="h-1" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Confidence Interpretation */}
        <div className={`p-3 rounded-lg ${confidenceInfo.color.replace('text-', 'border-').replace('bg-', 'bg-opacity-20 border-')}`}>
          <div className="flex items-start space-x-2">
            {confidenceInfo.icon}
            <div>
              <p className={`font-medium ${sizeClasses[size]}`}>
                {confidenceInfo.level} Confidence Level
              </p>
              <p className={`text-gray-600 ${sizeClasses[size]} mt-1`}>
                {getConfidenceRecommendation(confidence.overall)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getConfidenceRecommendation(score: number): string {
  if (score >= 0.8) {
    return "These insights are highly reliable and can be acted upon with confidence."
  } else if (score >= 0.6) {
    return "These insights are reliable and provide good guidance for decision-making."
  } else if (score >= 0.4) {
    return "These insights are moderately reliable. Consider seeking additional validation before major decisions."
  } else {
    return "These insights have limited confidence. Gather more data before making significant decisions."
  }
}