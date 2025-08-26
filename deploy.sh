#!/bin/bash

# Production deployment script for Signalcast News App

echo "🚀 Starting production deployment to Vercel..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "npm install -g vercel"
    exit 1
fi

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors above."
    exit 1
fi

echo "✅ Build completed successfully!"

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod --env NEXT_PUBLIC_SUPABASE_URL="https://rdmjzsmedbkzibywdthd.supabase.co" \
              --env NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWp6c21lZGJremlieXdkdGhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwODg2MjQsImV4cCI6MjA3MTY2NDYyNH0._sCK2KGWYYSpywfaJT-bv4EoMKo_71TFxr6Tc7hJvOA" \
              --env SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWp6c21lZGJremlieXdkdGhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjA4ODYyNCwiZXhwIjoyMDcxNjY0NjI0fQ.JkIgIiSKVkfGBNAcqOIJPVMnkOeE9xQgHp7dRpGl3p0" \
              --env DATABASE_URL="postgresql://postgres.rdmjzsmedbkzibywdthd:Thanhan175%40%28%29@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1" \
              --env DIRECT_URL="postgresql://postgres.rdmjzsmedbkzibywdthd:Thanhan175%40%28%29@aws-0-us-east-2.pooler.supabase.com:5432/postgres" \
              --env OPENAI_API_KEY="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" \
              --env DEMO_MODE="false" \
              --env NEXT_PUBLIC_DEMO_MODE="false" \
              --env NODE_ENV="production" \
              --env CRON_SECRET="prod-cron-secret-$(date +%s)"

if [ $? -eq 0 ]; then
    echo "✅ Deployment completed successfully!"
    echo "🌐 Your app should be live at the URL provided above."
else
    echo "❌ Deployment failed. Please check the errors above."
    exit 1
fi