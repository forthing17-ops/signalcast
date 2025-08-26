import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { DemoDatabase } from '@/lib/demo-db'
import { z } from 'zod'

const preferencesSchema = z.object({
  professional_role: z.string().optional(),
  industry: z.string().optional(),
  company_size: z.string().optional(),
  experience_level: z.string().optional(),
  interests: z.array(z.string()).optional(),
  tech_stack: z.array(z.string()).optional(),
  delivery_frequency: z.string().optional(),
  content_depth: z.enum(['brief', 'detailed']).optional(),
  content_formats: z.array(z.string()).optional(),
  curiosity_areas: z.array(z.string()).optional()
})

// GET /api/preferences - Get current user preferences
export async function GET(request: NextRequest) {
  try {
    // Demo mode
    if (process.env.DEMO_MODE === 'true') {
      const demoUserId = 'demo-user-1'
      const preferences = await DemoDatabase.getUserPreferences(demoUserId)
      
      return NextResponse.json({
        success: true,
        data: preferences
      })
    }

    // Production mode
    const supabase = createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id },
    })

    return NextResponse.json({
      success: true,
      data: preferences
    })
  } catch (error) {
    console.error('Failed to get preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get preferences' },
      { status: 500 }
    )
  }
}

// POST /api/preferences - Create new preferences during onboarding
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = preferencesSchema.parse(body)

    // Create or update user preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: {
        professionalRole: validatedData.professional_role,
        industry: validatedData.industry,
        companySize: validatedData.company_size,
        experienceLevel: validatedData.experience_level,
        interests: validatedData.interests || [],
        techStack: validatedData.tech_stack || [],
        deliveryFrequency: validatedData.delivery_frequency || 'daily',
        contentDepth: validatedData.content_depth || 'detailed',
        contentFormats: validatedData.content_formats || [],
        curiosityAreas: validatedData.curiosity_areas || [],
      },
      create: {
        userId: session.user.id,
        professionalRole: validatedData.professional_role,
        industry: validatedData.industry,
        companySize: validatedData.company_size,
        experienceLevel: validatedData.experience_level,
        interests: validatedData.interests || [],
        techStack: validatedData.tech_stack || [],
        deliveryFrequency: validatedData.delivery_frequency || 'daily',
        contentDepth: validatedData.content_depth || 'detailed',
        contentFormats: validatedData.content_formats || [],
        curiosityAreas: validatedData.curiosity_areas || [],
      },
    })

    return NextResponse.json({
      success: true,
      data: preferences
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Failed to create preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create preferences' },
      { status: 500 }
    )
  }
}

// PUT /api/preferences - Update preferences (for partial saves)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = preferencesSchema.parse(body)

    // Demo mode
    if (process.env.DEMO_MODE === 'true') {
      const demoUserId = 'demo-user-1'
      const updateData = {
        ...(validatedData.professional_role !== undefined && { professionalRole: validatedData.professional_role }),
        ...(validatedData.industry !== undefined && { industry: validatedData.industry }),
        ...(validatedData.company_size !== undefined && { companySize: validatedData.company_size }),
        ...(validatedData.experience_level !== undefined && { experienceLevel: validatedData.experience_level }),
        ...(validatedData.interests !== undefined && { interests: validatedData.interests }),
        ...(validatedData.tech_stack !== undefined && { techStack: validatedData.tech_stack }),
        ...(validatedData.delivery_frequency !== undefined && { deliveryFrequency: validatedData.delivery_frequency }),
        ...(validatedData.content_depth !== undefined && { contentDepth: validatedData.content_depth }),
        ...(validatedData.content_formats !== undefined && { contentFormats: validatedData.content_formats }),
        ...(validatedData.curiosity_areas !== undefined && { curiosityAreas: validatedData.curiosity_areas }),
      }

      const preferences = await DemoDatabase.updateUserPreferences(
        demoUserId,
        updateData,
        'Manual preference update'
      )

      return NextResponse.json({
        success: true,
        data: preferences
      })
    }

    // Production mode
    const supabase = createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Create preferences record if it doesn't exist
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: {
        ...(validatedData.professional_role !== undefined && { professionalRole: validatedData.professional_role }),
        ...(validatedData.industry !== undefined && { industry: validatedData.industry }),
        ...(validatedData.company_size !== undefined && { companySize: validatedData.company_size }),
        ...(validatedData.experience_level !== undefined && { experienceLevel: validatedData.experience_level }),
        ...(validatedData.interests !== undefined && { interests: validatedData.interests }),
        ...(validatedData.tech_stack !== undefined && { techStack: validatedData.tech_stack }),
        ...(validatedData.delivery_frequency !== undefined && { deliveryFrequency: validatedData.delivery_frequency }),
        ...(validatedData.content_depth !== undefined && { contentDepth: validatedData.content_depth }),
        ...(validatedData.content_formats !== undefined && { contentFormats: validatedData.content_formats }),
        ...(validatedData.curiosity_areas !== undefined && { curiosityAreas: validatedData.curiosity_areas }),
      },
      create: {
        userId: session.user.id,
        professionalRole: validatedData.professional_role || null,
        industry: validatedData.industry || null,
        companySize: validatedData.company_size || null,
        experienceLevel: validatedData.experience_level || null,
        interests: validatedData.interests || [],
        techStack: validatedData.tech_stack || [],
        deliveryFrequency: validatedData.delivery_frequency || 'daily',
        contentDepth: validatedData.content_depth || 'detailed',
        contentFormats: validatedData.content_formats || [],
        curiosityAreas: validatedData.curiosity_areas || [],
      },
    })

    return NextResponse.json({
      success: true,
      data: preferences
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Failed to update preferences:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}