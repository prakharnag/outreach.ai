# Deployment Guide

## Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/prakharnag/outreach.ai)

## Prerequisites

- Vercel account
- Supabase project
- API keys for Groq and Perplexity

## Environment Variables

Set these in your Vercel dashboard or `.env.local`:

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GROQ_API_KEY=your_groq_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key

# Optional
DATABASE_URL=your_direct_database_url
```

## Vercel Deployment Steps

### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `main` branch

### 2. Configure Build Settings

Vercel will auto-detect Next.js settings:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### 3. Set Environment Variables

In Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add all required environment variables
3. Set for Production, Preview, and Development

### 4. Deploy

Click "Deploy" - your app will be live in minutes!

## Manual CLI Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

## Database Setup

### Supabase Configuration

1. **Create Supabase Project**
   ```bash
   npx supabase init
   npx supabase start
   ```

2. **Run Migrations**
   ```sql
   -- Run each migration file in supabase/migrations/
   -- Or use Supabase CLI:
   npx supabase db push
   ```

3. **Configure Authentication**
   - Enable Google OAuth (optional)
   - Set up email authentication
   - Configure RLS policies

### Database Schema

Key tables created:
- `contact_results` - Research data and contacts
- `email_history` - Generated email campaigns  
- `linkedin_history` - LinkedIn messages
- `auth.users` - User authentication (Supabase managed)

## Domain Configuration

### Custom Domain

1. In Vercel dashboard: Settings → Domains
2. Add your custom domain
3. Configure DNS records:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### SSL Certificate

Vercel automatically provisions SSL certificates for all domains.

## Performance Optimization

### Build Optimization

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['*']
    }
  },
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['your-domain.com']
  }
};
```

### Edge Functions

API routes automatically deploy to Vercel Edge Runtime for global performance.

## Monitoring

### Analytics

Vercel provides built-in analytics:
- Page views and unique visitors
- Performance metrics
- Core Web Vitals

### Error Tracking

Consider integrating:
- Sentry for error monitoring
- LogRocket for session replay
- DataDog for APM

## Scaling

### Serverless Functions

- Automatic scaling based on demand
- No cold start issues with Edge Runtime
- Global distribution

### Database Scaling

Supabase automatically handles:
- Connection pooling
- Read replicas
- Automatic backups

## Security

### Environment Variables

- Never commit secrets to git
- Use Vercel's secure environment variable storage
- Rotate API keys regularly

### CORS Configuration

```typescript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: Request) {
  const response = NextResponse.next();
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  return response;
}
```

## Troubleshooting

### Common Issues

**Build Failures**
```bash
# Check build logs
vercel logs

# Test build locally
npm run build
```

**Environment Variables**
```bash
# Verify variables are set
vercel env ls

# Pull environment to local
vercel env pull .env.local
```

**Database Connection**
- Verify Supabase URL and keys
- Check RLS policies
- Ensure migrations are applied

### Debug Mode

Enable debug logging:
```env
DEBUG=*
NEXT_DEBUG=1
```

## Backup & Recovery

### Database Backups

Supabase provides:
- Daily automatic backups
- Point-in-time recovery
- Manual backup triggers

### Code Backups

- GitHub repository serves as primary backup
- Vercel maintains deployment history
- Consider additional Git remotes for redundancy

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Preview Deployments

- Automatic preview for all branches
- Share preview URLs with team
- Test features before production

## Cost Optimization

### Vercel Usage

- Monitor function execution time
- Optimize bundle size
- Use Edge Runtime where possible

### Database Costs

- Monitor Supabase usage
- Implement data retention policies
- Consider read replicas for scaling

## Support

- Vercel Discord: [discord.gg/vercel](https://discord.gg/vercel)
- Supabase Discord: [discord.supabase.com](https://discord.supabase.com)
- Documentation: [vercel.com/docs](https://vercel.com/docs)
