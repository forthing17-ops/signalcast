import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const PreviewRequestSchema = z.object({
  interests: z.array(z.string()).optional(),
  tech_stack: z.array(z.string()).optional(),
  content_depth: z.enum(['brief', 'detailed']).optional(),
  enabled_sources: z.array(z.string()).optional(),
  delivery_frequency: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = PreviewRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid preview request' },
        { status: 400 }
      )
    }

    const preferences = validation.data

    // Generate mock preview content based on preferences
    const mockContent = generatePreviewContent(preferences)

    return NextResponse.json({
      preview: mockContent,
      generated_at: new Date().toISOString(),
      preferences_applied: preferences,
    })

  } catch (error) {
    console.error('Error generating preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}

function generatePreviewContent(preferences: Record<string, unknown>) {
  const { interests = [], tech_stack = [], content_depth = 'brief', enabled_sources = [] } = preferences

  // Mock content based on interests and tech stack
  const contentItems = []

  // Generate content based on interests
  if (interests.includes('Machine Learning') || tech_stack.includes('Python')) {
    contentItems.push({
      title: 'New PyTorch 2.0 Features for Production ML',
      source: enabled_sources.includes('reddit') ? 'Reddit r/MachineLearning' : 'Tech News',
      summary: content_depth === 'brief' 
        ? 'PyTorch 2.0 introduces compilation improvements and better performance for production ML models.'
        : 'PyTorch 2.0 brings significant improvements including torch.compile for 2x speedups, improved memory efficiency, and better production deployment tools. The update focuses on reducing the gap between research and production ML workflows.',
      relevance_score: 95,
      tags: ['Machine Learning', 'PyTorch', 'Production'],
    })
  }

  if (interests.includes('React') || tech_stack.includes('React')) {
    contentItems.push({
      title: 'React 18 Concurrent Features Deep Dive',
      source: enabled_sources.includes('product-hunt') ? 'Product Hunt' : 'Dev Community',
      summary: content_depth === 'brief'
        ? 'Explore React 18 concurrent features like Suspense boundaries and automatic batching.'
        : 'React 18\'s concurrent features revolutionize how we handle asynchronous operations. Suspense boundaries allow better loading states, while automatic batching improves performance by grouping state updates. startTransition helps maintain responsive UIs during heavy computations.',
      relevance_score: 88,
      tags: ['React', 'Frontend', 'Performance'],
    })
  }

  if (interests.includes('Startup') || interests.includes('Product Management')) {
    contentItems.push({
      title: 'YC Demo Day Highlights: AI Infrastructure Trends',
      source: enabled_sources.includes('product-hunt') ? 'Product Hunt' : 'Startup News',
      summary: content_depth === 'brief'
        ? 'Y Combinator\'s latest batch shows strong focus on AI infrastructure and developer tools.'
        : 'The latest Y Combinator Demo Day featured 200+ startups, with 40% focusing on AI infrastructure. Key trends include MLOps platforms, AI-powered development tools, and infrastructure for training large language models. Notable companies include ModelFlow (model deployment) and CodeAI (automated code review).',
      relevance_score: 82,
      tags: ['Startup', 'AI', 'Y Combinator'],
    })
  }

  // Add default content if no specific matches
  if (contentItems.length === 0) {
    contentItems.push(
      {
        title: 'The State of Developer Tools 2024',
        source: 'Tech Survey',
        summary: content_depth === 'brief'
          ? 'Annual survey reveals top programming languages, frameworks, and tools developers prefer in 2024.'
          : 'The 2024 Developer Tools Survey surveyed 50,000+ developers worldwide. TypeScript continues to grow (78% usage), React remains the most popular frontend framework (68%), and Docker leads containerization (84%). AI coding assistants are now used by 42% of developers daily.',
        relevance_score: 75,
        tags: ['Developer Tools', 'Survey', 'Industry Trends'],
      },
      {
        title: 'Cloud Cost Optimization Strategies',
        source: 'Cloud Computing News',
        summary: content_depth === 'brief'
          ? 'Best practices for reducing cloud infrastructure costs while maintaining performance.'
          : 'Cloud costs can spiral quickly without proper optimization. Key strategies include: rightsizing instances (can save 20-30%), using spot instances for batch workloads, implementing auto-scaling policies, and leveraging reserved instances for predictable workloads. Monitoring tools like AWS Cost Explorer and CloudHealth help track spending patterns.',
        relevance_score: 70,
        tags: ['Cloud Computing', 'Cost Optimization', 'Infrastructure'],
      }
    )
  }

  // Ensure we have enough content for the preview
  while (contentItems.length < 5) {
    contentItems.push({
      title: `Sample Content Item ${contentItems.length + 1}`,
      source: 'Preview Source',
      summary: content_depth === 'brief'
        ? 'This is a sample content item to show how your preferences affect content selection.'
        : 'This is a detailed sample content item that demonstrates how your preference settings influence the type and depth of content you receive. The actual content will be much more relevant and useful.',
      relevance_score: 60,
      tags: ['Sample', 'Preview'],
    })
  }

  return {
    total_items: contentItems.length,
    content_items: contentItems,
    applied_filters: {
      interests_matched: interests.filter(interest => 
        contentItems.some(item => 
          item.tags.some(tag => 
            tag.toLowerCase().includes(interest.toLowerCase())
          )
        )
      ),
      sources_used: enabled_sources,
      depth_setting: content_depth,
    },
  }
}