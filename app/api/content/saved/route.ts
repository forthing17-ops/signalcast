import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const searchParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20)
})

export async function GET(request: NextRequest) {
  try {
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
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate search parameters
    const { searchParams } = new URL(request.url)
    const params = searchParamsSchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    })

    // Calculate pagination
    const offset = (params.page - 1) * params.limit

    // Fetch saved content for the user
    const [savedContent, totalCount] = await Promise.all([
      prisma.content.findMany({
        where: {
          feedback: {
            some: {
              userId: user.id,
              isBookmarked: true
            }
          }
        },
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
      prisma.content.count({
        where: {
          feedback: {
            some: {
              userId: user.id,
              isBookmarked: true
            }
          }
        }
      })
    ])

    // Transform response to match API specification
    const transformedContent = savedContent.map(item => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      sourceUrls: item.sourceUrls,
      topics: item.topics,
      publishedAt: item.publishedAt.toISOString(),
      feedback: {
        rating: item.feedback[0]?.rating || null,
        saved: true // Always true for saved content
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
    console.error('Saved Content API Error:', error)
    
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