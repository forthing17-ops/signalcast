// Demo database service for testing without Supabase
interface DemoUserPreferences {
  id: string
  userId: string
  professionalRole?: string
  industry?: string
  companySize?: string
  experienceLevel?: string
  interests: string[]
  techStack: string[]
  deliveryFrequency: string
  contentDepth: string
  contentFormats: string[]
  curiosityAreas: string[]
  createdAt: Date
  updatedAt: Date
}

interface DemoPreferenceHistory {
  id: string
  userId: string
  fieldChanged: string
  oldValue?: string
  newValue?: string
  changeReason?: string
  changedAt: Date
}

// In-memory storage for demo mode
let demoUserPreferences: DemoUserPreferences | null = {
  id: 'demo-user-prefs-1',
  userId: 'demo-user-1',
  professionalRole: 'Senior Software Engineer',
  industry: 'Technology',
  companySize: '100-500',
  experienceLevel: 'Senior (5+ years)',
  interests: ['React', 'TypeScript', 'Node.js', 'Cloud Computing'],
  techStack: ['JavaScript', 'Python', 'PostgreSQL', 'Docker'],
  deliveryFrequency: 'daily',
  contentDepth: 'detailed',
  contentFormats: ['articles', 'videos', 'tools'],
  curiosityAreas: ['AI/ML', 'DevOps', 'System Design'],
  createdAt: new Date(),
  updatedAt: new Date()
}

let demoPreferenceHistory: DemoPreferenceHistory[] = [
  {
    id: 'demo-history-1',
    userId: 'demo-user-1',
    fieldChanged: 'interests',
    oldValue: '["React", "TypeScript"]',
    newValue: '["React", "TypeScript", "Node.js", "Cloud Computing"]',
    changeReason: 'Added new interests',
    changedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
  }
]

export class DemoDatabase {
  // User Preferences operations
  static async getUserPreferences(userId: string): Promise<DemoUserPreferences | null> {
    if (process.env.DEMO_MODE !== 'true') {
      throw new Error('Demo database only available in demo mode')
    }
    return demoUserPreferences && demoUserPreferences.userId === userId ? demoUserPreferences : null
  }

  static async updateUserPreferences(
    userId: string, 
    data: Partial<DemoUserPreferences>,
    changeReason?: string
  ): Promise<DemoUserPreferences> {
    if (process.env.DEMO_MODE !== 'true') {
      throw new Error('Demo database only available in demo mode')
    }

    const existing = demoUserPreferences

    // Create new preferences if none exist
    if (!existing) {
      demoUserPreferences = {
        id: `demo-user-prefs-${Date.now()}`,
        userId,
        professionalRole: undefined,
        industry: undefined,
        companySize: undefined,
        experienceLevel: undefined,
        interests: [],
        techStack: [],
        deliveryFrequency: 'daily',
        contentDepth: 'detailed',
        contentFormats: [],
        curiosityAreas: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data
      }
      return demoUserPreferences
    }

    // Track changes for history
    Object.keys(data).forEach(key => {
      const field = key as keyof DemoUserPreferences
      const oldValue = existing[field]
      const newValue = data[field]
      
      if (oldValue !== newValue) {
        demoPreferenceHistory.push({
          id: `demo-history-${Date.now()}-${Math.random()}`,
          userId,
          fieldChanged: key,
          oldValue: JSON.stringify(oldValue),
          newValue: JSON.stringify(newValue),
          changeReason,
          changedAt: new Date()
        })
      }
    })

    // Update preferences
    demoUserPreferences = {
      ...existing,
      ...data,
      updatedAt: new Date()
    }

    return demoUserPreferences
  }

  // Preference History operations
  static async getPreferenceHistory(userId: string): Promise<DemoPreferenceHistory[]> {
    if (process.env.DEMO_MODE !== 'true') {
      throw new Error('Demo database only available in demo mode')
    }
    return demoPreferenceHistory
      .filter(h => h.userId === userId)
      .sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime())
  }

  static async rollbackPreference(userId: string, historyId: string): Promise<DemoUserPreferences | null> {
    if (process.env.DEMO_MODE !== 'true') {
      throw new Error('Demo database only available in demo mode')
    }

    const historyItem = demoPreferenceHistory.find(h => h.id === historyId && h.userId === userId)
    if (!historyItem || !demoUserPreferences) {
      return null
    }

    // Rollback the field to old value
    const fieldChanged = historyItem.fieldChanged as keyof DemoUserPreferences
    const oldValue = historyItem.oldValue ? JSON.parse(historyItem.oldValue) : undefined

    demoUserPreferences = {
      ...demoUserPreferences,
      [fieldChanged]: oldValue,
      updatedAt: new Date()
    }

    // Add rollback to history
    demoPreferenceHistory.push({
      id: `demo-history-${Date.now()}-rollback`,
      userId,
      fieldChanged: historyItem.fieldChanged,
      oldValue: historyItem.newValue,
      newValue: historyItem.oldValue,
      changeReason: `Rolled back to previous value`,
      changedAt: new Date()
    })

    return demoUserPreferences
  }

  // Export/Import operations
  static async exportPreferences(userId: string): Promise<string> {
    if (process.env.DEMO_MODE !== 'true') {
      throw new Error('Demo database only available in demo mode')
    }

    const preferences = await this.getUserPreferences(userId)
    const history = await this.getPreferenceHistory(userId)

    return JSON.stringify({
      preferences,
      history,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }, null, 2)
  }

  static async importPreferences(userId: string, data: string): Promise<DemoUserPreferences> {
    if (process.env.DEMO_MODE !== 'true') {
      throw new Error('Demo database only available in demo mode')
    }

    try {
      const importedData = JSON.parse(data)
      
      if (importedData.preferences) {
        return await this.updateUserPreferences(
          userId,
          importedData.preferences,
          'Data imported from external source'
        )
      }
      
      throw new Error('Invalid import format')
    } catch (error) {
      throw new Error('Failed to parse import data')
    }
  }

  // Mock content for demo
  static async getContent(userId?: string) {
    if (process.env.DEMO_MODE !== 'true') {
      throw new Error('Demo database only available in demo mode')
    }

    return [
      {
        id: 'demo-content-1',
        title: 'Latest React 19 Features You Should Know',
        summary: 'Explore the new concurrent features, improved suspense, and server components in React 19.',
        content: 'React 19 introduces several groundbreaking features...',
        sourceUrls: ['https://react.dev/blog'],
        topics: ['React', 'Frontend', 'JavaScript'],
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        createdBy: userId || 'demo-user-1'
      },
      {
        id: 'demo-content-2', 
        title: 'TypeScript 5.3: Enhanced Performance and New Syntax',
        summary: 'TypeScript 5.3 brings performance improvements and new syntax features for better developer experience.',
        content: 'The latest TypeScript release focuses on...',
        sourceUrls: ['https://devblogs.microsoft.com/typescript'],
        topics: ['TypeScript', 'Development', 'Tooling'],
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        createdBy: userId || 'demo-user-1'
      },
      {
        id: 'demo-synthesis-1',
        title: '🤖 AI Synthesis: React 19 + TypeScript 5.3 Impact on Modern Development',
        summary: 'AI-synthesized insight combining React 19 concurrent features with TypeScript 5.3 improvements to guide your development strategy.',
        content: 'Based on the latest React 19 and TypeScript 5.3 releases, here\'s what this means for your development workflow: The combination of React\'s improved concurrent features and TypeScript\'s enhanced performance creates compelling opportunities for building more responsive applications. Consider upgrading your current stack to leverage these improvements, particularly if you\'re working with complex state management or server components.',
        sourceUrls: ['https://react.dev/blog', 'https://devblogs.microsoft.com/typescript'],
        topics: ['AI Synthesis', 'React', 'TypeScript', 'Strategy'],
        publishedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        createdBy: 'gpt-5-mini-synthesis-engine'
      },
      {
        id: 'demo-synthesis-2',
        title: '🤖 Weekly Tech Synthesis: Full-Stack Development Trends',
        summary: 'AI-powered analysis of this week\'s development trends, personalized for your React/TypeScript/Node.js tech stack.',
        content: 'This week\'s analysis shows strong momentum in full-stack TypeScript adoption, with React 19\'s server components aligning perfectly with your Node.js backend experience. Key recommendation: Start experimenting with React 19\'s concurrent features in your next project, as they complement your PostgreSQL and Docker setup well. The TypeScript 5.3 performance improvements will particularly benefit your larger codebases.',
        sourceUrls: ['https://react.dev/blog', 'https://devblogs.microsoft.com/typescript', 'https://nodejs.org/blog'],
        topics: ['AI Synthesis', 'Full-Stack', 'Personalized', 'Weekly Summary'],
        publishedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        createdBy: 'gpt-5-mini-synthesis-engine'
      }
    ]
  }
}

// Export demo mode checker
export const isDemoMode = () => process.env.DEMO_MODE === 'true'