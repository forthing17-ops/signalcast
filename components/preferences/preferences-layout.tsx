'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Settings, User, Heart, Truck, History, Download, Brain } from 'lucide-react'

import { ProfileSection } from './profile-section'
import { InterestsSection } from './interests-section'
import { DeliverySection } from './delivery-section'
import { SourcesSection } from './sources-section'
import { HistorySection } from './history-section'
import { ImportExportSection } from './import-export-section'
import { KnowledgeSection } from './knowledge-section'

interface PreferencesLayoutProps {
  className?: string
}

export function PreferencesLayout({ className }: PreferencesLayoutProps) {
  const [activeTab, setActiveTab] = useState('profile')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const tabs = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'Professional context and role information',
    },
    {
      id: 'interests',
      label: 'Interests',
      icon: Heart,
      description: 'Topics, priorities, and learning areas',
    },
    {
      id: 'knowledge',
      label: 'Knowledge',
      icon: Brain,
      description: 'Learning progress and content novelty preferences',
    },
    {
      id: 'delivery',
      label: 'Delivery',
      icon: Truck,
      description: 'Timing, frequency, and content volume',
    },
    {
      id: 'sources',
      label: 'Sources',
      icon: Settings,
      description: 'Platform and publisher preferences',
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      description: 'Preference change tracking',
    },
    {
      id: 'import-export',
      label: 'Import/Export',
      icon: Download,
      description: 'Backup and restore preferences',
    },
  ]

  return (
    <div className={className}>
      {/* Save Status Indicator */}
      {hasUnsavedChanges && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
              Unsaved Changes
            </Badge>
            <span className="text-sm text-yellow-700">
              You have unsaved changes. Don&apos;t forget to save your preferences.
            </span>
          </div>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <nav className="mb-6">
        <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
          <li>
            <a href="/app" className="hover:text-foreground">
              Dashboard
            </a>
          </li>
          <li>/</li>
          <li className="text-foreground font-medium">Preferences</li>
          <li>/</li>
          <li className="text-foreground">
            {tabs.find(tab => tab.id === activeTab)?.label}
          </li>
        </ol>
      </nav>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Tab Navigation */}
        <TabsList className="grid w-full grid-cols-7 mb-8">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center space-x-2 px-3 py-2"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/* Tab Content */}
        {tabs.map(tab => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <tab.icon className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>{tab.label} Settings</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tab.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {tab.id === 'profile' && (
                  <ProfileSection onUnsavedChanges={setHasUnsavedChanges} />
                )}
                {tab.id === 'interests' && (
                  <InterestsSection onUnsavedChanges={setHasUnsavedChanges} />
                )}
                {tab.id === 'knowledge' && (
                  <KnowledgeSection onUnsavedChanges={setHasUnsavedChanges} />
                )}
                {tab.id === 'delivery' && (
                  <DeliverySection onUnsavedChanges={setHasUnsavedChanges} />
                )}
                {tab.id === 'sources' && (
                  <SourcesSection onUnsavedChanges={setHasUnsavedChanges} />
                )}
                {tab.id === 'history' && <HistorySection />}
                {tab.id === 'import-export' && <ImportExportSection />}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}