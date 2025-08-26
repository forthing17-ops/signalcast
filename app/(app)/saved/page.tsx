import { Suspense } from 'react'
import { SavedContentList } from '@/components/content/saved-content-list'

interface SearchParams {
  page?: string
}

interface SavedPageProps {
  searchParams: SearchParams
}

export default function SavedPage({ searchParams }: SavedPageProps) {
  const { page = '1' } = searchParams
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Saved Content</h1>
        <p className="text-gray-600">
          Your bookmarked articles and content for later reading.
        </p>
      </div>

      <Suspense fallback={<ContentListSkeleton />}>
        <SavedContentList page={parseInt(page)} />
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