'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, RefreshCw, Star, Clock } from 'lucide-react'

interface PreviewPanelProps {
  preferences: Record<string, unknown>
  isVisible?: boolean
  onToggle?: () => void
}

interface ContentItem {
  title: string
  source: string
  summary: string
  relevance_score: number
  tags: string[]
}

interface PreviewData {
  total_items: number
  content_items: ContentItem[]
  applied_filters: {
    interests_matched: string[]
    sources_used: string[]
    depth_setting: string
  }
}

export function PreviewPanel({ preferences, isVisible = false, onToggle }: PreviewPanelProps) {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const generatePreview = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/preferences/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (response.ok) {
        const data = await response.json()
        setPreviewData(data.preview)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to generate preview:', error)
    } finally {
      setIsLoading(false)
    }
  }, [preferences])

  // Auto-generate preview when preferences change
  useEffect(() => {
    if (isVisible && preferences) {
      const timer = setTimeout(() => {
        generatePreview()
      }, 500) // Debounce preview updates

      return () => clearTimeout(timer)
    }
  }, [preferences, isVisible, generatePreview])

  if (!isVisible) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="p-6 text-center">
          <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-2">Content Preview</h3>
          <p className="text-sm text-muted-foreground mb-4">
            See how your preference changes affect content selection
          </p>
          <Button variant="outline" onClick={onToggle}>
            <Eye className="h-4 w-4 mr-2" />
            Show Preview
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Eye className="h-4 w-4" />
            <span>Live Content Preview</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {lastUpdate && (
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Updated {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generatePreview}
              disabled={isLoading}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Generating preview...</p>
            </div>
          </div>
        ) : previewData ? (
          <div className="space-y-4">
            {/* Applied Filters Summary */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2">Applied Filters</h4>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">
                  {previewData.total_items} items
                </Badge>
                <Badge variant="outline">
                  {previewData.applied_filters.depth_setting} depth
                </Badge>
                {previewData.applied_filters.sources_used.map(source => (
                  <Badge key={source} variant="secondary">
                    {source}
                  </Badge>
                ))}
                {previewData.applied_filters.interests_matched.map(interest => (
                  <Badge key={interest} variant="default" className="bg-primary/10 text-primary">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Preview Content Items */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {previewData.content_items.slice(0, 3).map((item, index) => (
                <Card key={index} className="border border-border">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium leading-tight flex-1">
                        {item.title}
                      </h4>
                      <div className="flex items-center space-x-1 ml-2">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span className="text-xs text-muted-foreground">
                          {item.relevance_score}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                      {item.summary}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        from {item.source}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {previewData.content_items.length > 3 && (
              <div className="text-center">
                <Badge variant="outline" className="text-xs">
                  +{previewData.content_items.length - 3} more items
                </Badge>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              This preview shows how your current preferences affect content selection and relevance.
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-3">
              No preview available. Configure your preferences to see how they affect content selection.
            </p>
            <Button variant="outline" onClick={generatePreview}>
              Generate Preview
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}