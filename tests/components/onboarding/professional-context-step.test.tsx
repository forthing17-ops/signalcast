import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfessionalContextStep from '@/components/onboarding/professional-context-step'

describe('ProfessionalContextStep', () => {
  const mockOnNext = vi.fn()
  const mockOnBack = vi.fn()
  const mockOnSkip = vi.fn()

  const defaultProps = {
    data: {
      professionalRole: '',
      industry: '',
      companySize: '',
      experienceLevel: ''
    },
    onNext: mockOnNext,
    onBack: mockOnBack,
    onSkip: mockOnSkip,
    canGoBack: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form fields correctly', () => {
    render(<ProfessionalContextStep {...defaultProps} />)

    expect(screen.getByLabelText(/What's your role/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/What industry/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/company size/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/experience level/i)).toBeInTheDocument()
  })

  it('displays continue button as disabled when role is empty', () => {
    render(<ProfessionalContextStep {...defaultProps} />)
    
    const continueButton = screen.getByText('Continue')
    expect(continueButton).toBeDisabled()
  })

  it('enables continue button when role is filled', async () => {
    const user = userEvent.setup()
    render(<ProfessionalContextStep {...defaultProps} />)

    const roleInput = screen.getByLabelText(/What's your role/i)
    await user.type(roleInput, 'Software Engineer')

    const continueButton = screen.getByText('Continue')
    expect(continueButton).toBeEnabled()
  })

  it('calls onNext with form data when continue is clicked', async () => {
    const user = userEvent.setup()
    render(<ProfessionalContextStep {...defaultProps} />)

    const roleInput = screen.getByLabelText(/What's your role/i)
    await user.type(roleInput, 'Software Engineer')
    
    const industrySelect = screen.getByLabelText(/What industry/i)
    await user.selectOptions(industrySelect, 'Software/Technology')

    const continueButton = screen.getByText('Continue')
    await user.click(continueButton)

    expect(mockOnNext).toHaveBeenCalledWith({
      professionalRole: 'Software Engineer',
      industry: 'Software/Technology',
      companySize: '',
      experienceLevel: ''
    })
  })

  it('calls onSkip when skip button is clicked', async () => {
    const user = userEvent.setup()
    render(<ProfessionalContextStep {...defaultProps} />)

    const skipButton = screen.getByText('Skip for now')
    await user.click(skipButton)

    expect(mockOnSkip).toHaveBeenCalled()
  })

  it('shows back button when canGoBack is true', () => {
    render(<ProfessionalContextStep {...defaultProps} canGoBack={true} />)

    expect(screen.getByText('Back')).toBeInTheDocument()
  })

  it('hides back button when canGoBack is false', () => {
    render(<ProfessionalContextStep {...defaultProps} canGoBack={false} />)

    expect(screen.queryByText('Back')).not.toBeInTheDocument()
  })

  it('pre-fills form with existing data', () => {
    const existingData = {
      professionalRole: 'Senior Developer',
      industry: 'Software/Technology',
      companySize: 'Medium (51-200)',
      experienceLevel: 'Senior (6-10 years)'
    }

    render(<ProfessionalContextStep {...defaultProps} data={existingData} />)

    expect(screen.getByDisplayValue('Senior Developer')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Software/Technology')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Medium (51-200)')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Senior (6-10 years)')).toBeInTheDocument()
  })
})