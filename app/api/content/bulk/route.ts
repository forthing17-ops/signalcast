import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

interface BulkContentItem {
  title: string;
  summary: string;
  content: string;
  sourceUrls: string[];
  topics: string[];
  sourcePlatform?: string;
  sourceMetadata?: any;
  relevanceScore?: number;
  contentHash?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentItems }: { contentItems: BulkContentItem[] } = await request.json();

    if (!Array.isArray(contentItems) || contentItems.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: contentItems array is required' },
        { status: 400 }
      );
    }

    // Validate content items
    const validationErrors: string[] = [];
    contentItems.forEach((item, index) => {
      if (!item.title) validationErrors.push(`Item ${index}: title is required`);
      if (!item.summary) validationErrors.push(`Item ${index}: summary is required`);
      if (!item.content) validationErrors.push(`Item ${index}: content is required`);
      if (!Array.isArray(item.sourceUrls) || item.sourceUrls.length === 0) {
        validationErrors.push(`Item ${index}: sourceUrls array is required`);
      }
      if (!Array.isArray(item.topics)) {
        validationErrors.push(`Item ${index}: topics array is required`);
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Prepare data for bulk insert
    const contentToInsert = contentItems.map(item => ({
      title: item.title,
      summary: item.summary,
      content: item.content,
      sourceUrls: item.sourceUrls,
      topics: item.topics,
      createdBy: user.id,
      sourcePlatform: item.sourcePlatform || null,
      sourceMetadata: item.sourceMetadata || null,
      relevanceScore: item.relevanceScore || null,
      contentHash: item.contentHash || null,
    }));

    // Perform bulk insert with duplicate skip
    const result = await prisma.content.createMany({
      data: contentToInsert,
      skipDuplicates: true,
    });

    logger.info(`Bulk inserted ${result.count} content items for user ${user.id}`);

    // Get the inserted content (for response)
    const insertedContent = await prisma.content.findMany({
      where: {
        createdBy: user.id,
        publishedAt: {
          gte: new Date(Date.now() - 10000), // Last 10 seconds
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: result.count,
    });

    return NextResponse.json({
      success: true,
      inserted: result.count,
      total: contentItems.length,
      skipped: contentItems.length - result.count,
      content: insertedContent,
    });

  } catch (error) {
    logger.error('Bulk content creation failed', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve bulk content for user
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sourcePlatform = searchParams.get('sourcePlatform');
    const minRelevanceScore = parseFloat(searchParams.get('minRelevanceScore') || '0');

    // Build where clause
    const whereClause: any = {
      createdBy: user.id,
    };

    if (sourcePlatform) {
      whereClause.sourcePlatform = sourcePlatform;
    }

    if (minRelevanceScore > 0) {
      whereClause.relevanceScore = {
        gte: minRelevanceScore,
      };
    }

    // Get content with pagination
    const [content, totalCount] = await Promise.all([
      prisma.content.findMany({
        where: whereClause,
        orderBy: [
          { relevanceScore: 'desc' },
          { publishedAt: 'desc' },
        ],
        take: Math.min(limit, 100), // Max 100 items per request
        skip: offset,
        include: {
          feedback: {
            where: {
              userId: user.id,
            },
          },
        },
      }),
      prisma.content.count({
        where: whereClause,
      }),
    ]);

    // Add aggregated feedback data
    const contentWithFeedback = content.map(item => ({
      ...item,
      userFeedback: item.feedback[0] || null,
      feedback: undefined, // Remove the full feedback array
    }));

    return NextResponse.json({
      content: contentWithFeedback,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
      filters: {
        sourcePlatform,
        minRelevanceScore,
      },
    });

  } catch (error) {
    logger.error('Bulk content retrieval failed', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}