import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('should render with default variant', () => {
    render(<Button>Test Button</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Test Button')
  })

  it('should render with outline variant', () => {
    render(<Button variant="outline">Outline Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Outline Button')
    expect(button).toHaveClass('border-input')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})