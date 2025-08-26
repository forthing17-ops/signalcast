'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface ContentPreferencesData {
  deliveryFrequency: string
  contentDepth: 'brief' | 'detailed'
  contentFormats: string[]
}

interface ContentPreferencesStepProps {
  data: ContentPreferencesData
  onNext: (data: Partial<ContentPreferencesData>) => void
  onBack: () => void
  onSkip: () => void
  canGoBack: boolean
}

export default function ContentPreferencesStep({
  data,
  onNext,
  onBack,
  onSkip,
  canGoBack
}: ContentPreferencesStepProps) {
  const [formData, setFormData] = useState<ContentPreferencesData>(data)

  const deliveryOptions = [
    { value: 'daily', label: 'Daily', description: 'Get the latest updates every day' },
    { value: '3x-week', label: '3 times a week', description: 'Curated content 3 times per week' },
    { value: 'weekly', label: 'Weekly', description: 'A comprehensive weekly digest' }
  ]

  const contentDepthOptions = [
    { 
      value: 'brief' as const, 
      label: 'Brief summaries', 
      description: 'Quick insights and key takeaways' 
    },
    { 
      value: 'detailed' as const, 
      label: 'Detailed analysis', 
      description: 'In-depth explanations and comprehensive coverage' 
    }
  ]

  const contentFormatOptions = [
    { value: 'articles', label: 'Articles', description: 'Written content and blog posts' },
    { value: 'videos', label: 'Videos', description: 'Tutorial and educational videos' },
    { value: 'podcasts', label: 'Podcasts', description: 'Audio content and discussions' },
    { value: 'tools', label: 'Tools & Resources', description: 'Developer tools and utilities' },
    { value: 'repositories', label: 'Code Repositories', description: 'Open source projects and code samples' },
    { value: 'tutorials', label: 'Tutorials', description: 'Step-by-step learning guides' }
  ]

  const handleDeliveryFrequencyChange = (frequency: string) => {
    setFormData(prev => ({ ...prev, deliveryFrequency: frequency }))
  }

  const handleContentDepthChange = (depth: 'brief' | 'detailed') => {
    setFormData(prev => ({ ...prev, contentDepth: depth }))
  }

  const handleFormatToggle = (format: string) => {
    setFormData(prev => ({
      ...prev,
      contentFormats: prev.contentFormats.includes(format)
        ? prev.contentFormats.filter(f => f !== format)
        : [...prev.contentFormats, format]
    }))
  }

  const handleNext = () => {
    onNext(formData)
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          How would you like to receive content?
        </h2>
        <p className="text-gray-600">
          Customize your content delivery preferences
        </p>
      </div>

      {/* Delivery Frequency */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">How often would you like updates?</Label>
        <div className="grid gap-3">
          {deliveryOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleDeliveryFrequencyChange(option.value)}
              className={`
                text-left p-4 rounded-lg border-2 transition-all
                ${formData.deliveryFrequency === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
                }
              `}
            >
              <div className="font-semibold">{option.label}</div>
              <div className="text-sm text-gray-600">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Content Depth */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">What level of detail do you prefer?</Label>
        <div className="grid gap-3">
          {contentDepthOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleContentDepthChange(option.value)}
              className={`
                text-left p-4 rounded-lg border-2 transition-all
                ${formData.contentDepth === option.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
                }
              `}
            >
              <div className="font-semibold">{option.label}</div>
              <div className="text-sm text-gray-600">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Content Formats */}
      <div className="space-y-4">
        <Label className="text-lg font-semibold">
          What types of content interest you? (Select all that apply)
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {contentFormatOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFormatToggle(option.value)}
              className={`
                text-left p-4 rounded-lg border-2 transition-all
                ${formData.contentFormats.includes(option.value)
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-green-300'
                }
              `}
            >
              <div className="font-semibold">{option.label}</div>
              <div className="text-sm text-gray-600">{option.description}</div>
            </button>
          ))}
        </div>
        {formData.contentFormats.length > 0 && (
          <div className="text-sm text-gray-600">
            {formData.contentFormats.length} format(s) selected
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <div>
          {canGoBack && (
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
        </div>
        
        <div className="flex space-x-3">
          <Button variant="ghost" onClick={onSkip}>
            Skip for now
          </Button>
          <Button onClick={handleNext}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}