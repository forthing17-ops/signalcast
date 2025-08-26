# Development Workflow

## Local Development Setup

```bash
# Prerequisites
node --version  # v18+
pnpm --version  # v8+ (or npm/yarn)

# Clone and install
git clone <repo>
cd signalcast
pnpm install

# Setup environment
cp .env.example .env.local
# Add your Supabase and OpenAI keys

# Setup database
pnpm prisma generate
pnpm prisma db push

# Run development server
pnpm dev
# Open http://localhost:3000
```

## Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Database (from Supabase)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# OpenAI
OPENAI_API_KEY=sk-...

# Reddit API
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...

# Product Hunt API  
PRODUCT_HUNT_TOKEN=...

# Cron Secret (for Vercel)
CRON_SECRET=random-secret-string
```

## Development Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm prisma studio    # Open Prisma Studio
pnpm prisma generate  # Generate Prisma Client
pnpm prisma db push   # Push schema changes
pnpm prisma migrate dev # Create migration

# Testing
pnpm test            # Run unit tests
pnpm test:e2e        # Run E2E tests
pnpm lint            # Run ESLint
pnpm type-check      # Run TypeScript check
```
