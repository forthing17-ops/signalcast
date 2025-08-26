import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import LoginPage from '@/app/(auth)/auth/login/page'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(),
    },
  })),
}))

const mockPush = vi.fn()
const mockRefresh = vi.fn()

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    })
  })

  it('renders login form elements', () => {
    render(<LoginPage />)
    
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    render(<LoginPage />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email', async () => {
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })
  })

  it('handles successful login', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const mockSignIn = vi.fn().mockResolvedValue({ error: null })
    
    ;(createClient as any).mockReturnValue({
      auth: {
        signInWithPassword: mockSignIn,
      },
    })
    
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(mockPush).toHaveBeenCalledWith('/app')
      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  it('handles authentication error', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const mockSignIn = vi.fn().mockResolvedValue({ 
      error: { message: 'Invalid login credentials' } 
    })
    
    ;(createClient as any).mockReturnValue({
      auth: {
        signInWithPassword: mockSignIn,
      },
    })
    
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
    })
  })

  it('handles rate limiting error', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const mockSignIn = vi.fn().mockResolvedValue({ 
      error: { message: 'too many requests' } 
    })
    
    ;(createClient as any).mockReturnValue({
      auth: {
        signInWithPassword: mockSignIn,
      },
    })
    
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument()
    })
  })

  it('displays loading state during submission', async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const mockSignIn = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    )
    
    ;(createClient as any).mockReturnValue({
      auth: {
        signInWithPassword: mockSignIn,
      },
    })
    
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    expect(screen.getByText(/signing in.../i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })
})