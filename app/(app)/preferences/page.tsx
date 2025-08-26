import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { PreferencesLayout } from '@/components/preferences/preferences-layout'

export default async function PreferencesPage() {
  // Demo mode authentication bypass
  if (process.env.DEMO_MODE === 'true') {
    const cookieStore = cookies()
    const demoSession = cookieStore.get('demo-session')
    
    if (!demoSession || demoSession.value !== 'authenticated') {
      redirect('/auth/login')
    }
    
    // Skip user check in demo mode, proceed to render
  } else {
    // Original Supabase auth logic
    const supabase = createServerComponentClient({ cookies })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Preferences</h1>
            <p className="text-muted-foreground">
              Customize your personalization settings and content preferences
            </p>
          </div>
          <PreferencesLayout />
        </div>
      </div>
    </div>
  )
}