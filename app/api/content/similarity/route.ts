import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { compareContentSimilarity, findSimilarContent, detectRepetitiveContent } from '@/lib/content-similarity';
import { z } from 'zod';

const similarityRequestSchema = z.object({
  contentId1: z.string().uuid(),
  contentId2: z.string().uuid().optional(),
  action: z.enum(['compare', 'findSimilar', 'detectRepetitive']).default('compare'),
  options: z.object({
    threshold: z.number().min(0).max(1).optional(),
    limit: z.number().min(1).max(50).optional(),
    excludeDelivered: z.boolean().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = similarityRequestSchema.parse(body);
    const { contentId1, contentId2, action, options = {} } = validatedData;

    let result;

    switch (action) {
      case 'compare':
        if (!contentId2) {
          return NextResponse.json(
            { error: 'contentId2 required for compare action' },
            { status: 400 }
          );
        }
        result = await compareContentSimilarity(contentId1, contentId2);
        break;

      case 'findSimilar':
        result = await findSimilarContent(contentId1, user.id, options);
        break;

      case 'detectRepetitive':
        // Get user's novelty preference
        const preferences = await supabase
          .from('user_preferences')
          .select('noveltyPreference')
          .eq('userId', user.id)
          .single();
        
        const noveltyPreference = preferences.data?.noveltyPreference || 0.7;
        result = await detectRepetitiveContent(contentId1, user.id, noveltyPreference);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error in similarity analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze content similarity' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');

    if (!contentId) {
      return NextResponse.json(
        { error: 'contentId parameter required' },
        { status: 400 }
      );
    }

    // Find similar content for the specified content ID
    const similarContent = await findSimilarContent(contentId, user.id, {
      threshold: 0.5,
      limit: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        contentId,
        similarContent,
        totalFound: similarContent.length,
      },
    });
  } catch (error) {
    console.error('Error finding similar content:', error);
    return NextResponse.json(
      { error: 'Failed to find similar content' },
      { status: 500 }
    );
  }
}