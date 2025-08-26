'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProfessionalContextData {
  professionalRole: string
  industry: string
  companySize: string
  experienceLevel: string
}

interface ProfessionalContextStepProps {
  data: ProfessionalContextData
  onNext: (data: Partial<ProfessionalContextData>) => void
  onBack: () => void
  onSkip: () => void
  canGoBack: boolean
}

export default function ProfessionalContextStep({
  data,
  onNext,
  onBack,
  onSkip,
  canGoBack
}: ProfessionalContextStepProps) {
  const [formData, setFormData] = useState<ProfessionalContextData>(data)

  const industries = [
    'Software/Technology',
    'Financial Services',
    'Healthcare',
    'E-commerce/Retail',
    'Manufacturing',
    'Consulting',
    'Education',
    'Government',
    'Non-profit',
    'Media/Entertainment',
    'Other'
  ]

  const companySizes = [
    'Startup (1-10)',
    'Small (11-50)',
    'Medium (51-200)',
    'Large (201-1000)',
    'Enterprise (1000+)'
  ]

  const experienceLevels = [
    'Junior (0-2 years)',
    'Mid-level (3-5 years)',
    'Senior (6-10 years)',
    'Lead/Principal (10+ years)',
    'Executive/C-level'
  ]

  const handleInputChange = (field: keyof ProfessionalContextData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    onNext(formData)
  }

  const isValid = formData.professionalRole.trim().length > 0

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Tell us about your professional background
        </h2>
        <p className="text-gray-600">
          This helps us understand the context for your content preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Professional Role */}
        <div className="space-y-2">
          <Label htmlFor="role">What's your role/job title?</Label>
          <Input
            id="role"
            type="text"
            placeholder="e.g., Software Engineer, Product Manager, CTO"
            value={formData.professionalRole}
            onChange={(e) => handleInputChange('professionalRole', e.target.value)}
            className="w-full"
          />
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry">What industry do you work in?</Label>
          <select
            id="industry"
            value={formData.industry}
            onChange={(e) => handleInputChange('industry', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an industry</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>

        {/* Company Size */}
        <div className="space-y-2">
          <Label htmlFor="companySize">What's your company size?</Label>
          <select
            id="companySize"
            value={formData.companySize}
            onChange={(e) => handleInputChange('companySize', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select company size</option>
            {companySizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Experience Level */}
        <div className="space-y-2">
          <Label htmlFor="experience">What's your experience level?</Label>
          <select
            id="experience"
            value={formData.experienceLevel}
            onChange={(e) => handleInputChange('experienceLevel', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select experience level</option>
            {experienceLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
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
          <Button 
            onClick={handleNext}
            disabled={!isValid}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}