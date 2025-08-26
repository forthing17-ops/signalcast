import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import { GET } from '../../app/api/preferences/history/route'

// Mock Supabase
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn()
    }
  }))
}))

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    setAll: vi.fn(),
    get: vi.fn(() => ({ value: '' })),
    set: vi.fn(),
    delete: vi.fn(),
    has: vi.fn(() => false)
  }))
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    preferenceHistory: {
      findMany: vi.fn()
    }
  }
}))

import { prisma } from '@/lib/prisma'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

describe('/api/preferences/history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated users', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({ 
      data: { user: null }, 
      error: null 
    })
    
    vi.mocked(createRouteHandlerClient).mockReturnValue({
      auth: {
        getUser: mockGetUser
      }
    } as any)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns mock preference history for authenticated users', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })
    
    vi.mocked(createRouteHandlerClient).mockReturnValue({
      auth: {
        getUser: mockGetUser
      }
    } as any)

    const mockHistory = [
      {
        id: 'hist-1',
        userId: 'user-123',
        fieldChanged: 'topics',
        oldValue: '"AI"',
        newValue: '"AI,ML"',
        changedAt: new Date(),
        changeReason: 'user_update'
      }
    ]
    vi.mocked(prisma.preferenceHistory.findMany).mockResolvedValue(mockHistory as any)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    
    // Check that history items have expected structure
    const historyItem = data[0]
    expect(historyItem).toHaveProperty('id')
    expect(historyItem).toHaveProperty('field_changed')
    expect(historyItem).toHaveProperty('old_value')
    expect(historyItem).toHaveProperty('new_value')
    expect(historyItem).toHaveProperty('changed_at')
  })

  it('returns properly formatted mock data', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })
    
    vi.mocked(createRouteHandlerClient).mockReturnValue({
      auth: {
        getUser: mockGetUser
      }
    } as any)

    const mockHistory = [
      {
        id: 'hist-1',
        userId: 'user-123',
        fieldChanged: 'interests',
        oldValue: '"AI"',
        newValue: '"AI,ML"',
        changedAt: new Date(),
        changeReason: 'user_update'
      },
      {
        id: 'hist-2',
        userId: 'user-123',
        fieldChanged: 'delivery_time',
        oldValue: '"morning"',
        newValue: '"evening"',
        changedAt: new Date(),
        changeReason: 'user_update'
      },
      {
        id: 'hist-3',
        userId: 'user-123',
        fieldChanged: 'content_depth',
        oldValue: '"brief"',
        newValue: '"detailed"',
        changedAt: new Date(),
        changeReason: 'user_update'
      }
    ]
    vi.mocked(prisma.preferenceHistory.findMany).mockResolvedValue(mockHistory as any)

    const response = await GET()
    const data = await response.json()

    // Check that all items have valid timestamps
    data.forEach((item: any) => {
      expect(new Date(item.changed_at)).toBeInstanceOf(Date)
      expect(typeof item.field_changed).toBe('string')
    })

    // Should include sample changes for different preference types
    const fieldTypes = data.map((item: any) => item.field_changed)
    expect(fieldTypes).toContain('interests')
    expect(fieldTypes).toContain('delivery_time')
    expect(fieldTypes).toContain('content_depth')
  })

  it('handles database errors gracefully', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null
    })
    
    vi.mocked(createRouteHandlerClient).mockReturnValue({
      auth: {
        getUser: mockGetUser
      }
    } as any)
    
    vi.mocked(prisma.preferenceHistory.findMany).mockRejectedValue(
      new Error('Database connection failed')
    )

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch preference history')
  })
})