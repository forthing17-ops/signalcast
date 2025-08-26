import { ReactNode } from 'react'

interface OnboardingLayoutProps {
  children: ReactNode
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome to SignalCast
            </h1>
            <p className="text-xl text-gray-600">
              Let's personalize your content experience in just a few steps
            </p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8">
            {children}
          </div>
          
          <div className="text-center mt-6 text-sm text-gray-500">
            Your information is secure and will only be used to personalize your experience
          </div>
        </div>
      </div>
    </div>
  )
}