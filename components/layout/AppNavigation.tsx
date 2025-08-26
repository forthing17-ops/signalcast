'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import LogoutButton from '@/components/auth/LogoutButton'
import { 
  Home, 
  Rss, 
  Settings, 
  User, 
  BookmarkIcon, 
  Brain,
  UserCog,
  Compass
} from 'lucide-react'

interface AppNavigationProps {
  userEmail?: string
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/app',
    icon: Home,
  },
  {
    name: 'Content Feed',
    href: '/feed',
    icon: Rss,
  },
  {
    name: 'Saved Content',
    href: '/saved',
    icon: BookmarkIcon,
  },
  {
    name: 'Knowledge Base',
    href: '/knowledge',
    icon: Brain,
  },
  {
    name: 'Onboarding',
    href: '/onboarding',
    icon: Compass,
  },
  {
    name: 'Preferences',
    href: '/preferences',
    icon: Settings,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
  },
]

export function AppNavigation({ userEmail }: AppNavigationProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div className="flex items-center space-x-8">
        <Link href="/app" className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            SignalCast
          </h1>
        </Link>
        
        <nav className="flex items-center space-x-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href !== '/app' && pathname.startsWith(item.href))
            
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Button>
              </Link>
            )
          })}
        </nav>
      </div>
      
      <div className="flex items-center space-x-4">
        {userEmail && (
          <span className="text-sm text-gray-600">
            {userEmail}
          </span>
        )}
        <LogoutButton />
      </div>
    </div>
  )
}