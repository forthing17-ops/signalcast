'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Star,
  Calendar,
  Target
} from 'lucide-react'

interface ActionItem {
  id: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  complexity: 'low' | 'medium' | 'high'
  timeframe: string
  category?: 'strategic' | 'tactical' | 'operational' | 'learning'
  completed?: boolean
  expectedOutcome?: string
  successMetrics?: string[]
}

interface ActionItemsListProps {
  actionItems: ActionItem[]
  onActionComplete?: (actionId: string) => void
  onActionSelect?: (actionId: string) => void
  showCompleted?: boolean
  className?: string
}

export default function ActionItemsList({ 
  actionItems, 
  onActionComplete,
  onActionSelect,
  showCompleted = true,
  className = ''
}: ActionItemsListProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [sortBy, setSortBy] = useState<'priority' | 'timeframe' | 'complexity'>('priority')

  const getPriorityScore = (priority: string): number => {
    switch (priority) {
      case 'critical': return 4
      case 'high': return 3
      case 'medium': return 2
      case 'low': return 1
      default: return 2
    }
  }

  const getComplexityScore = (complexity: string): number => {
    switch (complexity) {
      case 'high': return 3
      case 'medium': return 2
      case 'low': return 1
      default: return 2
    }
  }

  const sortedAndFilteredItems = actionItems
    .filter(item => {
      if (filter === 'completed') return item.completed
      if (filter === 'pending') return !item.completed
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return getPriorityScore(b.priority) - getPriorityScore(a.priority)
        case 'complexity':
          return getComplexityScore(a.complexity) - getComplexityScore(b.complexity)
        case 'timeframe':
          return a.timeframe.localeCompare(b.timeframe)
        default:
          return 0
      }
    })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white'
      case 'high': return 'bg-orange-500 text-white'
      case 'medium': return 'bg-blue-500 text-white'
      case 'low': return 'bg-gray-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />
      default: return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'strategic': return <Star className="w-4 h-4 text-purple-500" />
      case 'tactical': return <Target className="w-4 h-4 text-blue-500" />
      case 'operational': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'learning': return <Calendar className="w-4 h-4 text-orange-500" />
      default: return <CheckCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const completedCount = actionItems.filter(item => item.completed).length
  const progressPercentage = actionItems.length > 0 ? (completedCount / actionItems.length) * 100 : 0

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>Action Items</span>
            <Badge variant="outline">
              {completedCount}/{actionItems.length}
            </Badge>
          </CardTitle>
          <div className="flex space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All Items</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="priority">Priority</option>
              <option value="complexity">Complexity</option>
              <option value="timeframe">Timeframe</option>
            </select>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">
          {Math.round(progressPercentage)}% complete ({completedCount} of {actionItems.length} items)
        </p>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {sortedAndFilteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No action items {filter !== 'all' ? `(${filter})` : ''}</p>
            </div>
          ) : (
            sortedAndFilteredItems.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-4 transition-all duration-200 ${
                  item.completed 
                    ? 'bg-gray-50 border-gray-200 opacity-75' 
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={item.completed || false}
                    onCheckedChange={() => onActionComplete?.(item.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 
                          className={`font-medium cursor-pointer hover:text-blue-600 ${
                            item.completed ? 'line-through text-gray-500' : 'text-gray-900'
                          }`}
                          onClick={() => onActionSelect?.(item.id)}
                        >
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {item.category && getCategoryIcon(item.category)}
                        {getComplexityIcon(item.complexity)}
                        <Badge className={getPriorityColor(item.priority)} size="sm">
                          {item.priority}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{item.timeframe}</span>
                        </span>
                        <span className="capitalize">
                          {item.complexity} complexity
                        </span>
                        {item.category && (
                          <span className="capitalize">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.expectedOutcome && !item.completed && (
                      <div className="bg-blue-50 p-2 rounded text-sm">
                        <span className="font-medium text-blue-900">Expected outcome:</span>
                        <span className="text-blue-800 ml-1">{item.expectedOutcome}</span>
                      </div>
                    )}

                    {item.successMetrics && item.successMetrics.length > 0 && !item.completed && (
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-700">Success metrics:</span>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {item.successMetrics.map((metric, index) => (
                            <li key={index} className="flex items-center space-x-1">
                              <Target className="w-3 h-3" />
                              <span>{metric}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {sortedAndFilteredItems.length > 0 && filter === 'pending' && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Next priority actions ({sortedAndFilteredItems.slice(0, 3).length})
              </span>
              <Button variant="outline" size="sm">
                Focus Mode
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}