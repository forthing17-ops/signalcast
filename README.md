# SignalCast - AI-Powered Content Synthesis Platform

## Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Setup Supabase Database:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key from Settings > API
   - Copy your service role key from Settings > API
   - Update `.env.local` with your Supabase credentials

3. **Setup Database Schema:**
   ```bash
   # Push schema to Supabase
   npm run prisma:push
   
   # Or create a migration
   npm run prisma:migrate
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```

### Environment Variables

Copy `.env.example` to `.env.local` and update with your values:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `DATABASE_URL` - Your Supabase database URL
- `DIRECT_URL` - Your Supabase direct database URL

### Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run type-check   # TypeScript validation
npm run lint         # ESLint
npm run test         # Unit tests
npm run test:e2e     # E2E tests
npm run prisma:studio # Database GUI
```

## Tech Stack

- **Framework:** Next.js 14+ with TypeScript
- **Database:** PostgreSQL (Supabase) with Prisma ORM
- **Styling:** Tailwind CSS with shadcn/ui components  
- **Auth:** Supabase Auth
- **Deployment:** Vercel
- **Testing:** Vitest + Playwright

## Project Structure

```
signalcast/
├── app/                    # Next.js App Router
├── components/             # React components
├── lib/                    # Utilities and clients
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript definitions
├── prisma/                 # Database schema
└── tests/                  # Test files
```