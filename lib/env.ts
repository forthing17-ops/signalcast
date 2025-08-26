import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_URL is required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  
  // AI Synthesis
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required for AI synthesis'),
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),
  PRODUCT_HUNT_TOKEN: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// For build time, we'll skip validation if placeholder values are present
const shouldValidate = process.env.DATABASE_URL && 
  !process.env.DATABASE_URL.includes('[password]') &&
  !process.env.DATABASE_URL.includes('[project-ref]')

export const env = shouldValidate 
  ? envSchema.parse(process.env)
  : envSchema.partial().parse(process.env)