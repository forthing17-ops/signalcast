'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

// Common tech industry topics for MVP
const AVAILABLE_TOPICS = [
  'AI',
  'Machine Learning',
  'Development',
  'Tools',
  'Startups',
  'Product',
  'Design',
  'DevOps',
  'Security',
  'Frontend',
  'Backend',
  'Mobile',
  'Web3',
  'Data Science'
]

interface CategoryFilterProps {
  selectedTopics?: string
}

export function CategoryFilter({ selectedTopics }: CategoryFilterProps) {
  const [selected, setSelected] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    if (selectedTopics) {
      setSelected(selectedTopics.split(',').filter(Boolean))
    }
  }, [selectedTopics])

  const handleTopicToggle = (topic: string) => {
    const newSelected = selected.includes(topic)
      ? selected.filter(t => t !== topic)
      : [...selected, topic]
    
    updateUrl(newSelected)
  }

  const handleClearAll = () => {
    updateUrl([])
  }

  const updateUrl = (topics: string[]) => {
    const params = new URLSearchParams(window.location.search)
    
    if (topics.length > 0) {
      params.set('topics', topics.join(','))
    } else {
      params.delete('topics')
    }
    
    // Reset to page 1 when filtering
    params.set('page', '1')
    
    router.push(`/feed?${params}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Filter by Topics</h3>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(topic => (
            <Badge
              key={topic}
              variant="default"
              className="cursor-pointer hover:bg-gray-700"
              onClick={() => handleTopicToggle(topic)}
            >
              {topic}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {AVAILABLE_TOPICS.map(topic => {
          const isSelected = selected.includes(topic)
          return (
            <Button
              key={topic}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => handleTopicToggle(topic)}
              className="justify-start text-xs"
            >
              {topic}
            </Button>
          )
        })}
      </div>
    </div>
  )
}