import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ContentCard } from '@/components/content/content-card'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago')
}))

// Mock window.open
Object.defineProperty(window, 'open', {
  writable: true,
  value: vi.fn()
})

describe('ContentCard', () => {
  const mockProps = {
    id: '123',
    title: 'Test Article Title',
    summary: 'This is a test summary for the article content.',
    sourceUrls: ['https://reddit.com/r/test', 'https://producthunt.com/test'],
    topics: ['AI', 'Development', 'Tools'],
    publishedAt: '2024-01-15T09:00:00Z',
    isBookmarked: false,
    onBookmarkToggle: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders content card with all required information', () => {
    render(<ContentCard {...mockProps} />)
    
    expect(screen.getByText('Test Article Title')).toBeInTheDocument()
    expect(screen.getByText('This is a test summary for the article content.')).toBeInTheDocument()
    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
  })

  it('displays topics correctly with limit', () => {
    render(<ContentCard {...mockProps} />)
    
    expect(screen.getByText('AI')).toBeInTheDocument()
    expect(screen.getByText('Development')).toBeInTheDocument()
    expect(screen.getByText('Tools')).toBeInTheDocument()
  })

  it('shows +more indicator when there are more than 3 topics', () => {
    const propsWithManyTopics = {
      ...mockProps,
      topics: ['AI', 'Development', 'Tools', 'React', 'TypeScript']
    }
    
    render(<ContentCard {...propsWithManyTopics} />)
    
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('displays bookmark button in unbookmarked state', () => {
    render(<ContentCard {...mockProps} />)
    
    const bookmarkButton = screen.getByRole('button', { name: /bookmark/i })
    expect(bookmarkButton).toBeInTheDocument()
  })

  it('displays bookmark button in bookmarked state', () => {
    render(<ContentCard {...mockProps} isBookmarked={true} />)
    
    const bookmarkButton = screen.getByRole('button', { name: /bookmark/i })
    expect(bookmarkButton).toBeInTheDocument()
  })

  it('calls onBookmarkToggle when bookmark button is clicked', async () => {
    const mockToggle = vi.fn().mockResolvedValue(undefined)
    render(<ContentCard {...mockProps} onBookmarkToggle={mockToggle} />)
    
    const bookmarkButton = screen.getByRole('button', { name: /bookmark/i })
    fireEvent.click(bookmarkButton)
    
    await waitFor(() => {
      expect(mockToggle).toHaveBeenCalledWith('123', true)
    })
  })

  it('handles external link clicks correctly', () => {
    const mockOpen = vi.fn()
    window.open = mockOpen
    
    render(<ContentCard {...mockProps} />)
    
    const externalLinkButton = screen.getByText('reddit.com')
    fireEvent.click(externalLinkButton)
    
    expect(mockOpen).toHaveBeenCalledWith(
      'https://reddit.com/r/test',
      '_blank',
      'noopener,noreferrer'
    )
  })

  it('shows source domain correctly', () => {
    render(<ContentCard {...mockProps} />)
    
    expect(screen.getByText('reddit.com')).toBeInTheDocument()
  })

  it('shows +more indicator for multiple sources', () => {
    render(<ContentCard {...mockProps} />)
    
    expect(screen.getByText('+1 more')).toBeInTheDocument()
  })

  it('disables bookmark button during toggle operation', async () => {
    const mockToggle = vi.fn(() => new Promise<void>(resolve => setTimeout(resolve, 100)))
    render(<ContentCard {...mockProps} onBookmarkToggle={mockToggle} />)
    
    const bookmarkButton = screen.getByRole('button', { name: /bookmark/i })
    fireEvent.click(bookmarkButton)
    
    expect(bookmarkButton).toBeDisabled()
  })

  it('handles bookmark toggle errors gracefully', async () => {
    const mockToggle = vi.fn().mockRejectedValue(new Error('Network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<ContentCard {...mockProps} onBookmarkToggle={mockToggle} />)
    
    const bookmarkButton = screen.getByRole('button', { name: /bookmark/i })
    fireEvent.click(bookmarkButton)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to toggle bookmark:', expect.any(Error))
    })
    
    consoleSpy.mockRestore()
  })
})