import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserKnowledgeOverview } from '@/lib/knowledge-progression';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's knowledge overview
    const knowledgeOverview = await getUserKnowledgeOverview(user.id);

    return NextResponse.json({
      success: true,
      data: knowledgeOverview,
    });
  } catch (error) {
    console.error('Error fetching knowledge overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge overview' },
      { status: 500 }
    );
  }
}