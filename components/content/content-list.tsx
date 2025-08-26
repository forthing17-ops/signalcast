'use client'

import { useEffect, useState } from 'react'
import { ContentCard } from './content-card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ContentItem {
  id: string
  title: string
  summary: string
  sourceUrls: string[]
  topics: string[]
  publishedAt: string
  feedback?: {
    saved: boolean
    rating?: number
  }
}

interface ContentListResponse {
  data: ContentItem[]
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

interface ContentListProps {
  search?: string
  topics?: string[]
  page?: number
}

export function ContentList({ search, topics, page = 1 }: ContentListProps) {
  const [content, setContent] = useState<ContentItem[]>([])
  const [pagination, setPagination] = useState<ContentListResponse['pagination'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, topics, page])

  const fetchContent = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      })

      if (search) params.append('search', search)
      if (topics?.length) params.append('topics', topics.join(','))

      const response = await fetch(`/api/content?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`)
      }

      const data: ContentListResponse = await response.json()
      setContent(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }

  const handleBookmarkToggle = async (contentId: string, shouldBookmark: boolean) => {
    const method = shouldBookmark ? 'POST' : 'DELETE'
    const response = await fetch(`/api/feedback/${contentId}/save`, {
      method
    })

    if (!response.ok) {
      throw new Error('Failed to update bookmark')
    }

    // Update local state
    setContent(prev => prev.map(item => 
      item.id === contentId 
        ? { ...item, feedback: { ...item.feedback, saved: shouldBookmark } }
        : item
    ))
  }

  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (topics?.length) params.set('topics', topics.join(','))
    params.set('page', newPage.toString())
    return `?${params}`
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => fetchContent()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (!loading && (!content || content.length === 0)) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">
          {search || (topics && topics.length > 0)
            ? 'No content found matching your criteria.' 
            : 'No content available.'}
        </p>
        {(search || (topics && topics.length > 0)) && (
          <Button 
            onClick={() => window.location.href = '/feed'} 
            variant="outline"
          >
            Clear Filters
          </Button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {content && content.map(item => (
          <ContentCard
            key={item.id}
            id={item.id}
            title={item.title}
            summary={item.summary}
            sourceUrls={item.sourceUrls}
            topics={item.topics}
            publishedAt={item.publishedAt}
            isBookmarked={item.feedback?.saved || false}
            onBookmarkToggle={handleBookmarkToggle}
          />
        ))}
      </div>

      {pagination && (pagination.page > 1 || pagination.hasMore) && (
        <div className="flex items-center justify-center gap-4">
          {pagination.page > 1 && (
            <Button variant="outline" asChild>
              <a href={buildPageUrl(pagination.page - 1)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </a>
            </Button>
          )}
          
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
          </span>
          
          {pagination.hasMore && (
            <Button variant="outline" asChild>
              <a href={buildPageUrl(pagination.page + 1)}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}