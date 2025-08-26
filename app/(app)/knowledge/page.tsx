import { Suspense } from 'react';
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { KnowledgeDashboard } from '@/components/knowledge/KnowledgeDashboard';
import { AppLayout } from '@/components/layout/AppLayout'
import { RefreshCw } from 'lucide-react';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center space-x-2">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span>Loading knowledge dashboard...</span>
      </div>
    </div>
  );
}

export default async function KnowledgePage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <AppLayout userEmail={session.user.email}>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Knowledge Dashboard</h1>
            <p className="text-gray-600">
              Track your learning progress and discover knowledge gaps
            </p>
          </div>
          <Suspense fallback={<LoadingSpinner />}>
            <KnowledgeDashboard />
          </Suspense>
        </div>
      </div>
    </AppLayout>
  );
}

export const metadata = {
  title: 'Knowledge Dashboard | BMAD News',
  description: 'Track your learning progress and discover knowledge gaps',
};