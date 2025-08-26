'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface DebugInfo {
  environment: string
  userAgent: string
  timestamp: string
  localStorage: Record<string, string>
  sessionStorage: Record<string, string>
}

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)

  const collectDebugInfo = () => {
    const info: DebugInfo = {
      environment: process.env.NODE_ENV || 'unknown',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      localStorage: {},
      sessionStorage: {},
    }

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          info.localStorage[key] = localStorage.getItem(key) || ''
        }
      }
    } catch {
      info.localStorage = { error: 'Cannot access localStorage' }
    }

    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key) {
          info.sessionStorage[key] = sessionStorage.getItem(key) || ''
        }
      }
    } catch {
      info.sessionStorage = { error: 'Cannot access sessionStorage' }
    }

    setDebugInfo(info)
  }

  useEffect(() => {
    if (isOpen) {
      collectDebugInfo()
    }
  }, [isOpen])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="bg-yellow-100 hover:bg-yellow-200 border-yellow-300"
        >
          🐛 Debug
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-auto bg-white border shadow-lg rounded-lg">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm">Debug Panel</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </Button>
        </div>
        
        {debugInfo && (
          <div className="space-y-4 text-xs">
            <div>
              <strong>Environment:</strong> {debugInfo.environment}
            </div>
            
            <div>
              <strong>Timestamp:</strong> {debugInfo.timestamp}
            </div>
            
            <div>
              <strong>User Agent:</strong>
              <div className="break-all text-gray-600 mt-1">
                {debugInfo.userAgent}
              </div>
            </div>
            
            <div>
              <strong>Local Storage:</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-auto">
                {JSON.stringify(debugInfo.localStorage, null, 2)}
              </pre>
            </div>
            
            <div>
              <strong>Session Storage:</strong>
              <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-auto">
                {JSON.stringify(debugInfo.sessionStorage, null, 2)}
              </pre>
            </div>

            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={collectDebugInfo}
              >
                Refresh
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.location.href = '/api/test-error'}
              >
                Test Error
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}