import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PrismaClient } from '@prisma/client';
import { getUserKnowledgeOverview } from '@/lib/knowledge-progression';
import { analyzeKnowledgeGaps } from '@/lib/knowledge-gaps';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const includeContent = searchParams.get('includeContent') === 'true';
    const includeGaps = searchParams.get('includeGaps') === 'true';

    // Gather all knowledge data
    const [knowledgeOverview, gapAnalysis, userContent, contentRelationships] = await Promise.all([
      getUserKnowledgeOverview(user.id),
      includeGaps ? analyzeKnowledgeGaps(user.id) : null,
      includeContent ? prisma.content.findMany({
        where: { createdBy: user.id },
        select: {
          id: true,
          title: true,
          summary: true,
          topics: true,
          publishedAt: true,
          delivered: true,
          knowledgeMetadata: true,
        },
      }) : null,
      includeContent ? prisma.contentRelationship.findMany({
        where: {
          OR: [
            { parentContent: { createdBy: user.id } },
            { childContent: { createdBy: user.id } },
          ],
        },
        include: {
          parentContent: { select: { id: true, title: true } },
          childContent: { select: { id: true, title: true } },
        },
      }) : null,
    ]);

    // Prepare export data
    const exportData = {
      exportDate: new Date().toISOString(),
      userId: user.id,
      userEmail: user.email,
      knowledge: {
        overview: knowledgeOverview,
        areas: knowledgeOverview.knowledgeAreas,
      },
      ...(gapAnalysis && { gaps: gapAnalysis }),
      ...(userContent && { content: userContent }),
      ...(contentRelationships && { relationships: contentRelationships }),
    };

    // Handle different export formats
    if (format === 'csv') {
      return exportAsCSV(exportData);
    } else {
      // Default to JSON
      const response = NextResponse.json({
        success: true,
        data: exportData,
      });

      // Add download headers
      response.headers.set('Content-Disposition', 
        `attachment; filename="knowledge-export-${new Date().toISOString().split('T')[0]}.json"`
      );

      return response;
    }
  } catch (error) {
    console.error('Error exporting knowledge data:', error);
    return NextResponse.json(
      { error: 'Failed to export knowledge data' },
      { status: 500 }
    );
  }
}

interface ExportData {
  exportDate: string;
  userId: string;
  userEmail: string;
  knowledge: {
    overview: any;
    areas: Array<{
      topic: string;
      confidenceLevel: number;
      contentCount: number;
      knowledgeDepth: string;
      lastInteraction: Date;
      progressionScore: number;
    }>;
  };
  gaps?: {
    identifiedGaps: Array<{
      topic: string;
      gapType: string;
      severity: string;
      description: string;
      priority: number;
      foundationalImportance: number;
    }>;
  };
  content?: Array<{
    id: string;
    title: string;
    topics: string[];
    publishedAt: Date;
    delivered: boolean;
  }>;
}

function exportAsCSV(data: ExportData): NextResponse {
  const csvRows: string[] = [];

  // CSV sanitization function to prevent injection attacks
  const sanitizeCSVField = (field: string): string => {
    if (field == null) return '';
    const stringField = field.toString();
    // Remove or escape potentially dangerous characters
    const sanitized = stringField
      .replace(/[=@+\-]/g, '') // Remove formula injection characters
      .replace(/"/g, '""'); // Escape quotes
    return `"${sanitized}"`;
  };

  // Knowledge areas CSV
  csvRows.push('# Knowledge Export - Areas');
  csvRows.push('Topic,Confidence Level,Content Count,Knowledge Depth,Last Interaction,Progression Score');
  
  for (const area of data.knowledge.areas) {
    csvRows.push([
      sanitizeCSVField(area.topic),
      sanitizeCSVField(area.confidenceLevel.toString()),
      sanitizeCSVField(area.contentCount.toString()),
      sanitizeCSVField(area.knowledgeDepth),
      sanitizeCSVField(area.lastInteraction),
      sanitizeCSVField(area.progressionScore.toString()),
    ].join(','));
  }

  // Gaps CSV (if included)
  if (data.gaps) {
    csvRows.push('');
    csvRows.push('# Knowledge Gaps');
    csvRows.push('Topic,Gap Type,Severity,Description,Priority,Foundational Importance');
    
    for (const gap of data.gaps.identifiedGaps) {
      csvRows.push([
        sanitizeCSVField(gap.topic),
        sanitizeCSVField(gap.gapType),
        sanitizeCSVField(gap.severity),
        sanitizeCSVField(gap.description),
        sanitizeCSVField(gap.priority.toString()),
        sanitizeCSVField(gap.foundationalImportance.toString()),
      ].join(','));
    }
  }

  // Content CSV (if included)
  if (data.content) {
    csvRows.push('');
    csvRows.push('# Content');
    csvRows.push('ID,Title,Topics,Published Date,Delivered');
    
    for (const content of data.content) {
      csvRows.push([
        sanitizeCSVField(content.id),
        sanitizeCSVField(content.title),
        sanitizeCSVField(content.topics.join('; ')),
        sanitizeCSVField(content.publishedAt),
        sanitizeCSVField(content.delivered.toString()),
      ].join(','));
    }
  }

  const csvContent = csvRows.join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 
        `attachment; filename="knowledge-export-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}