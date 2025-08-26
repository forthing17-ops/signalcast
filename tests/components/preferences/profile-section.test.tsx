import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProfileSection } from '../../../components/preferences/profile-section'

// Mock fetch
global.fetch = vi.fn()

describe('ProfileSection', () => {
  const mockOnUnsavedChanges = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        professional_role: 'Software Engineer',
        industry: 'Technology',
        company_size: 'Startup (1-50)',
        experience_level: 'Senior',
        tech_stack: ['React', 'TypeScript', 'Node.js'],
      }),
    })
  })

  it('renders profile section with form fields', async () => {
    render(<ProfileSection onUnsavedChanges={mockOnUnsavedChanges} />)

    await waitFor(() => {
      expect(screen.getByLabelText(/professional role/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/industry/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/company size/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/experience level/i)).toBeInTheDocument()
    })
  })

  it('loads and displays current preferences', async () => {
    render(<ProfileSection onUnsavedChanges={mockOnUnsavedChanges} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Technology')).toBeInTheDocument()
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
    })
  })

  it('allows adding new tech stack items', async () => {
    render(<ProfileSection onUnsavedChanges={mockOnUnsavedChanges} />)

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument()
    })

    const techInput = screen.getByPlaceholderText(/add technology/i)
    const addButton = screen.getByRole('button', { name: /add/i })

    fireEvent.change(techInput, { target: { value: 'Python' } })
    fireEvent.click(addButton)

    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(mockOnUnsavedChanges).toHaveBeenCalledWith(true)
  })

  it('allows removing tech stack items', async () => {
    render(<ProfileSection onUnsavedChanges={mockOnUnsavedChanges} />)

    await waitFor(() => {
      expect(screen.getByText('React')).toBeInTheDocument()
    })

    const reactBadge = screen.getByText('React ×')
    fireEvent.click(reactBadge)

    await waitFor(() => {
      expect(screen.queryByText('React')).not.toBeInTheDocument()
    })
    expect(mockOnUnsavedChanges).toHaveBeenCalledWith(true)
  })

  it('tracks unsaved changes', async () => {
    render(<ProfileSection onUnsavedChanges={mockOnUnsavedChanges} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument()
    })

    const roleInput = screen.getByDisplayValue('Software Engineer')
    fireEvent.change(roleInput, { target: { value: 'Senior Software Engineer' } })

    expect(mockOnUnsavedChanges).toHaveBeenCalledWith(true)
  })

  it('saves changes when save button is clicked', async () => {
    const saveMock = vi.fn().mockResolvedValue({ ok: true })
    ;(global.fetch as any).mockImplementation((url: string, options: any) => {
      if (options?.method === 'PUT') {
        return Promise.resolve(saveMock())
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          professional_role: 'Software Engineer',
          industry: 'Technology',
          company_size: 'Startup (1-50)',
          experience_level: 'Senior',
          tech_stack: ['React', 'TypeScript'],
        }),
      })
    })

    render(<ProfileSection onUnsavedChanges={mockOnUnsavedChanges} />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument()
    })

    const roleInput = screen.getByDisplayValue('Software Engineer')
    fireEvent.change(roleInput, { target: { value: 'Senior Software Engineer' } })

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(saveMock).toHaveBeenCalled()
    })
  })
})