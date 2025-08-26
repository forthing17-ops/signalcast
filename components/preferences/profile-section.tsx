'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Save, Briefcase, Award } from 'lucide-react'

interface ProfileSectionProps {
  onUnsavedChanges?: (hasChanges: boolean) => void
}

interface ProfileData {
  professional_role: string
  industry: string
  company_size: string
  experience_level: string
  tech_stack: string[]
}

export function ProfileSection({ onUnsavedChanges }: ProfileSectionProps) {
  const [profile, setProfile] = useState<ProfileData>({
    professional_role: '',
    industry: '',
    company_size: '',
    experience_level: '',
    tech_stack: [],
  })
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [newTech, setNewTech] = useState('')

  // Load current preferences
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch('/api/preferences')
        if (response.ok) {
          const data = await response.json()
          const profileData: ProfileData = {
            professional_role: data.professional_role || '',
            industry: data.industry || '',
            company_size: data.company_size || '',
            experience_level: data.experience_level || '',
            tech_stack: data.tech_stack || [],
          }
          setProfile(profileData)
          setOriginalProfile(profileData)
        }
      } catch (error) {
        console.error('Failed to load profile preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [])

  // Track changes
  useEffect(() => {
    const hasChanges = originalProfile && JSON.stringify(profile) !== JSON.stringify(originalProfile)
    onUnsavedChanges?.(Boolean(hasChanges))
  }, [profile, originalProfile, onUnsavedChanges])

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const addTechStack = () => {
    if (newTech.trim() && !profile.tech_stack.includes(newTech.trim())) {
      setProfile(prev => ({
        ...prev,
        tech_stack: [...prev.tech_stack, newTech.trim()],
      }))
      setNewTech('')
    }
  }

  const removeTechStack = (tech: string) => {
    setProfile(prev => ({
      ...prev,
      tech_stack: prev.tech_stack.filter(t => t !== tech),
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })

      if (response.ok) {
        setOriginalProfile({ ...profile })
        onUnsavedChanges?.(false)
      } else {
        throw new Error('Failed to save preferences')
      }
    } catch (error) {
      console.error('Error saving profile preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading profile settings...</div>
  }

  return (
    <div className="space-y-6">
      {/* Professional Role */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Briefcase className="h-4 w-4" />
            <span>Professional Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Professional Role</Label>
              <Input
                id="role"
                value={profile.professional_role}
                onChange={(e) => handleInputChange('professional_role', e.target.value)}
                placeholder="e.g. Software Engineer, Product Manager"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={profile.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                placeholder="e.g. Technology, Healthcare, Finance"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="company-size">Company Size</Label>
              <Input
                id="company-size"
                value={profile.company_size}
                onChange={(e) => handleInputChange('company_size', e.target.value)}
                placeholder="e.g. Startup (1-50), Enterprise (1000+)"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="experience">Experience Level</Label>
              <Input
                id="experience"
                value={profile.experience_level}
                onChange={(e) => handleInputChange('experience_level', e.target.value)}
                placeholder="e.g. Junior, Senior, Lead, Principal"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tech Stack */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Award className="h-4 w-4" />
            <span>Technology Stack</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {profile.tech_stack.map((tech) => (
              <Badge
                key={tech}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeTechStack(tech)}
              >
                {tech} ×
              </Badge>
            ))}
          </div>
          <div className="flex space-x-2">
            <Input
              value={newTech}
              onChange={(e) => setNewTech(e.target.value)}
              placeholder="Add technology (e.g. React, Python, AWS)"
              onKeyDown={(e) => e.key === 'Enter' && addTechStack()}
            />
            <Button onClick={addTechStack} variant="outline">
              Add
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Click on a technology badge to remove it
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