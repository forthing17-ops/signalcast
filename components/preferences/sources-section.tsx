'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Save, Globe, Star, AlertCircle } from 'lucide-react'

interface SourcesSectionProps {
  onUnsavedChanges?: (hasChanges: boolean) => void
}

interface SourcePreference {
  id: string
  name: string
  description: string
  enabled: boolean
  quality_score?: number
  user_rating?: number
}

interface SourcesData {
  enabled_sources: string[]
  platform_preferences: Record<string, boolean>
}

export function SourcesSection({ onUnsavedChanges }: SourcesSectionProps) {
  const [sources, setSources] = useState<SourcesData>({
    enabled_sources: [],
    platform_preferences: {},
  })
  const [originalSources, setOriginalSources] = useState<SourcesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Available content sources
  const availableSources: SourcePreference[] = [
    {
      id: 'reddit',
      name: 'Reddit',
      description: 'Popular discussions and community insights',
      enabled: true,
      quality_score: 85,
    },
    {
      id: 'product-hunt',
      name: 'Product Hunt',
      description: 'New tech products and startup launches',
      enabled: true,
      quality_score: 90,
    },
    {
      id: 'hacker-news',
      name: 'Hacker News',
      description: 'Tech news and developer discussions',
      enabled: false,
      quality_score: 95,
    },
    {
      id: 'twitter',
      name: 'Twitter/X',
      description: 'Real-time updates and thought leadership',
      enabled: false,
      quality_score: 75,
    },
    {
      id: 'github-trending',
      name: 'GitHub Trending',
      description: 'Popular repositories and open source projects',
      enabled: false,
      quality_score: 88,
    },
    {
      id: 'dev-to',
      name: 'Dev.to',
      description: 'Developer articles and tutorials',
      enabled: false,
      quality_score: 82,
    },
  ]

  // Load current preferences
  useEffect(() => {
    const loadSources = async () => {
      try {
        const response = await fetch('/api/preferences')
        if (response.ok) {
          const data = await response.json()
          const sourcesData: SourcesData = {
            enabled_sources: data.enabled_sources || ['reddit', 'product-hunt'],
            platform_preferences: data.platform_preferences || {},
          }
          setSources(sourcesData)
          setOriginalSources(sourcesData)
        }
      } catch (error) {
        console.error('Failed to load source preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadSources()
  }, [])

  // Track changes
  useEffect(() => {
    const hasChanges = originalSources && JSON.stringify(sources) !== JSON.stringify(originalSources)
    onUnsavedChanges?.(Boolean(hasChanges))
  }, [sources, originalSources, onUnsavedChanges])

  const handleSourceToggle = (sourceId: string) => {
    setSources(prev => ({
      ...prev,
      enabled_sources: prev.enabled_sources.includes(sourceId)
        ? prev.enabled_sources.filter(id => id !== sourceId)
        : [...prev.enabled_sources, sourceId],
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sources),
      })

      if (response.ok) {
        setOriginalSources({ ...sources })
        onUnsavedChanges?.(false)
      } else {
        throw new Error('Failed to save source preferences')
      }
    } catch (error) {
      console.error('Error saving source preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getQualityBadge = (score?: number) => {
    if (!score) return null
    
    if (score >= 90) return <Badge variant="default" className="bg-green-500">Excellent</Badge>
    if (score >= 80) return <Badge variant="secondary">Good</Badge>
    if (score >= 70) return <Badge variant="outline">Fair</Badge>
    return <Badge variant="outline" className="text-yellow-600">Limited</Badge>
  }

  const getStatusIcon = (source: SourcePreference) => {
    if (!source.enabled) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
    return <Globe className="h-4 w-4 text-green-500" />
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading source preferences...</div>
  }

  const enabledSources = availableSources.filter(source => sources.enabled_sources.includes(source.id))
  const availableButDisabled = availableSources.filter(source => !sources.enabled_sources.includes(source.id))

  return (
    <div className="space-y-6">
      {/* Enabled Sources */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Globe className="h-4 w-4 text-green-500" />
            <span>Active Content Sources</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {enabledSources.length === 0 ? (
            <p className="text-muted-foreground">No sources enabled. Enable sources below to receive content.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enabledSources.map((source) => (
                <Card key={source.id} className="border-2 border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusIcon(source)}
                          <h4 className="font-semibold">{source.name}</h4>
                          {getQualityBadge(source.quality_score)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {source.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Enabled</span>
                          <Switch
                            checked={sources.enabled_sources.includes(source.id)}
                            onCheckedChange={() => handleSourceToggle(source.id)}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Sources */}
      {availableButDisabled.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Star className="h-4 w-4" />
              <span>Available Sources</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableButDisabled.map((source) => (
                <Card key={source.id} className="border-2 hover:border-primary/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusIcon(source)}
                          <h4 className="font-semibold">{source.name}</h4>
                          {getQualityBadge(source.quality_score)}
                          {!source.enabled && (
                            <Badge variant="outline" className="text-orange-600">
                              Coming Soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {source.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {source.enabled ? 'Enable' : 'Not Available'}
                          </span>
                          <Switch
                            checked={sources.enabled_sources.includes(source.id)}
                            onCheckedChange={() => handleSourceToggle(source.id)}
                            disabled={!source.enabled}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Some sources are still being integrated and will be available soon.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quality Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Source Quality Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Badge variant="default" className="bg-green-500">Excellent</Badge>
              <span className="text-muted-foreground">90+ score</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">Good</Badge>
              <span className="text-muted-foreground">80-89 score</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">Fair</Badge>
              <span className="text-muted-foreground">70-79 score</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-yellow-600">Limited</Badge>
              <span className="text-muted-foreground">&lt;70 score</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Quality scores are based on content relevance, reliability, and user feedback.
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="min-w-32">
          {isSaving ? (
            'Saving...'
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}