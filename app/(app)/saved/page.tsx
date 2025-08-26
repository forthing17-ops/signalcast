import { Suspense } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { SavedContentList } from '@/components/content/saved-content-list'

interface SearchParams {
  page?: string
}

interface SavedPageProps {
  searchParams: SearchParams
}

export default async function SavedPage({ searchParams }: SavedPageProps) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { page = '1' } = searchParams
  
  return (
    <AppLayout userEmail={session.user.email}>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
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