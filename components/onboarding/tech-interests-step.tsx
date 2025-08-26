'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
// Removed direct import - using API route instead

interface TechInterestsData {
  interests: string[]
}

interface TechInterestsStepProps {
  data: TechInterestsData
  onNext: (data: Partial<TechInterestsData>) => void
  onBack: () => void
  onSkip: () => void
  canGoBack: boolean
}

export default function TechInterestsStep({
  data,
  onNext,
  onBack,
  onSkip,
  canGoBack
}: TechInterestsStepProps) {
  const [description, setDescription] = useState('')
  const [processedInterests, setProcessedInterests] = useState<string[]>(data.interests)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number | null>(null)

  // Example prompts to help users
  const examplePrompts = [
    "I'm interested in Claude Code as a platform and want to see how other people implement solutions with AI development tools",
    "I work in fintech and want to stay updated on React performance optimization, TypeScript best practices, and serverless architecture for handling financial data",
    "I'm curious about machine learning applications in healthcare, particularly computer vision for medical imaging and natural language processing for clinical notes",
    "As a startup CTO, I need to track emerging technologies like WebAssembly, edge computing, and modern database solutions for scaling applications"
  ]

  const handleProcessInterests = async () => {
    if (!description.trim()) return

    setIsProcessing(true)
    setProcessingError(null)

    try {
      const response = await fetch('/api/interests/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to process interests')
      }
      
      if (result.error) {
        setProcessingError(result.error)
      }
      
      setProcessedInterests(result.interests || [])
      setConfidence(result.confidence || 0)
    } catch (error) {
      setProcessingError('Failed to process your interests. Please try again or continue manually.')
      console.error('Error processing interests:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveInterest = (interestToRemove: string) => {
    setProcessedInterests(prev => prev.filter(interest => interest !== interestToRemove))
  }

  const handleAddCustomInterest = (customInterest: string) => {
    if (customInterest.trim() && !processedInterests.includes(customInterest.trim())) {
      setProcessedInterests(prev => [...prev, customInterest.trim()])
    }
  }

  const handleNext = () => {
    onNext({ interests: processedInterests })
  }

  const handleUseExample = (example: string) => {
    setDescription(example)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Tell us about your professional interests
        </h2>
        <p className="text-gray-600">
          Describe what you&apos;re curious about professionally. Our AI will help identify specific topics to follow.
        </p>
      </div>

      {/* Natural Language Input */}
      <div className="space-y-3">
        <Label htmlFor="description">What are you interested in learning about?</Label>
        <textarea
          id="description"
          placeholder="Describe your professional interests, technologies you want to follow, or areas you're curious about..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          maxLength={1000}
        />
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>{description.length}/1000 characters</span>
          {description.trim() && (
            <Button
              type="button"
              onClick={handleProcessInterests}
              disabled={isProcessing}
              size="sm"
            >
              {isProcessing ? 'Processing...' : 'Generate Interests'}
            </Button>
          )}
        </div>
      </div>

      {/* Example Prompts */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Need inspiration? Try these examples:</Label>
        <div className="grid gap-2">
          {examplePrompts.map((example, index) => (
            <button
              key={index}
              onClick={() => handleUseExample(example)}
              className="text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border text-gray-700 transition-colors"
            >
&ldquo;{example}&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Processing Error */}
      {processingError && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-700">
            <strong>Note:</strong> {processingError}
            {confidence !== null && confidence < 0.5 && (
              <span> You can still continue with the generated interests or add your own below.</span>
            )}
          </p>
        </div>
      )}

      {/* Processed Interests */}
      {processedInterests.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Generated interests ({processedInterests.length})</Label>
            {confidence !== null && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                confidence > 0.8 ? 'bg-green-100 text-green-700' :
                confidence > 0.5 ? 'bg-yellow-100 text-yellow-700' :
                'bg-orange-100 text-orange-700'
              }`}>
                {confidence > 0.8 ? 'High confidence' :
                 confidence > 0.5 ? 'Medium confidence' :
                 'Low confidence'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 p-4 bg-blue-50 rounded-lg">
            {processedInterests.map((interest, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-red-100 transition-colors"
                onClick={() => handleRemoveInterest(interest)}
              >
                {interest} ×
              </Badge>
            ))}
          </div>
          <p className="text-sm text-gray-600">
            Click on any interest to remove it, or add custom ones below.
          </p>
        </div>
      )}

      {/* Custom Interest Input */}
      <div className="space-y-2">
        <Label htmlFor="custom">Add custom interests</Label>
        <div className="flex space-x-2">
          <Input
            id="custom"
            type="text"
            placeholder="e.g., Rust Programming, Edge Computing, etc."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLInputElement
                handleAddCustomInterest(target.value)
                target.value = ''
              }
            }}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement
              if (input?.value.trim()) {
                handleAddCustomInterest(input.value)
                input.value = ''
              }
            }}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Guidance */}
      {processedInterests.length === 0 && !description.trim() && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">How this works:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Describe your professional interests in natural language</li>
            <li>• Our AI will extract specific topics and technologies to follow</li>
            <li>• Review and adjust the generated interests as needed</li>
            <li>• This helps us deliver more personalized and relevant content</li>
          </ul>
        </div>
      )}

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
          <Button 
            onClick={handleNext}
            disabled={processedInterests.length === 0 && !description.trim()}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}