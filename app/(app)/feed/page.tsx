import { Suspense } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContentList } from '@/components/content/content-list'
import { SearchBar } from '@/components/content/search-bar'
import { CategoryFilter } from '@/components/content/category-filter'
import { AppLayout } from '@/components/layout/AppLayout'

interface SearchParams {
  search?: string
  topics?: string
  page?: string
}

interface FeedPageProps {
  searchParams: SearchParams
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { search, topics, page = '1' } = searchParams
  
  return (
    <AppLayout userEmail={session.user.email}>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Content Discovery</h1>
            <p className="text-gray-600">
              Explore personalized content from your connected sources
            </p>
          </div>
          
          <div className="bg-white rounded-lg border p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
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
      </div>
    </AppLayout>
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