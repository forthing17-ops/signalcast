import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    contentId: string
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError || !data?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = data.user

    const { contentId } = params

    // Verify content exists
    const content = await prisma.content.findUnique({
      where: { id: contentId }
    })

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Upsert user feedback to save content
    const feedback = await prisma.userFeedback.upsert({
      where: {
        userId_contentId: {
          userId: user.id,
          contentId
        }
      },
      update: {
        isBookmarked: true,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        contentId,
        isBookmarked: true
      }
    })

    return NextResponse.json({
      success: true,
      feedback: {
        rating: feedback.rating,
        saved: feedback.isBookmarked
      }
    })

  } catch (error) {
    console.error('Save Content API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError || !data?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = data.user

    const { contentId } = params

    // Find existing feedback
    const existingFeedback = await prisma.userFeedback.findUnique({
      where: {
        userId_contentId: {
          userId: user.id,
          contentId
        }
      }
    })

    if (!existingFeedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    // If feedback has other data (rating, feedback text), just update bookmark status
    // Otherwise, delete the entire feedback record
    if (existingFeedback.rating !== null || existingFeedback.feedback !== null) {
      const updatedFeedback = await prisma.userFeedback.update({
        where: {
          userId_contentId: {
            userId: user.id,
            contentId
          }
        },
        data: {
          isBookmarked: false,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        feedback: {
          rating: updatedFeedback.rating,
          saved: false
        }
      })
    } else {
      // Delete the feedback record entirely
      await prisma.userFeedback.delete({
        where: {
          userId_contentId: {
            userId: user.id,
            contentId
          }
        }
      })

      return NextResponse.json({
        success: true,
        feedback: {
          rating: null,
          saved: false
        }
      })
    }

  } catch (error) {
    console.error('Remove Save Content API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}