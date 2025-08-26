'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Save, Heart, Plus, Star } from 'lucide-react'

interface InterestsSectionProps {
  onUnsavedChanges?: (hasChanges: boolean) => void
}

interface InterestsData {
  interests: string[]
  curiosity_areas: string[]
}

export function InterestsSection({ onUnsavedChanges }: InterestsSectionProps) {
  const [interests, setInterests] = useState<InterestsData>({
    interests: [],
    curiosity_areas: [],
  })
  const [originalInterests, setOriginalInterests] = useState<InterestsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [newInterest, setNewInterest] = useState('')
  const [newCuriosity, setNewCuriosity] = useState('')

  // Predefined popular interests for suggestions
  const popularInterests = [
    'Artificial Intelligence',
    'Machine Learning',
    'Cloud Computing',
    'DevOps',
    'Mobile Development',
    'Web Development',
    'Data Science',
    'Cybersecurity',
    'Blockchain',
    'IoT',
    'Startup',
    'Product Management',
    'UX/UI Design',
    'Programming Languages',
    'Open Source'
  ]

  // Load current preferences
  useEffect(() => {
    const loadInterests = async () => {
      try {
        const response = await fetch('/api/preferences')
        if (response.ok) {
          const data = await response.json()
          const interestsData: InterestsData = {
            interests: data.interests || [],
            curiosity_areas: data.curiosity_areas || [],
          }
          setInterests(interestsData)
          setOriginalInterests(interestsData)
        }
      } catch (error) {
        console.error('Failed to load interests:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadInterests()
  }, [])

  // Track changes
  useEffect(() => {
    const hasChanges = originalInterests && JSON.stringify(interests) !== JSON.stringify(originalInterests)
    onUnsavedChanges?.(Boolean(hasChanges))
  }, [interests, originalInterests, onUnsavedChanges])

  const addInterest = () => {
    if (newInterest.trim() && !interests.interests.includes(newInterest.trim())) {
      setInterests(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()],
      }))
      setNewInterest('')
    }
  }

  const removeInterest = (interest: string) => {
    setInterests(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest),
    }))
  }

  const addCuriosity = () => {
    if (newCuriosity.trim() && !interests.curiosity_areas.includes(newCuriosity.trim())) {
      setInterests(prev => ({
        ...prev,
        curiosity_areas: [...prev.curiosity_areas, newCuriosity.trim()],
      }))
      setNewCuriosity('')
    }
  }

  const removeCuriosity = (curiosity: string) => {
    setInterests(prev => ({
      ...prev,
      curiosity_areas: prev.curiosity_areas.filter(c => c !== curiosity),
    }))
  }

  const addFromSuggestions = (suggestion: string) => {
    if (!interests.interests.includes(suggestion)) {
      setInterests(prev => ({
        ...prev,
        interests: [...prev.interests, suggestion],
      }))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interests),
      })

      if (response.ok) {
        setOriginalInterests({ ...interests })
        onUnsavedChanges?.(false)
      } else {
        throw new Error('Failed to save interests')
      }
    } catch (error) {
      console.error('Error saving interests:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading interests...</div>
  }

  const availableSuggestions = popularInterests.filter(
    suggestion => !interests.interests.includes(suggestion)
  )

  return (
    <div className="space-y-6">
      {/* Primary Interests */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Heart className="h-4 w-4" />
            <span>Primary Interests</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {interests.interests.map((interest) => (
              <Badge
                key={interest}
                variant="default"
                className="cursor-pointer"
                onClick={() => removeInterest(interest)}
              >
                {interest} ×
              </Badge>
            ))}
          </div>
          <div className="flex space-x-2">
            <Input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              placeholder="Add interest (e.g. Machine Learning, Startups)"
              onKeyDown={(e) => e.key === 'Enter' && addInterest()}
            />
            <Button onClick={addInterest} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Popular Suggestions */}
          {availableSuggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Popular Interests</Label>
              <div className="flex flex-wrap gap-2">
                {availableSuggestions.slice(0, 8).map((suggestion) => (
                  <Badge
                    key={suggestion}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => addFromSuggestions(suggestion)}
                  >
                    + {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">
            Click on an interest to remove it, or click suggestions to add them
          </p>
        </CardContent>
      </Card>

      {/* Curiosity Areas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Star className="h-4 w-4" />
            <span>Learning & Curiosity Areas</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {interests.curiosity_areas.map((curiosity) => (
              <Badge
                key={curiosity}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeCuriosity(curiosity)}
              >
                {curiosity} ×
              </Badge>
            ))}
          </div>
          <div className="flex space-x-2">
            <Input
              value={newCuriosity}
              onChange={(e) => setNewCuriosity(e.target.value)}
              placeholder="Add learning area (e.g. Quantum Computing, Design Systems)"
              onKeyDown={(e) => e.key === 'Enter' && addCuriosity()}
            />
            <Button onClick={addCuriosity} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Areas you want to explore and learn more about
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