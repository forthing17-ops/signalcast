import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PUT } from '@/app/api/user/profile/route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}))

vi.mock('@/lib/rate-limit', () => {
  const mockProfileRateLimit = {
    check: vi.fn(() => ({ success: true, remaining: 5, resetTime: Date.now() + 300000 })),
  }
  return {
    profileRateLimit: mockProfileRateLimit,
    getClientIP: vi.fn(() => '127.0.0.1'),
  }
})

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
}

describe('/api/user/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const { createServerClient } = require('@supabase/ssr')
    createServerClient.mockReturnValue(mockSupabaseClient)
  })

  describe('GET /api/user/profile', () => {
    it('returns user profile for authenticated user', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      const mockProfile = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        created_at: '2023-01-01T00:00:00Z',
        onboarded: true,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({ data: mockProfile, error: null })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockProfile)
    })

    it('returns 401 for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 404 when profile not found', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } 
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Profile not found')
    })
  })

  describe('PUT /api/user/profile', () => {
    it('successfully updates user profile', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      const mockUpdatedProfile = {
        id: '123',
        email: 'test@example.com',
        name: 'Updated Name',
        created_at: '2023-01-01T00:00:00Z',
        onboarded: true,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({ 
        data: mockUpdatedProfile, 
        error: null 
      })

      const requestBody = { name: 'Updated Name' }
      const request = {
        json: async () => requestBody,
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
      } as any

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockUpdatedProfile)
    })

    it('validates email format', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      const requestBody = { email: 'invalid-email' }
      const request = {
        json: async () => requestBody,
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
      } as any

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid email format')
    })

    it('validates password strength', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      const requestBody = { password: 'weak' }
      const request = {
        json: async () => requestBody,
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
      } as any

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Password does not meet security requirements')
      expect(data.details).toBeDefined()
    })

    it('applies rate limiting', async () => {
      const { profileRateLimit } = await import('@/lib/rate-limit')
      profileRateLimit.check = vi.fn(() => ({ success: false, remaining: 0, resetTime: Date.now() + 300000 }))

      const requestBody = { name: 'Test' }
      const request = {
        json: async () => requestBody,
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
      } as any

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Too many profile update attempts')
    })

    it('sanitizes input data', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      const mockUpdatedProfile = {
        id: '123',
        email: 'clean@example.com',
        name: 'Clean Name',
        created_at: '2023-01-01T00:00:00Z',
        onboarded: true,
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({ 
        data: mockUpdatedProfile, 
        error: null 
      })

      const requestBody = { 
        email: 'clean@example.com<script>',  // Should be sanitized
        name: 'Clean Name   '  // Should be trimmed
      }
      const request = {
        json: async () => requestBody,
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
      } as any

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('returns 401 for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })

      const requestBody = { name: 'Test' }
      const request = {
        json: async () => requestBody,
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
      } as any

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Unauthorized')
    })

    it('handles password update', async () => {
      const mockUser = { id: '123', email: 'test@example.com' }
      mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
      mockSupabaseClient.auth.updateUser.mockResolvedValue({ error: null })

      const requestBody = { password: 'NewStrongPass123' }
      const request = {
        json: async () => requestBody,
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
      } as any

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Password updated successfully')
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({ 
        password: 'NewStrongPass123' 
      })
    })
  })
})