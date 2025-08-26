# Security Considerations

## MVP Security Checklist

- ✅ Use Supabase Row Level Security (RLS) for data access
- ✅ Validate all API inputs with Zod
- ✅ Protect cron endpoints with secret header
- ✅ Rate limit API routes with Vercel Edge Config
- ✅ Sanitize user inputs before storing
- ✅ Use environment variables for all secrets
- ✅ Enable CORS only for your domain
- ✅ Implement proper error handling without leaking details
