import { NextRequest, NextResponse } from 'next/server'
import { processNaturalLanguageInterests } from '@/lib/interests-processor'

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json()

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    const result = await processNaturalLanguageInterests(description)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error processing interests:', error)
    return NextResponse.json(
      { error: 'Failed to process interests' },
      { status: 500 }
    )
  }
}