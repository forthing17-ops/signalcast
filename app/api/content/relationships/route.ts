import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  discoverContentRelationships, 
  getContentRelationships, 
  recommendContentRelationships 
} from '@/lib/content-relationships';

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
    const action = searchParams.get('action') || 'discover';

    let result;

    switch (action) {
      case 'discover':
        // Discover relationships for all user content or specific content
        const contentIds = contentId ? [contentId] : undefined;
        result = await discoverContentRelationships(user.id, contentIds);
        break;

      case 'get':
        if (!contentId) {
          return NextResponse.json(
            { error: 'contentId required for get action' },
            { status: 400 }
          );
        }
        result = await getContentRelationships(contentId);
        break;

      case 'recommend':
        result = await recommendContentRelationships(user.id);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error in content relationships:', error);
    return NextResponse.json(
      { error: 'Failed to process content relationships' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, contentIds } = body;

    if (action === 'rediscover') {
      // Force rediscovery of relationships for specific content
      const result = await discoverContentRelationships(user.id, contentIds);
      
      return NextResponse.json({
        success: true,
        data: result,
        message: `Rediscovered relationships for ${contentIds?.length || 'all'} content pieces`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in content relationships POST:', error);
    return NextResponse.json(
      { error: 'Failed to process content relationships' },
      { status: 500 }
    );
  }
}