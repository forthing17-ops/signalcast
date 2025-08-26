# Testing Strategy

## MVP Testing Approach

```typescript
// Simple unit test example with Vitest
// tests/api/content.test.ts
import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/content/route'

describe('Content API', () => {
  it('returns user content', async () => {
    const response = await GET(request)
    const data = await response.json()
    expect(data).toHaveProperty('data')
  })
})
```

## Testing Priorities for MVP

1. **Critical Path E2E Tests** (Playwright)
   - User signup/login flow
   - Onboarding completion
   - Content viewing and rating

2. **API Route Tests** (Vitest)
   - Authentication middleware
   - Data validation
   - Error handling

3. **Component Tests** (React Testing Library)
   - Forms with validation
   - Content card interactions
   - Navigation flows
