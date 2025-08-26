import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ImportPreferencesSchema = z.object({
  export_version: z.string().optional(),
  export_date: z.string().optional(),
  user_id: z.string().optional(),
  preferences: z.object({
    interests: z.array(z.string()).optional(),
    tech_stack: z.array(z.string()).optional(),
    delivery_time: z.string().optional(),
    content_depth: z.enum(['brief', 'detailed']).optional(),
    professional_role: z.string().optional(),
    industry: z.string().optional(),
    company_size: z.string().optional(),
    experience_level: z.string().optional(),
    curiosity_areas: z.array(z.string()).optional(),
    delivery_frequency: z.string().optional(),
    content_formats: z.array(z.string()).optional(),
    enabled_sources: z.array(z.string()).optional(),
    platform_preferences: z.record(z.boolean()).optional(),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate import data
    const validation = ImportPreferencesSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        message: 'Invalid import data format. Please check your file and try again.',
        errors: validation.error.issues,
      }, { status: 400 })
    }

    const { preferences: importedPrefs } = validation.data

    // Get current preferences to identify conflicts
    const currentPrefs = await prisma.userPreferences.findFirst({
      where: { user_id: user.id },
    })

    const conflicts: string[] = []
    const importedFields: string[] = []

    // Build update data, tracking conflicts
    const updateData: Record<string, unknown> = {}
    
    Object.entries(importedPrefs).forEach(([field, value]) => {
      if (value !== undefined) {
        importedFields.push(field)
        if (currentPrefs && currentPrefs[field as keyof typeof currentPrefs] !== value) {
          conflicts.push(field)
        }
        updateData[field] = value
      }
    })

    // Update preferences in database
    await prisma.userPreferences.upsert({
      where: { user_id: user.id },
      create: {
        user_id: user.id,
        ...updateData,
      },
      update: updateData,
    })

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedFields.length} preference fields.`,
      imported_fields: importedFields,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    })

  } catch (error) {
    console.error('Error importing preferences:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to import preferences. Please try again.',
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}