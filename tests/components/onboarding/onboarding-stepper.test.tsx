import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OnboardingStepper from '@/components/onboarding/onboarding-stepper'

describe('OnboardingStepper', () => {
  const mockSteps = ['professional-context', 'tech-interests', 'tool-stack', 'content-preferences', 'curiosity-areas'] as const

  it('renders all steps with correct titles', () => {
    render(
      <OnboardingStepper 
        steps={mockSteps}
        currentStep="professional-context"
        completedSteps={[]}
      />
    )

    expect(screen.getByText('Professional Context')).toBeInTheDocument()
    expect(screen.getByText('Tech Interests')).toBeInTheDocument()
    expect(screen.getByText('Tool Stack')).toBeInTheDocument()
    expect(screen.getByText('Content Preferences')).toBeInTheDocument()
    expect(screen.getByText('Curiosity Areas')).toBeInTheDocument()
  })

  it('shows current step as active', () => {
    render(
      <OnboardingStepper 
        steps={mockSteps}
        currentStep="tech-interests"
        completedSteps={[]}
      />
    )

    const currentStepElement = screen.getByText('2')
    expect(currentStepElement).toHaveClass('bg-blue-500')
  })

  it('marks completed steps with checkmark', () => {
    render(
      <OnboardingStepper 
        steps={mockSteps}
        currentStep="tool-stack"
        completedSteps={['professional-context', 'tech-interests']}
      />
    )

    expect(screen.getAllByText('✓')).toHaveLength(2)
  })

  it('shows correct progress percentage', () => {
    render(
      <OnboardingStepper 
        steps={mockSteps}
        currentStep="content-preferences"
        completedSteps={['professional-context', 'tech-interests', 'tool-stack']}
      />
    )

    expect(screen.getByText('Step 4 of 5')).toBeInTheDocument()
  })

  it('styles upcoming steps correctly', () => {
    render(
      <OnboardingStepper 
        steps={mockSteps}
        currentStep="professional-context"
        completedSteps={[]}
      />
    )

    const upcomingStep = screen.getByText('2')
    expect(upcomingStep).toHaveClass('bg-gray-200', 'text-gray-500')
  })
})