import { Suspense } from 'react'
import { ContentList } from '@/components/content/content-list'
import { SearchBar } from '@/components/content/search-bar'
import { CategoryFilter } from '@/components/content/category-filter'

interface SearchParams {
  search?: string
  topics?: string
  page?: string
}

interface FeedPageProps {
  searchParams: SearchParams
}

export default function FeedPage({ searchParams }: FeedPageProps) {
  const { search, topics, page = '1' } = searchParams
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Content Discovery</h1>
        
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchBar defaultValue={search} />
          </div>
          <div className="lg:w-80">
            <CategoryFilter selectedTopics={topics} />
          </div>
        </div>
      </div>

      <Suspense fallback={<ContentListSkeleton />}>
        <ContentList 
          search={search}
          topics={topics?.split(',').filter(Boolean)}
          page={parseInt(page)}
        />
      </Suspense>
    </div>
  )
}

function ContentListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-64" />
      ))}
    </div>
  )
}