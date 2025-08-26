import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TechInterestsStep from '@/components/onboarding/tech-interests-step'

// Mock fetch is available globally from test setup

describe('TechInterestsStep', () => {
  const mockOnNext = vi.fn()
  const mockOnBack = vi.fn()
  const mockOnSkip = vi.fn()
  const mockFetch = vi.mocked(global.fetch)

  const defaultProps = {
    data: {
      interests: []
    },
    onNext: mockOnNext,
    onBack: mockOnBack,
    onSkip: mockOnSkip,
    canGoBack: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  it('renders natural language input interface correctly', () => {
    render(<TechInterestsStep {...defaultProps} />)

    expect(screen.getByText('Tell us about your professional interests')).toBeInTheDocument()
    expect(screen.getByLabelText(/What are you interested in learning about/i)).toBeInTheDocument()
    expect(screen.getByText('Need inspiration? Try these examples:')).toBeInTheDocument()
    expect(screen.getByText('How this works:')).toBeInTheDocument()
  })

  it('displays example prompts that can be clicked', async () => {
    const user = userEvent.setup()
    render(<TechInterestsStep {...defaultProps} />)

    const exampleButton = screen.getByText(/Claude Code as a platform/i)
    await user.click(exampleButton)

    const textarea = screen.getByLabelText(/What are you interested in learning about/i)
    expect((textarea as HTMLTextAreaElement).value).toContain('Claude Code')
  })

  it('shows generate button when description is entered', async () => {
    const user = userEvent.setup()
    render(<TechInterestsStep {...defaultProps} />)

    const textarea = screen.getByLabelText(/What are you interested in learning about/i)
    await user.type(textarea, 'I like React and TypeScript')

    expect(screen.getByText('Generate Interests')).toBeInTheDocument()
  })

  it('processes natural language input when generate button is clicked', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        interests: ['React Development', 'TypeScript Programming'],
        confidence: 0.9
      })
    } as any)

    render(<TechInterestsStep {...defaultProps} />)

    const textarea = screen.getByLabelText(/What are you interested in learning about/i)
    await user.type(textarea, 'I like React and TypeScript')

    const generateButton = screen.getByText('Generate Interests')
    await user.click(generateButton)

    expect(mockFetch).toHaveBeenCalledWith('/api/interests/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description: 'I like React and TypeScript' })
    })
    
    await waitFor(() => {
      expect(screen.getByText('React Development ×')).toBeInTheDocument()
      expect(screen.getByText('TypeScript Programming ×')).toBeInTheDocument()
    })
  })

  it('displays confidence indicator for processed interests', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        interests: ['React Development'],
        confidence: 0.9
      })
    } as any)

    render(<TechInterestsStep {...defaultProps} />)

    const textarea = screen.getByLabelText(/What are you interested in learning about/i)
    await user.type(textarea, 'React development')

    const generateButton = screen.getByText('Generate Interests')
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('High confidence')).toBeInTheDocument()
    })
  })

  it('allows removing processed interests by clicking', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        interests: ['React Development', 'TypeScript Programming'],
        confidence: 0.9
      })
    } as any)

    render(<TechInterestsStep {...defaultProps} />)

    const textarea = screen.getByLabelText(/What are you interested in learning about/i)
    await user.type(textarea, 'React and TypeScript')

    const generateButton = screen.getByText('Generate Interests')
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('React Development ×')).toBeInTheDocument()
    })

    const reactBadge = screen.getByText('React Development ×')
    await user.click(reactBadge)

    expect(screen.queryByText('React Development ×')).not.toBeInTheDocument()
    expect(screen.getByText('TypeScript Programming ×')).toBeInTheDocument()
  })

  it('allows adding custom interests', async () => {
    const user = userEvent.setup()
    render(<TechInterestsStep {...defaultProps} />)

    const customInput = screen.getByLabelText(/Add custom interests/i)
    await user.type(customInput, 'Vue.js')
    
    const addButton = screen.getByRole('button', { name: 'Add' })
    await user.click(addButton)

    expect(screen.getByText('Vue.js ×')).toBeInTheDocument()
  })

  it('allows adding custom interests with Enter key', async () => {
    const user = userEvent.setup()
    render(<TechInterestsStep {...defaultProps} />)

    const customInput = screen.getByLabelText(/Add custom interests/i)
    await user.type(customInput, 'Angular{enter}')

    expect(screen.getByText('Angular ×')).toBeInTheDocument()
  })

  it('displays error message when processing fails', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: 'OpenAI not configured'
      })
    } as any)

    render(<TechInterestsStep {...defaultProps} />)

    const textarea = screen.getByLabelText(/What are you interested in learning about/i)
    await user.type(textarea, 'Some description')

    const generateButton = screen.getByText('Generate Interests')
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText(/Failed to process your interests/)).toBeInTheDocument()
    })
  })

  it('disables continue button when no interests and no description', () => {
    render(<TechInterestsStep {...defaultProps} />)

    const continueButton = screen.getByText('Continue')
    expect(continueButton).toBeDisabled()
  })

  it('enables continue button when description is entered', async () => {
    const user = userEvent.setup()
    render(<TechInterestsStep {...defaultProps} />)

    const textarea = screen.getByLabelText(/What are you interested in learning about/i)
    await user.type(textarea, 'Some description')

    const continueButton = screen.getByText('Continue')
    expect(continueButton).toBeEnabled()
  })

  it('enables continue button when interests are processed', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        interests: ['React Development'],
        confidence: 0.9
      })
    } as any)

    render(<TechInterestsStep {...defaultProps} />)

    const textarea = screen.getByLabelText(/What are you interested in learning about/i)
    await user.type(textarea, 'React')

    const generateButton = screen.getByText('Generate Interests')
    await user.click(generateButton)

    await waitFor(() => {
      const continueButton = screen.getByText('Continue')
      expect(continueButton).toBeEnabled()
    })
  })

  it('calls onNext with processed interests when continue is clicked', async () => {
    const user = userEvent.setup()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({
        interests: ['React Development', 'TypeScript Programming'],
        confidence: 0.9
      })
    } as any)

    render(<TechInterestsStep {...defaultProps} />)

    const textarea = screen.getByLabelText(/What are you interested in learning about/i)
    await user.type(textarea, 'React and TypeScript')

    const generateButton = screen.getByText('Generate Interests')
    await user.click(generateButton)

    await waitFor(() => {
      expect(screen.getByText('React Development ×')).toBeInTheDocument()
    })

    const continueButton = screen.getByText('Continue')
    await user.click(continueButton)

    expect(mockOnNext).toHaveBeenCalledWith({
      interests: ['React Development', 'TypeScript Programming']
    })
  })

  it('calls onSkip when skip button is clicked', async () => {
    const user = userEvent.setup()
    render(<TechInterestsStep {...defaultProps} />)

    const skipButton = screen.getByText('Skip for now')
    await user.click(skipButton)

    expect(mockOnSkip).toHaveBeenCalled()
  })

  it('shows back button when canGoBack is true', () => {
    render(<TechInterestsStep {...defaultProps} canGoBack={true} />)

    expect(screen.getByText('Back')).toBeInTheDocument()
  })

  it('hides back button when canGoBack is false', () => {
    render(<TechInterestsStep {...defaultProps} canGoBack={false} />)

    expect(screen.queryByText('Back')).not.toBeInTheDocument()
  })

  it('pre-fills with existing interests data', () => {
    const existingData = {
      interests: ['Existing Interest 1', 'Existing Interest 2']
    }

    render(<TechInterestsStep {...defaultProps} data={existingData} />)

    expect(screen.getByText('Existing Interest 1 ×')).toBeInTheDocument()
    expect(screen.getByText('Existing Interest 2 ×')).toBeInTheDocument()
  })

  it('shows processing state while generating interests', async () => {
    const user = userEvent.setup()
    // Create a Promise that we can control
    let resolveProcess: (value: any) => void
    const processPromise = new Promise((resolve) => {
      resolveProcess = resolve
    })
    mockFetch.mockImplementationOnce(() => processPromise as Promise<any>)

    render(<TechInterestsStep {...defaultProps} />)

    const textarea = screen.getByLabelText(/What are you interested in learning about/i)
    await user.type(textarea, 'React')

    const generateButton = screen.getByText('Generate Interests')
    await user.click(generateButton)

    expect(screen.getByText('Processing...')).toBeInTheDocument()
    expect(screen.getByText('Processing...')).toBeDisabled()

    // Resolve the promise
    resolveProcess!({
      ok: true,
      json: vi.fn().mockResolvedValue({
        interests: ['React Development'],
        confidence: 0.9
      })
    })

    await waitFor(() => {
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument()
      expect(screen.getByText('Generate Interests')).toBeInTheDocument()
    })
  })
})