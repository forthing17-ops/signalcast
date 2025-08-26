'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { redirect } from 'next/navigation'
import OnboardingLayout from '@/components/onboarding/onboarding-layout'
import OnboardingStepper from '@/components/onboarding/onboarding-stepper'
import ProfessionalContextStep from '@/components/onboarding/professional-context-step'
import TechInterestsStep from '@/components/onboarding/tech-interests-step'
import ToolStackStep from '@/components/onboarding/tool-stack-step'
import ContentPreferencesStep from '@/components/onboarding/content-preferences-step'
import CuriosityAreasStep from '@/components/onboarding/curiosity-areas-step'
import { useRouter } from 'next/navigation'

const ONBOARDING_STEPS = [
  'professional-context',
  'tech-interests', 
  'tool-stack',
  'content-preferences',
  'curiosity-areas'
] as const

type OnboardingStep = typeof ONBOARDING_STEPS[number]

interface OnboardingData {
  professionalRole: string
  industry: string
  companySize: string
  experienceLevel: string
  interests: string[]
  techStack: string[]
  deliveryFrequency: string
  contentDepth: 'brief' | 'detailed'
  contentFormats: string[]
  curiosityAreas: string[]
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('professional-context')
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([])
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    professionalRole: '',
    industry: '',
    companySize: '',
    experienceLevel: '',
    interests: [],
    techStack: [],
    deliveryFrequency: 'daily',
    contentDepth: 'detailed',
    contentFormats: [],
    curiosityAreas: []
  })
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()
  const router = useRouter()

  // Load existing progress on mount
  useEffect(() => {
    loadProgress()
  }, [])

  const loadProgress = async () => {
    try {
      const response = await fetch('/api/preferences')
      if (response.ok) {
        const data = await response.json()
        if (data.data) {
          setOnboardingData({
            professionalRole: data.data.professional_role || '',
            industry: data.data.industry || '',
            companySize: data.data.company_size || '',
            experienceLevel: data.data.experience_level || '',
            interests: data.data.interests || [],
            techStack: data.data.tech_stack || [],
            deliveryFrequency: data.data.delivery_frequency || 'daily',
            contentDepth: data.data.content_depth || 'detailed',
            contentFormats: data.data.content_formats || [],
            curiosityAreas: data.data.curiosity_areas || []
          })
        }
      }
    } catch (error) {
      console.error('Failed to load progress:', error)
    }
  }

  const saveProgress = async (data: Partial<OnboardingData>) => {
    try {
      const updatedData = { ...onboardingData, ...data }
      setOnboardingData(updatedData)
      
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          professional_role: updatedData.professionalRole,
          industry: updatedData.industry,
          company_size: updatedData.companySize,
          experience_level: updatedData.experienceLevel,
          interests: updatedData.interests,
          tech_stack: updatedData.techStack,
          delivery_frequency: updatedData.deliveryFrequency,
          content_depth: updatedData.contentDepth,
          content_formats: updatedData.contentFormats,
          curiosity_areas: updatedData.curiosityAreas
        })
      })
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }

  const getCurrentStepIndex = () => ONBOARDING_STEPS.indexOf(currentStep)

  const handleNext = async (stepData: Partial<OnboardingData>) => {
    const currentIndex = getCurrentStepIndex()
    
    // Save progress for current step
    await saveProgress(stepData)
    
    // Mark current step as completed
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep])
    }
    
    // Move to next step or complete onboarding
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(ONBOARDING_STEPS[currentIndex + 1])
    } else {
      await completeOnboarding()
    }
  }

  const handleBack = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex > 0) {
      setCurrentStep(ONBOARDING_STEPS[currentIndex - 1])
    }
  }

  const handleSkip = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(ONBOARDING_STEPS[currentIndex + 1])
    } else {
      completeOnboarding()
    }
  }

  const completeOnboarding = async () => {
    setLoading(true)
    try {
      // Save final preferences
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          professional_role: onboardingData.professionalRole,
          industry: onboardingData.industry,
          company_size: onboardingData.companySize,
          experience_level: onboardingData.experienceLevel,
          interests: onboardingData.interests,
          tech_stack: onboardingData.techStack,
          delivery_frequency: onboardingData.deliveryFrequency,
          content_depth: onboardingData.contentDepth,
          content_formats: onboardingData.contentFormats,
          curiosity_areas: onboardingData.curiosityAreas
        })
      })

      if (response.ok) {
        // Update user onboarded status
        await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ onboarded: true })
        })

        // Redirect to app
        router.push('/app')
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'professional-context':
        return (
          <ProfessionalContextStep
            data={{
              professionalRole: onboardingData.professionalRole,
              industry: onboardingData.industry,
              companySize: onboardingData.companySize,
              experienceLevel: onboardingData.experienceLevel
            }}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            canGoBack={false}
          />
        )
      case 'tech-interests':
        return (
          <TechInterestsStep
            data={{ interests: onboardingData.interests }}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            canGoBack={true}
          />
        )
      case 'tool-stack':
        return (
          <ToolStackStep
            data={{ techStack: onboardingData.techStack }}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            canGoBack={true}
          />
        )
      case 'content-preferences':
        return (
          <ContentPreferencesStep
            data={{
              deliveryFrequency: onboardingData.deliveryFrequency,
              contentDepth: onboardingData.contentDepth,
              contentFormats: onboardingData.contentFormats
            }}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            canGoBack={true}
          />
        )
      case 'curiosity-areas':
        return (
          <CuriosityAreasStep
            data={{ curiosityAreas: onboardingData.curiosityAreas }}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            canGoBack={true}
            isLastStep={true}
            loading={loading}
          />
        )
      default:
        return null
    }
  }

  return (
    <OnboardingLayout>
      <OnboardingStepper 
        steps={ONBOARDING_STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
      />
      {renderCurrentStep()}
    </OnboardingLayout>
  )
}