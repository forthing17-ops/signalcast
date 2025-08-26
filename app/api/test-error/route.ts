import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    // Simulate an error for testing logging
    throw new Error('This is a test error')
  } catch (error) {
    logger.error(
      'Test error endpoint triggered',
      error instanceof Error ? error : new Error('Unknown error'),
      { endpoint: '/api/test-error', method: 'GET' }
    )
    
    return NextResponse.json(
      { error: 'Internal server error', message: 'Check logs for details' },
      { status: 500 }
    )
  }
}