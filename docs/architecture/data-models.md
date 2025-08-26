# Data Models

## User
**Purpose:** Store user authentication and basic profile information

**Key Attributes:**
- id: UUID - Unique identifier (from Supabase Auth)
- email: string - User's email address
- name: string - Display name
- created_at: timestamp - Account creation date
- onboarded: boolean - Completed onboarding flow

**TypeScript Interface:**
```typescript
interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
  onboarded: boolean;
}
```

**Relationships:**
- Has one UserPreferences
- Has many Content items
- Has many UserFeedback entries

## UserPreferences
**Purpose:** Store user's content preferences and interests

**Key Attributes:**
- id: UUID - Unique identifier
- user_id: UUID - Reference to User
- interests: string[] - Array of interest topics
- tech_stack: string[] - Current technologies used
- delivery_time: string - Preferred delivery time
- content_depth: enum - Brief/Detailed preference

**TypeScript Interface:**
```typescript
interface UserPreferences {
  id: string;
  user_id: string;
  interests: string[];
  tech_stack: string[];
  delivery_time: string; // "09:00" format
  content_depth: 'brief' | 'detailed';
}
```

**Relationships:**
- Belongs to one User

## Content
**Purpose:** Store synthesized content insights

**Key Attributes:**
- id: UUID - Unique identifier
- user_id: UUID - User this content is for
- title: string - Insight title
- summary: string - AI-synthesized summary
- source_urls: string[] - Original source links
- created_at: timestamp - When synthesized
- delivered: boolean - Sent to user

**TypeScript Interface:**
```typescript
interface Content {
  id: string;
  user_id: string;
  title: string;
  summary: string;
  source_urls: string[];
  created_at: Date;
  delivered: boolean;
}
```

**Relationships:**
- Belongs to one User
- Has one UserFeedback (optional)

## UserFeedback
**Purpose:** Track user engagement and ratings

**Key Attributes:**
- id: UUID - Unique identifier
- user_id: UUID - Reference to User
- content_id: UUID - Reference to Content
- rating: number - 1-5 star rating
- saved: boolean - Bookmarked for later

**TypeScript Interface:**
```typescript
interface UserFeedback {
  id: string;
  user_id: string;
  content_id: string;
  rating: number | null;
  saved: boolean;
}
```

**Relationships:**
- Belongs to one User
- Belongs to one Content
