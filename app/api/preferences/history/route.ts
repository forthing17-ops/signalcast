import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DemoDatabase } from '@/lib/demo-db'

export async function GET() {
  try {
    // Demo mode
    if (process.env.DEMO_MODE === 'true') {
      const demoUserId = 'demo-user-1'
      const history = await DemoDatabase.getPreferenceHistory(demoUserId)
      
      // Transform the data to match the expected format
      const formattedHistory = history.map(item => ({
        id: item.id,
        field_changed: item.fieldChanged,
        old_value: item.oldValue ? JSON.parse(item.oldValue) : null,
        new_value: item.newValue ? JSON.parse(item.newValue) : null,
        changed_at: item.changedAt.toISOString(),
        change_reason: item.changeReason,
      }))

      return NextResponse.json(formattedHistory)
    }

    // Production mode
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query preference history from database
    const history = await prisma.preferenceHistory.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        changedAt: 'desc',
      },
      take: 50, // Limit to most recent 50 changes
    })

    // Transform the data to match the expected format
    const formattedHistory = history.map(item => ({
      id: item.id,
      field_changed: item.fieldChanged,
      old_value: item.oldValue ? JSON.parse(item.oldValue) : null,
      new_value: item.newValue ? JSON.parse(item.newValue) : null,
      changed_at: item.changedAt.toISOString(),
      change_reason: item.changeReason,
    }))

    return NextResponse.json(formattedHistory)
  } catch (error) {
    console.error('Error fetching preference history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preference history' },
      { status: 500 }
    )
  }
}