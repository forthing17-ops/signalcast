'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { History, Clock, ArrowRight, RotateCcw } from 'lucide-react'

interface PreferenceChange {
  id: string
  field_changed: string
  old_value: unknown
  new_value: unknown
  changed_at: string
  change_reason?: string
}

export function HistorySection() {
  const [changes, setChanges] = useState<PreferenceChange[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRollingBack, setIsRollingBack] = useState<string | null>(null)

  // Load preference change history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch('/api/preferences/history')
        if (response.ok) {
          const data = await response.json()
          setChanges(data)
        }
      } catch (error) {
        console.error('Failed to load preference history:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadHistory()
  }, [])

  const formatFieldName = (field: string) => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatValue = (value: unknown) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return 'None'
      if (value.length <= 3) return value.join(', ')
      return `${value.slice(0, 3).join(', ')} +${value.length - 3} more`
    }
    if (typeof value === 'boolean') {
      return value ? 'Enabled' : 'Disabled'
    }
    if (typeof value === 'string' && value.length > 50) {
      return `${value.substring(0, 50)}...`
    }
    return String(value || 'Not set')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    
    return date.toLocaleDateString()
  }

  const handleRollback = async (changeId: string, field: string, oldValue: unknown) => {
    setIsRollingBack(changeId)
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: oldValue }),
      })

      if (response.ok) {
        // Reload history to show the rollback change
        const historyResponse = await fetch('/api/preferences/history')
        if (historyResponse.ok) {
          const data = await historyResponse.json()
          setChanges(data)
        }
      } else {
        throw new Error('Failed to rollback change')
      }
    } catch (error) {
      console.error('Error rolling back change:', error)
    } finally {
      setIsRollingBack(null)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading preference history...</div>
  }

  if (changes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Changes Yet</h3>
          <p className="text-muted-foreground">
            Your preference changes will appear here as you customize your settings.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <History className="h-4 w-4" />
            <span>Recent Changes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Track your preference modifications and rollback changes if needed.
          </p>
        </CardContent>
      </Card>

      {/* Change Timeline */}
      <div className="space-y-3">
        {changes.map((change) => (
          <Card key={change.id} className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="outline">
                      {formatFieldName(change.field_changed)}
                    </Badge>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(change.changed_at)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="flex-1">
                      <span className="text-muted-foreground">From:</span>
                      <div className="bg-red-50 border border-red-200 rounded px-2 py-1 mt-1">
                        {formatValue(change.old_value)}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">To:</span>
                      <div className="bg-green-50 border border-green-200 rounded px-2 py-1 mt-1">
                        {formatValue(change.new_value)}
                      </div>
                    </div>
                  </div>

                  {change.change_reason && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <span className="font-medium">Reason:</span> {change.change_reason}
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRollback(change.id, change.field_changed, change.old_value)}
                    disabled={isRollingBack === change.id}
                    className="text-xs"
                  >
                    {isRollingBack === change.id ? (
                      'Rolling back...'
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Rollback
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {changes.length > 10 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Showing recent 10 changes. Older changes are archived for your account security.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}