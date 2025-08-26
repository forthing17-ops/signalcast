interface OnboardingStepperProps {
  steps: readonly string[]
  currentStep: string
  completedSteps: string[]
}

export default function OnboardingStepper({ 
  steps, 
  currentStep, 
  completedSteps 
}: OnboardingStepperProps) {
  const currentStepIndex = steps.indexOf(currentStep)
  
  const getStepTitle = (step: string) => {
    const titles: Record<string, string> = {
      'professional-context': 'Professional Context',
      'tech-interests': 'Tech Interests',
      'tool-stack': 'Tool Stack',
      'content-preferences': 'Content Preferences',
      'curiosity-areas': 'Curiosity Areas'
    }
    return titles[step] || step
  }

  const getStepStatus = (step: string, index: number) => {
    if (completedSteps.includes(step)) {
      return 'completed'
    }
    if (step === currentStep) {
      return 'current'
    }
    if (index < currentStepIndex) {
      return 'completed'
    }
    return 'upcoming'
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step, index)
          const isLast = index === steps.length - 1
          
          return (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                {/* Step Circle */}
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                    ${status === 'completed' 
                      ? 'bg-green-500 text-white' 
                      : status === 'current' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                    }
                  `}
                >
                  {status === 'completed' ? '✓' : index + 1}
                </div>
                
                {/* Step Title */}
                <div 
                  className={`
                    mt-2 text-sm text-center max-w-20
                    ${status === 'current' ? 'text-blue-600 font-semibold' : 'text-gray-600'}
                  `}
                >
                  {getStepTitle(step)}
                </div>
              </div>
              
              {/* Connector Line */}
              {!isLast && (
                <div 
                  className={`
                    flex-1 h-0.5 mx-4 mt-[-20px]
                    ${index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'}
                  `} 
                />
              )}
            </div>
          )
        })}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-6">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${((currentStepIndex + 1) / steps.length) * 100}%` 
            }}
          />
        </div>
        <div className="text-center mt-2 text-sm text-gray-600">
          Step {currentStepIndex + 1} of {steps.length}
        </div>
      </div>
    </div>
  )
}