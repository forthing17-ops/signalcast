export interface IUser {
  id: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export interface IUserPreferences {
  id: string
  userId: string
  topics: string[]
  contentSources: string[]
  updateFrequency: string
  createdAt: Date
  updatedAt: Date
}

export interface IContent {
  id: string
  title: string
  summary: string
  content: string
  sourceUrls: string[]
  topics: string[]
  createdBy: string
  publishedAt: Date
  updatedAt: Date
}

export interface IUserFeedback {
  id: string
  userId: string
  contentId: string
  rating?: number
  isBookmarked: boolean
  feedback?: string
  createdAt: Date
  updatedAt: Date
}