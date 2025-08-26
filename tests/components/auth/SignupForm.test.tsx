import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import SignupPage from '@/app/(auth)/signup/page'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: vi.fn(),
    },
  })),
}))

const mockPush = vi.fn()

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
    })
  })

  it('renders signup form elements', () => {
    render(<SignupPage />)
    
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    render(<SignupPage />)
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      expect(screen.getByText(/display name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it('validates password strength requirements', async () => {
    render(<SignupPage />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const displayNameInput = screen.getByLabelText(/display name/i)
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(displayNameInput, { target: { value: 'Test User' } })
    fireEvent.change(passwordInput, { target: { value: 'weakpass' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'weakpass' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/password must contain at least one uppercase letter/i)).toBeInTheDocument()
    })
  })

  it('validates password confirmation', async () => {
    render(<SignupPage />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const displayNameInput = screen.getByLabelText(/display name/i)
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(displayNameInput, { target: { value: 'Test User' } })
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPass123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument()
    })
  })

  it('handles successful signup', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const mockSignUp = vi.fn().mockResolvedValue({ error: null })
    
    ;(createClient as any).mockReturnValue({
      auth: {
        signUp: mockSignUp,
      },
    })
    
    render(<SignupPage />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const displayNameInput = screen.getByLabelText(/display name/i)
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(displayNameInput, { target: { value: 'Test User' } })
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'StrongPass123',
        options: {
          data: {
            display_name: 'Test User',
          }
        }
      })
      expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    })
  })

  it('handles signup error', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const mockSignUp = vi.fn().mockResolvedValue({ 
      error: { message: 'Email already registered' } 
    })
    
    ;(createClient as any).mockReturnValue({
      auth: {
        signUp: mockSignUp,
      },
    })
    
    render(<SignupPage />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const displayNameInput = screen.getByLabelText(/display name/i)
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(displayNameInput, { target: { value: 'Test User' } })
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument()
    })
  })

  it('validates display name length', async () => {
    render(<SignupPage />)
    
    const displayNameInput = screen.getByLabelText(/display name/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(displayNameInput, { target: { value: 'a'.repeat(51) } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/display name must be less than 50 characters/i)).toBeInTheDocument()
    })
  })

  it('displays loading state during submission', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const mockSignUp = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    )
    
    ;(createClient as any).mockReturnValue({
      auth: {
        signUp: mockSignUp,
      },
    })
    
    render(<SignupPage />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const displayNameInput = screen.getByLabelText(/display name/i)
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(displayNameInput, { target: { value: 'Test User' } })
    fireEvent.change(passwordInput, { target: { value: 'StrongPass123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'StrongPass123' } })
    fireEvent.click(submitButton)
    
    expect(screen.getByText(/creating account.../i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })
})