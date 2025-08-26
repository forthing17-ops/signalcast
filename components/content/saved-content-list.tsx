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

interface SavedContentListProps {
  page?: number
}

export function SavedContentList({ page = 1 }: SavedContentListProps) {
  const [content, setContent] = useState<ContentItem[]>([])
  const [pagination, setPagination] = useState<ContentListResponse['pagination'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSavedContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const fetchSavedContent = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      })

      const response = await fetch(`/api/content/saved?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch saved content: ${response.statusText}`)
      }

      const data: ContentListResponse = await response.json()
      setContent(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved content')
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

    // Remove from saved list when unbookmarked
    if (!shouldBookmark) {
      setContent(prev => prev.filter(item => item.id !== contentId))
      
      // Update pagination count
      if (pagination) {
        setPagination(prev => prev ? { ...prev, total: prev.total - 1 } : null)
      }
    }
  }

  const buildPageUrl = (newPage: number) => {
    return `?page=${newPage}`
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
        <Button onClick={() => fetchSavedContent()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (content.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">
          No saved content yet.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Start bookmarking interesting articles from your content feed.
        </p>
        <Button asChild variant="outline">
          <a href="/feed">Browse Content</a>
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {content.map(item => (
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