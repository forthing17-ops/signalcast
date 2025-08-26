import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '@/app/api/content/route'
import { POST, DELETE } from '@/app/api/feedback/[contentId]/save/route'
import { NextRequest } from 'next/server'

// Mock Supabase
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn()
    }
  }))
}))

// Mock cookies
vi.mock('next/headers', () => ({
  cookies: () => ({
    getAll: vi.fn(() => []),
    set: vi.fn()
  })
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    content: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn()
    },
    userFeedback: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}))

import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'

describe('Content API Routes', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' }
  
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful authentication
    const mockSupabase = vi.mocked(createServerClient)()
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({ 
      data: { user: mockUser }, 
      error: null 
    })
  })

  describe('GET /api/content', () => {
    it('returns content list with pagination', async () => {
      const mockContent = [
        {
          id: '1',
          title: 'Test Article',
          summary: 'Test summary',
          sourceUrls: ['https://reddit.com/test'],
          topics: ['AI'],
          publishedAt: new Date('2024-01-15T09:00:00Z'),
          feedback: [{ rating: null, isBookmarked: false }]
        }
      ]
      
      vi.mocked(prisma.content.findMany).mockResolvedValue(mockContent)
      vi.mocked(prisma.content.count).mockResolvedValue(1)
      
      const request = new NextRequest('http://localhost:3000/api/content?page=1&limit=20')
      const response = await GET(request)
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe('Test Article')
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        hasMore: false
      })
    })

    it('handles search parameters', async () => {
      vi.mocked(prisma.content.findMany).mockResolvedValue([])
      vi.mocked(prisma.content.count).mockResolvedValue(0)
      
      const request = new NextRequest('http://localhost:3000/api/content?page=1&limit=20&search=test&topics=AI,Development')
      await GET(request)
      
      expect(vi.mocked(prisma.content.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: 'test', mode: 'insensitive' } },
              { summary: { contains: 'test', mode: 'insensitive' } }
            ],
            topics: {
              hasSome: ['AI', 'Development']
            }
          }
        })
      )
    })

    it('returns 401 for unauthenticated requests', async () => {
      const mockSupabase = require('@supabase/ssr').createServerClient()
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: null }, 
        error: new Error('Unauthorized') 
      })
      
      const request = new NextRequest('http://localhost:3000/api/content')
      const response = await GET(request)
      
      expect(response.status).toBe(401)
    })

    it('validates query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/content?page=0&limit=100')
      const response = await GET(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid parameters')
    })
  })

  describe('POST /api/feedback/[contentId]/save', () => {
    it('successfully bookmarks content', async () => {
      vi.mocked(prisma.content.findUnique).mockResolvedValue({
        id: 'content-123',
        title: 'Test Content'
      } as any)
      
      vi.mocked(prisma.userFeedback.upsert).mockResolvedValue({
        id: 'feedback-123',
        userId: 'user-123',
        contentId: 'content-123',
        rating: null,
        isBookmarked: true
      } as any)
      
      const request = new NextRequest('http://localhost:3000/api/feedback/content-123/save')
      const response = await POST(request, { params: { contentId: 'content-123' } })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.feedback.saved).toBe(true)
      
      expect(vi.mocked(prisma.userFeedback.upsert)).toHaveBeenCalledWith({
        where: {
          userId_contentId: {
            userId: 'user-123',
            contentId: 'content-123'
          }
        },
        update: {
          isBookmarked: true,
          updatedAt: expect.any(Date)
        },
        create: {
          userId: 'user-123',
          contentId: 'content-123',
          isBookmarked: true
        }
      })
    })

    it('returns 404 for non-existent content', async () => {
      vi.mocked(prisma.content.findUnique).mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/feedback/non-existent/save')
      const response = await POST(request, { params: { contentId: 'non-existent' } })
      
      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/feedback/[contentId]/save', () => {
    it('removes bookmark successfully', async () => {
      vi.mocked(prisma.userFeedback.findUnique).mockResolvedValue({
        id: 'feedback-123',
        userId: 'user-123',
        contentId: 'content-123',
        rating: null,
        feedback: null,
        isBookmarked: true
      } as any)
      
      vi.mocked(prisma.userFeedback.delete).mockResolvedValue({} as any)
      
      const request = new NextRequest('http://localhost:3000/api/feedback/content-123/save')
      const response = await DELETE(request, { params: { contentId: 'content-123' } })
      
      expect(response.status).toBe(200)
      const data = await response.json()
      
      expect(data.success).toBe(true)
      expect(data.feedback.saved).toBe(false)
    })

    it('updates bookmark status when other feedback exists', async () => {
      vi.mocked(prisma.userFeedback.findUnique).mockResolvedValue({
        id: 'feedback-123',
        userId: 'user-123',
        contentId: 'content-123',
        rating: 4,
        feedback: 'Great article',
        isBookmarked: true
      } as any)
      
      vi.mocked(prisma.userFeedback.update).mockResolvedValue({
        id: 'feedback-123',
        rating: 4,
        isBookmarked: false
      } as any)
      
      const request = new NextRequest('http://localhost:3000/api/feedback/content-123/save')
      const response = await DELETE(request, { params: { contentId: 'content-123' } })
      
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.userFeedback.update)).toHaveBeenCalled()
      expect(vi.mocked(prisma.userFeedback.delete)).not.toHaveBeenCalled()
    })

    it('returns 404 for non-existent feedback', async () => {
      vi.mocked(prisma.userFeedback.findUnique).mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/feedback/content-123/save')
      const response = await DELETE(request, { params: { contentId: 'content-123' } })
      
      expect(response.status).toBe(404)
    })
  })
})