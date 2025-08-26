# Project Structure

```
signalcast/
├── .env.local                  # Local environment variables
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
├── public/
│   └── favicon.ico
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page
│   ├── globals.css             # Global styles
│   ├── (auth)/                 # Auth routes group
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── reset/page.tsx
│   ├── (app)/                  # Authenticated app routes
│   │   ├── layout.tsx          # App layout with nav
│   │   ├── feed/page.tsx       # Content feed
│   │   ├── saved/page.tsx      # Saved content
│   │   ├── preferences/page.tsx
│   │   └── onboarding/page.tsx
│   └── api/                    # API routes
│       ├── user/
│       │   └── profile/route.ts
│       ├── preferences/route.ts
│       ├── content/
│       │   ├── route.ts
│       │   ├── [id]/route.ts
│       │   └── saved/route.ts
│       ├── feedback/
│       │   └── [contentId]/
│       │       ├── rate/route.ts
│       │       └── save/route.ts
│       └── cron/               # Protected cron jobs
│           ├── fetch-content/route.ts
│           ├── synthesize/route.ts
│           └── deliver/route.ts
├── components/
│   ├── ui/                     # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── signup-form.tsx
│   ├── content/
│   │   ├── content-card.tsx
│   │   ├── content-list.tsx
│   │   └── content-detail.tsx
│   └── layout/
│       ├── header.tsx
│       └── navigation.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client
│   │   └── middleware.ts       # Auth middleware
│   ├── prisma.ts               # Prisma client
│   ├── openai.ts               # OpenAI client
│   └── utils.ts                # Utility functions
├── hooks/
│   ├── use-user.ts
│   └── use-content.ts
└── types/
    └── index.ts                # Shared TypeScript types
```
