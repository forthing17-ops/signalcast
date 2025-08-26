import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { DemoDatabase } from '@/lib/demo-db'
import { z } from 'zod'

const searchParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  search: z.string().nullable().optional(),
  topics: z.string().nullable().optional()
})

export async function GET(request: NextRequest) {
  try {
    // Parse and validate search parameters
    const { searchParams } = new URL(request.url)
    const params = searchParamsSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      topics: searchParams.get('topics')
    })

    // Demo mode
    if (process.env.DEMO_MODE === 'true') {
      const demoUserId = 'demo-user-1'
      const content = await DemoDatabase.getContent(demoUserId)
      
      // Apply basic filtering for demo
      let filteredContent = content
      if (params.search && params.search.trim()) {
        filteredContent = content.filter(item => 
          item.title.toLowerCase().includes(params.search!.toLowerCase()) ||
          item.summary.toLowerCase().includes(params.search!.toLowerCase())
        )
      }
      
      if (params.topics && params.topics.trim()) {
        const topicArray = params.topics.split(',').filter(Boolean)
        filteredContent = filteredContent.filter(item =>
          topicArray.some(topic => item.topics.includes(topic))
        )
      }
      
      // Apply pagination for demo
      const offset = (params.page - 1) * params.limit
      const paginatedContent = filteredContent.slice(offset, offset + params.limit)
      
      const transformedContent = paginatedContent.map(item => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        sourceUrls: item.sourceUrls,
        topics: item.topics,
        publishedAt: item.publishedAt.toISOString(),
        feedback: {
          rating: null,
          saved: false
        }
      }))

      const hasMore = offset + params.limit < filteredContent.length

      return NextResponse.json({
        data: transformedContent,
        pagination: {
          page: params.page,
          limit: params.limit,
          total: filteredContent.length,
          hasMore
        }
      })
    }

    // Production mode
    // Initialize Supabase client
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          }
        }
      }
    )
    
    // Get authenticated user
    let user
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError || !data?.user) {
      // Fallback for development/testing when Supabase is not available
      if (process.env.NODE_ENV === 'development') {
        // Use test user for development
        user = { id: 'test-user-1', email: 'test@signalcast.com' }
      } else {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      user = data.user
    }

    // Build where clause for content filtering
    const whereClause: {
      OR?: Array<{ title: { contains: string; mode: 'insensitive' } } | { summary: { contains: string; mode: 'insensitive' } }>
      topics?: { hasSome: string[] }
    } = {}

    // Add search filtering
    if (params.search && params.search.trim()) {
      whereClause.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { summary: { contains: params.search, mode: 'insensitive' } }
      ]
    }

    // Add topic filtering
    if (params.topics && params.topics.trim()) {
      const topicArray = params.topics.split(',').filter(Boolean)
      whereClause.topics = {
        hasSome: topicArray
      }
    }

    // Calculate pagination
    const offset = (params.page - 1) * params.limit

    // Fetch content with user feedback
    const [content, totalCount] = await Promise.all([
      prisma.content.findMany({
        where: whereClause,
        include: {
          feedback: {
            where: { userId: user.id },
            select: { rating: true, isBookmarked: true }
          }
        },
        orderBy: { publishedAt: 'desc' },
        skip: offset,
        take: params.limit
      }),
      prisma.content.count({ where: whereClause })
    ])

    // Transform response to match API specification
    const transformedContent = content.map(item => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      sourceUrls: item.sourceUrls,
      topics: item.topics,
      publishedAt: item.publishedAt.toISOString(),
      feedback: item.feedback[0] ? {
        rating: item.feedback[0].rating,
        saved: item.feedback[0].isBookmarked
      } : {
        rating: null,
        saved: false
      }
    }))

    const hasMore = offset + params.limit < totalCount

    return NextResponse.json({
      data: transformedContent,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: totalCount,
        hasMore
      }
    })

  } catch (error) {
    console.error('Content API Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}