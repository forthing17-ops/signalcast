# Deployment

## Vercel Deployment

```bash
# Install Vercel CLI
pnpm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard
# Project Settings > Environment Variables
```

## Production Configuration

```javascript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/fetch-content",
      "schedule": "0 6 * * *"  // 6 AM UTC daily
    },
    {
      "path": "/api/cron/synthesize",
      "schedule": "0 7 * * *"  // 7 AM UTC daily
    },
    {
      "path": "/api/cron/deliver",
      "schedule": "0 8 * * *"  // 8 AM UTC daily
    }
  ]
}
```

## Monitoring

- **Vercel Analytics**: Automatically enabled for performance metrics
- **Vercel Functions**: Monitor API route performance in dashboard
- **Supabase Dashboard**: Monitor database queries and auth metrics
- **Error Logs**: Check Vercel Functions logs for errors
