'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, Clock, Package, Volume2 } from 'lucide-react'

interface DeliverySectionProps {
  onUnsavedChanges?: (hasChanges: boolean) => void
}

interface DeliveryData {
  delivery_time: string
  delivery_frequency: string
  content_depth: 'brief' | 'detailed'
  content_formats: string[]
}

export function DeliverySection({ onUnsavedChanges }: DeliverySectionProps) {
  const [delivery, setDelivery] = useState<DeliveryData>({
    delivery_time: '09:00',
    delivery_frequency: 'daily',
    content_depth: 'brief',
    content_formats: [],
  })
  const [originalDelivery, setOriginalDelivery] = useState<DeliveryData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load current preferences
  useEffect(() => {
    const loadDelivery = async () => {
      try {
        const response = await fetch('/api/preferences')
        if (response.ok) {
          const data = await response.json()
          const deliveryData: DeliveryData = {
            delivery_time: data.delivery_time || '09:00',
            delivery_frequency: data.delivery_frequency || 'daily',
            content_depth: data.content_depth || 'brief',
            content_formats: data.content_formats || [],
          }
          setDelivery(deliveryData)
          setOriginalDelivery(deliveryData)
        }
      } catch (error) {
        console.error('Failed to load delivery preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadDelivery()
  }, [])

  // Track changes
  useEffect(() => {
    const hasChanges = originalDelivery && JSON.stringify(delivery) !== JSON.stringify(originalDelivery)
    onUnsavedChanges?.(Boolean(hasChanges))
  }, [delivery, originalDelivery, onUnsavedChanges])

  const handleInputChange = (field: keyof DeliveryData, value: string | string[]) => {
    setDelivery(prev => ({ ...prev, [field]: value }))
  }

  const handleFormatToggle = (format: string) => {
    const newFormats = delivery.content_formats.includes(format)
      ? delivery.content_formats.filter(f => f !== format)
      : [...delivery.content_formats, format]
    handleInputChange('content_formats', newFormats)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(delivery),
      })

      if (response.ok) {
        setOriginalDelivery({ ...delivery })
        onUnsavedChanges?.(false)
      } else {
        throw new Error('Failed to save delivery preferences')
      }
    } catch (error) {
      console.error('Error saving delivery preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading delivery settings...</div>
  }

  const contentFormats = [
    { id: 'summary', label: 'Quick Summaries', description: 'Bullet points and key takeaways' },
    { id: 'full-article', label: 'Full Articles', description: 'Complete content with analysis' },
    { id: 'links-only', label: 'Links Only', description: 'Just the headlines and URLs' },
    { id: 'visual', label: 'Visual Content', description: 'Charts, infographics, and images' },
  ]

  return (
    <div className="space-y-6">
      {/* Delivery Timing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Clock className="h-4 w-4" />
            <span>Delivery Schedule</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="delivery-time">Preferred Delivery Time</Label>
              <Input
                id="delivery-time"
                type="time"
                value={delivery.delivery_time}
                onChange={(e) => handleInputChange('delivery_time', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Your local timezone will be used
              </p>
            </div>
            <div>
              <Label htmlFor="delivery-frequency">Delivery Frequency</Label>
              <Select
                value={delivery.delivery_frequency}
                onValueChange={(value) => handleInputChange('delivery_frequency', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="3x-week">3 times per week</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="custom">Custom schedule</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Volume */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Volume2 className="h-4 w-4" />
            <span>Content Volume & Depth</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Content Depth Preference</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <Card
                className={`cursor-pointer border-2 ${
                  delivery.content_depth === 'brief'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleInputChange('content_depth', 'brief')}
              >
                <CardContent className="p-4">
                  <h4 className="font-semibold">Brief & Focused</h4>
                  <p className="text-sm text-muted-foreground">
                    Quick summaries, key points, 5-10 items per delivery
                  </p>
                </CardContent>
              </Card>
              <Card
                className={`cursor-pointer border-2 ${
                  delivery.content_depth === 'detailed'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleInputChange('content_depth', 'detailed')}
              >
                <CardContent className="p-4">
                  <h4 className="font-semibold">Detailed & Comprehensive</h4>
                  <p className="text-sm text-muted-foreground">
                    Full articles, deep analysis, 15-25 items per delivery
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Formats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Package className="h-4 w-4" />
            <span>Content Formats</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contentFormats.map((format) => (
              <Card
                key={format.id}
                className={`cursor-pointer border-2 ${
                  delivery.content_formats.includes(format.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleFormatToggle(format.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{format.label}</h4>
                      <p className="text-sm text-muted-foreground">
                        {format.description}
                      </p>
                    </div>
                    {delivery.content_formats.includes(format.id) && (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Select multiple formats to receive varied content types
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