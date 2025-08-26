import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import LogoutButton from '@/components/auth/LogoutButton'

export default async function AppPage() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">SignalCast</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, {session.user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
          <p className="text-gray-600 mb-8">
            Your AI-powered content synthesis platform is ready!
          </p>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold mb-2">Content Sources</h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure your preferred content sources
              </p>
              <Button variant="outline" className="w-full">
                Configure Sources
              </Button>
            </div>
            
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold mb-2">Latest Insights</h3>
              <p className="text-sm text-gray-600 mb-4">
                View your latest AI-generated insights
              </p>
              <Button variant="outline" className="w-full">
                View Insights
              </Button>
            </div>
            
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold mb-2">Preferences</h3>
              <p className="text-sm text-gray-600 mb-4">
                Customize your content preferences
              </p>
              <Button variant="outline" className="w-full">
                Edit Preferences
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}