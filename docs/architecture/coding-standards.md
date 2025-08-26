# Coding Standards

## Critical Rules for AI Development

- **Use Prisma for all database operations:** Never write raw SQL, use Prisma client
- **Type everything:** No `any` types, define interfaces for all data structures
- **Use app directory:** All pages go in /app, not /pages (Next.js 14)
- **Server Components by default:** Only use 'use client' when needed
- **Environment variables:** Always validate with zod at startup
- **API routes:** Return consistent JSON structure with error handling
- **Use Supabase Auth:** Don't implement custom auth logic
- **Tailwind only:** No custom CSS files except globals.css

## File Naming Conventions

- Components: PascalCase (`ContentCard.tsx`)
- Utilities: camelCase (`formatDate.ts`)
- API Routes: kebab-case folders (`/api/user-profile/route.ts`)
- Types: PascalCase with 'I' prefix for interfaces (`IUser`)
