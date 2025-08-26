# API Specification

## REST API Endpoints (Next.js API Routes)

Since we're using Next.js API routes, all endpoints will be under `/api/`. Authentication is handled by Supabase middleware.

### Authentication Endpoints
```typescript
// Handled by Supabase Auth UI Components
POST   /auth/signup    // User registration
POST   /auth/login     // User login  
POST   /auth/logout    // User logout
POST   /auth/reset     // Password reset
```

### User Endpoints
```typescript
GET    /api/user/profile         // Get current user profile
PUT    /api/user/profile         // Update user profile
DELETE /api/user/account         // Delete user account
```

### Preferences Endpoints
```typescript
GET    /api/preferences          // Get user preferences
POST   /api/preferences          // Create preferences (onboarding)
PUT    /api/preferences          // Update preferences
```

### Content Endpoints
```typescript
GET    /api/content              // Get user's daily content feed
GET    /api/content/:id          // Get specific content detail
GET    /api/content/saved        // Get saved/bookmarked content
```

### Feedback Endpoints  
```typescript
POST   /api/feedback/:contentId/rate  // Rate content (1-5 stars)
POST   /api/feedback/:contentId/save  // Save/bookmark content
DELETE /api/feedback/:contentId/save  // Remove bookmark
```

### Admin/Cron Endpoints (Protected)
```typescript
POST   /api/cron/fetch-content   // Fetch from Reddit/Product Hunt
POST   /api/cron/synthesize      // Process with OpenAI
POST   /api/cron/deliver         // Mark content as delivered
```

## Example API Responses

### Get Content Feed
```typescript
// GET /api/content
{
  "data": [
    {
      "id": "uuid",
      "title": "New React 19 Features",
      "summary": "React 19 introduces server components...",
      "source_urls": ["https://reddit.com/r/react/..."],
      "created_at": "2024-01-15T09:00:00Z",
      "feedback": {
        "rating": 4,
        "saved": true
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### Update Preferences
```typescript
// PUT /api/preferences
// Request Body:
{
  "interests": ["AI", "React", "TypeScript"],
  "tech_stack": ["Next.js", "PostgreSQL"],
  "delivery_time": "08:00",
  "content_depth": "detailed"
}

// Response:
{
  "success": true,
  "data": { ...updated preferences }
}
```

## Error Response Format
```typescript
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You must be logged in to access this resource",
    "status": 401
  }
}
```
