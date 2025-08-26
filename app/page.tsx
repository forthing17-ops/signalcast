import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function Home() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Check for demo mode cookie
  if (typeof document !== 'undefined') {
    const demoSession = document.cookie.includes('demo-session=authenticated')
    if (demoSession) {
      redirect('/app')
    }
  }

  // If user is authenticated, redirect to app
  if (session) {
    redirect('/app')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            SignalCast
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-powered content synthesis platform
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">Smart Content Discovery</h3>
            <p className="text-sm text-gray-600">
              Discover and curate content from multiple sources tailored to your interests
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">AI-Powered Synthesis</h3>
            <p className="text-sm text-gray-600">
              Get personalized insights and summaries powered by advanced AI
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold mb-2">Knowledge Tracking</h3>
            <p className="text-sm text-gray-600">
              Build and track your professional knowledge over time
            </p>
          </div>
        </div>

        <div className="space-x-4">
          <Link href="/login">
            <Button size="lg" className="text-lg px-8">
              Get Started
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline" size="lg" className="text-lg px-8">
              Create Account
            </Button>
          </Link>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Demo Access:</strong> Use <code className="bg-blue-100 px-1 rounded">forthing17@gmail.com</code> with password <code className="bg-blue-100 px-1 rounded">Thanhan175@</code>
          </p>
        </div>
      </div>
    </main>
  )
}