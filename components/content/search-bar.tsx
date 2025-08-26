'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  defaultValue?: string
}

export function SearchBar({ defaultValue }: SearchBarProps) {
  const [search, setSearch] = useState(defaultValue || '')
  const router = useRouter()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    const params = new URLSearchParams(window.location.search)
    
    if (search.trim()) {
      params.set('search', search.trim())
    } else {
      params.delete('search')
    }
    
    // Reset to page 1 when searching
    params.set('page', '1')
    
    router.push(`/feed?${params}`)
  }

  const handleClear = () => {
    setSearch('')
    
    const params = new URLSearchParams(window.location.search)
    params.delete('search')
    params.set('page', '1')
    
    router.push(`/feed?${params}`)
  }

  // Update search state when URL changes
  useEffect(() => {
    setSearch(defaultValue || '')
  }, [defaultValue])

  return (
    <form onSubmit={handleSearch} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search content by keywords..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-20"
        />
        {search && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-12 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        <Button
          type="submit"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2"
        >
          Search
        </Button>
      </div>
    </form>
  )
}