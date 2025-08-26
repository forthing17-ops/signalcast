import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PreferencesLayout } from '@/components/preferences/preferences-layout'
import { AppLayout } from '@/components/layout/AppLayout'

export default async function PreferencesPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <AppLayout userEmail={session.user.email}>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Preferences</h1>
            <p className="text-gray-600">
              Customize your personalization settings and content preferences
            </p>
          </div>
          <PreferencesLayout />
        </div>
      </div>
    </AppLayout>
  )
}