# Tech Stack

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Language | TypeScript | 5.3+ | Full-stack type safety | Single language, prevents errors, great DX |
| Framework | Next.js | 14.2+ | Full-stack framework | One framework for everything, Vercel optimized |
| UI Styling | Tailwind CSS | 3.4+ | Utility-first CSS | Fastest way to build UIs, no CSS files needed |
| UI Components | shadcn/ui | Latest | Copy-paste components | No dependencies, fully customizable, production-ready |
| Database | PostgreSQL (Supabase) | 15+ | All data storage | Free tier generous, includes auth and storage |
| ORM | Prisma | 5.0+ | Database access | Type-safe queries, great DX, migrations included |
| Authentication | Supabase Auth | 2.0+ | User auth | Zero-config OAuth, magic links, row-level security |
| File Storage | Supabase Storage | Latest | Content storage | Included with Supabase, no extra setup |
| API Client | Native Fetch | Built-in | HTTP requests | No library needed, works everywhere |
| Form Handling | React Hook Form | 7.0+ | Form validation | Lightweight, performant, great with TypeScript |
| Date Handling | date-fns | 3.0+ | Date utilities | Tree-shakeable, no moment.js bloat |
| Testing | Vitest | 1.2+ | Unit tests | Fast, Jest-compatible, works with Vite |
| E2E Testing | Playwright | 1.40+ | Integration tests | Reliable, fast, great debugging |
| Deployment | Vercel | Latest | Hosting platform | Zero-config deploy, preview branches, analytics included |
| Monitoring | Vercel Analytics | Built-in | Basic metrics | Free with Vercel, no setup required |
| Error Tracking | Console + Vercel | Built-in | Error logs | Start simple, add Sentry later if needed |

## MVP Technology Decisions

**AI Integration:**
- OpenAI GPT-5 mini API (default model for content synthesis)
- Simple prompt engineering (no LangChain for MVP)
- PostgreSQL for storing content history (no vector DB yet)

**External APIs:**
- Reddit API (easiest to start with)
- Product Hunt API (good for tech content)
- Add Twitter later (more complex auth)

**Key Simplifications for MVP:**
- No vector database (use PostgreSQL text search)
- No queue system (use Vercel Cron directly)
- No caching layer (rely on Vercel's edge caching)
- No complex monitoring (use Vercel's built-in logs)
- No microservices (everything in Next.js app)
