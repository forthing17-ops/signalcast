import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout/AppLayout'

export default async function AppPage() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <AppLayout userEmail={session.user.email}>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome to SignalCast</h2>
            <p className="text-gray-600">
              Your AI-powered content synthesis platform is ready to go!
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <Link href="/feed" className="group">
              <div className="rounded-lg border p-6 bg-white hover:shadow-lg transition-shadow">
                <h3 className="font-semibold mb-2 group-hover:text-blue-600">Content Feed</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Discover personalized content from multiple sources
                </p>
                <Button variant="outline" className="w-full">
                  Browse Content
                </Button>
              </div>
            </Link>
            
            <Link href="/saved" className="group">
              <div className="rounded-lg border p-6 bg-white hover:shadow-lg transition-shadow">
                <h3 className="font-semibold mb-2 group-hover:text-blue-600">Saved Content</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Access your bookmarked articles and insights
                </p>
                <Button variant="outline" className="w-full">
                  View Saved
                </Button>
              </div>
            </Link>
            
            <Link href="/knowledge" className="group">
              <div className="rounded-lg border p-6 bg-white hover:shadow-lg transition-shadow">
                <h3 className="font-semibold mb-2 group-hover:text-blue-600">Knowledge Base</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Track your learning progress and insights
                </p>
                <Button variant="outline" className="w-full">
                  View Knowledge
                </Button>
              </div>
            </Link>
            
            <Link href="/preferences" className="group">
              <div className="rounded-lg border p-6 bg-white hover:shadow-lg transition-shadow">
                <h3 className="font-semibold mb-2 group-hover:text-blue-600">Preferences</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Customize your content and delivery preferences
                </p>
                <Button variant="outline" className="w-full">
                  Edit Settings
                </Button>
              </div>
            </Link>
            
            <Link href="/onboarding" className="group">
              <div className="rounded-lg border p-6 bg-white hover:shadow-lg transition-shadow">
                <h3 className="font-semibold mb-2 group-hover:text-blue-600">Setup Guide</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Complete your profile and preferences setup
                </p>
                <Button variant="outline" className="w-full">
                  Complete Setup
                </Button>
              </div>
            </Link>
            
            <Link href="/profile" className="group">
              <div className="rounded-lg border p-6 bg-white hover:shadow-lg transition-shadow">
                <h3 className="font-semibold mb-2 group-hover:text-blue-600">Profile</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Manage your account and professional context
                </p>
                <Button variant="outline" className="w-full">
                  Edit Profile
                </Button>
              </div>
            </Link>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Quick Start</h3>
            <p className="text-blue-800 text-sm mb-4">
              Get started by exploring your personalized content feed or completing your profile setup.
            </p>
            <div className="flex gap-3">
              <Link href="/feed">
                <Button size="sm">Explore Content</Button>
              </Link>
              <Link href="/onboarding">
                <Button variant="outline" size="sm">Complete Setup</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}