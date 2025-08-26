import { AppNavigation } from './AppNavigation'

interface AppLayoutProps {
  children: React.ReactNode
  userEmail?: string
}

export function AppLayout({ children, userEmail }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavigation userEmail={userEmail} />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}