'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ContentCardProps {
  id: string
  title: string
  summary: string
  sourceUrls: string[]
  topics: string[]
  publishedAt: string
  isBookmarked?: boolean
  onBookmarkToggle?: (contentId: string, isBookmarked: boolean) => Promise<void>
}

export function ContentCard({
  id,
  title,
  summary,
  sourceUrls,
  topics,
  publishedAt,
  isBookmarked = false,
  onBookmarkToggle
}: ContentCardProps) {
  const [bookmarked, setBookmarked] = useState(isBookmarked)
  const [isToggling, setIsToggling] = useState(false)

  const handleBookmarkToggle = async () => {
    if (!onBookmarkToggle || isToggling) return
    
    setIsToggling(true)
    try {
      await onBookmarkToggle(id, !bookmarked)
      setBookmarked(!bookmarked)
    } catch (error) {
      console.error('Failed to toggle bookmark:', error)
    } finally {
      setIsToggling(false)
    }
  }

  const handleExternalClick = (url: string, event: React.MouseEvent) => {
    event.preventDefault()
    // Track click-through event here if needed
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2 flex-1">{title}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBookmarkToggle}
            disabled={isToggling}
            className="flex-shrink-0"
          >
            {bookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-blue-600" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-1 mt-2">
          {topics.slice(0, 3).map(topic => (
            <span
              key={topic}
              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
            >
              {topic}
            </span>
          ))}
          {topics.length > 3 && (
            <span className="text-xs text-gray-500">+{topics.length - 3} more</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-3">
          {summary}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{formatDistanceToNow(new Date(publishedAt), { addSuffix: true })}</span>
          
          <div className="flex items-center gap-2">
            {sourceUrls.slice(0, 1).map((url, index) => {
              const domain = new URL(url).hostname.replace('www.', '')
              return (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleExternalClick(url, e)}
                  className="text-xs p-1 h-auto"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {domain}
                </Button>
              )
            })}
            {sourceUrls.length > 1 && (
              <span className="text-xs">+{sourceUrls.length - 1} more</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}