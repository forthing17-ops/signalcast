import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeKnowledgeGaps, suggestNextLearningTopics } from '@/lib/knowledge-gaps';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includesSuggestions = searchParams.get('suggestions') === 'true';

    // Analyze knowledge gaps
    const gapAnalysis = await analyzeKnowledgeGaps(user.id);

    let suggestions = null;
    if (includesSuggestions) {
      suggestions = await suggestNextLearningTopics(user.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        gaps: gapAnalysis,
        ...(suggestions && { suggestions }),
      },
    });
  } catch (error) {
    console.error('Error analyzing knowledge gaps:', error);
    return NextResponse.json(
      { error: 'Failed to analyze knowledge gaps' },
      { status: 500 }
    );
  }
}