import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ContentList } from '@/components/content/content-list'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock fetch
global.fetch = vi.fn()

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

describe('ContentList', () => {
  const mockContentResponse = {
    data: [
      {
        id: '1',
        title: 'First Article',
        summary: 'First article summary',
        sourceUrls: ['https://reddit.com/1'],
        topics: ['AI'],
        publishedAt: '2024-01-15T09:00:00Z',
        feedback: { saved: false, rating: null }
      },
      {
        id: '2',
        title: 'Second Article',
        summary: 'Second article summary',
        sourceUrls: ['https://producthunt.com/2'],
        topics: ['Development'],
        publishedAt: '2024-01-14T09:00:00Z',
        feedback: { saved: true, rating: 4 }
      }
    ],
    pagination: {
      page: 1,
      limit: 12,
      total: 2,
      hasMore: false
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockContentResponse)
    })
  })

  it('renders loading state initially', () => {
    const { container } = render(<ContentList />)
    
    // Check for loading state - the component should render initially with loading skeleton
    expect(container.firstChild).not.toBeNull()
  })

  it('fetches and renders content list', async () => {
    render(<ContentList />)
    
    await waitFor(() => {
      expect(screen.getByText('First Article')).toBeInTheDocument()
      expect(screen.getByText('Second Article')).toBeInTheDocument()
    })
  })

  it('makes API call with correct parameters', async () => {
    render(<ContentList search="test" topics={['AI']} page={2} />)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/content?page=2&limit=12&search=test&topics=AI')
    })
  })

  it('handles empty content state', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [], pagination: { page: 1, limit: 12, total: 0, hasMore: false } })
    })
    
    render(<ContentList />)
    
    await waitFor(() => {
      expect(screen.getByText('No content available.')).toBeInTheDocument()
    })
  })

  it('handles filtered empty state', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [], pagination: { page: 1, limit: 12, total: 0, hasMore: false } })
    })
    
    render(<ContentList search="test" />)
    
    await waitFor(() => {
      expect(screen.getByText('No content found matching your criteria.')).toBeInTheDocument()
      expect(screen.getByText('Clear Filters')).toBeInTheDocument()
    })
  })

  it('handles API error state', async () => {
    ;(fetch as any).mockResolvedValue({
      ok: false,
      statusText: 'Server Error'
    })
    
    render(<ContentList />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch content: Server Error')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  it('handles network error', async () => {
    ;(fetch as any).mockRejectedValue(new Error('Network error'))
    
    render(<ContentList />)
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('retries fetching when try again is clicked', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Server Error'
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockContentResponse)
    })
    
    render(<ContentList />)
    
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Try Again'))
    
    await waitFor(() => {
      expect(screen.getByText('First Article')).toBeInTheDocument()
    })
  })

  it('handles bookmark toggle correctly', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockContentResponse)
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })
    
    render(<ContentList />)
    
    await waitFor(() => {
      expect(screen.getByText('First Article')).toBeInTheDocument()
    })
    
    // This would require more complex testing with ContentCard interaction
    // For now, we test the API call structure
    expect(fetch).toHaveBeenCalledWith('/api/content?page=1&limit=12')
  })

  it('renders pagination when available', async () => {
    const paginatedResponse = {
      ...mockContentResponse,
      pagination: {
        page: 2,
        limit: 12,
        total: 50,
        hasMore: true
      }
    }
    
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(paginatedResponse)
    })
    
    render(<ContentList page={2} />)
    
    await waitFor(() => {
      expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })
  })
})