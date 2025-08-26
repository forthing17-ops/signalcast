import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { DemoDatabase } from '@/lib/demo-db'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Demo mode
    if (process.env.DEMO_MODE === 'true') {
      const demoUserId = 'demo-user-1'
      const exportData = await DemoDatabase.exportPreferences(demoUserId)
      
      return NextResponse.json(JSON.parse(exportData), {
        headers: {
          'Content-Disposition': `attachment; filename="preferences-backup-${new Date().toISOString().split('T')[0]}.json"`,
        },
      })
    }

    // Production mode
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user preferences from database
    const preferences = await prisma.userPreferences.findFirst({
      where: {
        userId: user.id,
      },
    })

    if (!preferences) {
      return NextResponse.json({ error: 'No preferences found' }, { status: 404 })
    }

    // Create export data with metadata
    const exportData = {
      export_version: '1.0',
      export_date: new Date().toISOString(),
      user_id: user.id,
      preferences: {
        interests: preferences.interests,
        tech_stack: preferences.techStack,
        content_depth: preferences.contentDepth,
        professional_role: preferences.professionalRole,
        industry: preferences.industry,
        company_size: preferences.companySize,
        experience_level: preferences.experienceLevel,
        curiosity_areas: preferences.curiosityAreas,
        delivery_frequency: preferences.deliveryFrequency,
        content_formats: preferences.contentFormats,
      },
    }

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="preferences-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exporting preferences:', error)
    return NextResponse.json(
      { error: 'Failed to export preferences' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}