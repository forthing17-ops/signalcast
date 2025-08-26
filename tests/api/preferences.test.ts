import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST, PUT } from '@/app/api/preferences/route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn()
    }
  }))
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    userPreferences: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    }
  }
}))

const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com'
  }
}

const mockPreferences = {
  id: 'pref-id',
  userId: 'test-user-id',
  professionalRole: 'Software Engineer',
  industry: 'Software/Technology',
  companySize: 'Medium (51-200)',
  experienceLevel: 'Senior (6-10 years)',
  interests: ['React', 'TypeScript'],
  techStack: ['JavaScript', 'Node.js'],
  deliveryFrequency: 'daily',
  contentDepth: 'detailed',
  contentFormats: ['articles', 'videos'],
  curiosityAreas: ['AI/ML', 'WebAssembly']
}

describe('/api/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('returns user preferences when authenticated', async () => {
      const { createServerClient } = await import('@/lib/supabase/server')
      const { prisma } = await import('@/lib/prisma')
      
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: mockSession }
          })
        }
      }
      
      vi.mocked(createServerClient).mockReturnValue(mockSupabase as any)
      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(mockPreferences as any)

      const request = new NextRequest('http://localhost:3000/api/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockPreferences)
    })

    it('returns 401 when not authenticated', async () => {
      const { createServerClient } = await import('@/lib/supabase/server')
      
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null }
          })
        }
      }
      
      vi.mocked(createServerClient).mockReturnValue(mockSupabase as any)

      const request = new NextRequest('http://localhost:3000/api/preferences')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST', () => {
    it('creates new preferences when authenticated', async () => {
      const { createServerClient } = await import('@/lib/supabase/server')
      const { prisma } = await import('@/lib/prisma')
      
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: mockSession }
          })
        }
      }
      
      vi.mocked(createServerClient).mockReturnValue(mockSupabase as any)
      vi.mocked(prisma.userPreferences.upsert).mockResolvedValue(mockPreferences as any)

      const requestBody = {
        professional_role: 'Software Engineer',
        industry: 'Software/Technology',
        interests: ['React', 'TypeScript'],
        tech_stack: ['JavaScript', 'Node.js'],
        content_depth: 'detailed'
      }

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockPreferences)
      expect(prisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        update: expect.objectContaining({
          professionalRole: 'Software Engineer',
          industry: 'Software/Technology'
        }),
        create: expect.objectContaining({
          userId: 'test-user-id',
          professionalRole: 'Software Engineer',
          industry: 'Software/Technology'
        })
      })
    })

    it('returns 400 for invalid data', async () => {
      const { createServerClient } = await import('@/lib/supabase/server')
      
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: mockSession }
          })
        }
      }
      
      vi.mocked(createServerClient).mockReturnValue(mockSupabase as any)

      const requestBody = {
        content_depth: 'invalid-depth' // Invalid enum value
      }

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation failed')
    })
  })

  describe('PUT', () => {
    it('updates existing preferences partially', async () => {
      const { createServerClient } = await import('@/lib/supabase/server')
      const { prisma } = await import('@/lib/prisma')
      
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: mockSession }
          })
        }
      }
      
      vi.mocked(createServerClient).mockReturnValue(mockSupabase as any)
      vi.mocked(prisma.userPreferences.upsert).mockResolvedValue(mockPreferences as any)

      const requestBody = {
        interests: ['React', 'Vue.js', 'Angular']
      }

      const request = new NextRequest('http://localhost:3000/api/preferences', {
        method: 'PUT',
        body: JSON.stringify(requestBody)
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.userPreferences.upsert).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        update: expect.objectContaining({
          interests: ['React', 'Vue.js', 'Angular']
        }),
        create: expect.objectContaining({
          userId: 'test-user-id',
          interests: ['React', 'Vue.js', 'Angular']
        })
      })
    })
  })
})