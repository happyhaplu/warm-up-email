# Deployment Guide for Coolify

## Prerequisites
- Coolify instance running
- GitHub repository connected
- PostgreSQL database provisioned
- Environment variables configured

## Environment Variables Required

### Database
```
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Application
```
NODE_ENV=production
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://your-domain.com
```

### Warmup Configuration (Optional)
```
# Warmup Engine
WARMUP_BATCH_SIZE=100
WARMUP_MAX_CONCURRENT=20
WARMUP_GLOBAL_HOURLY_LIMIT=10000

# Auto-start in production
WARMUP_AUTO_START=true
```

## Deployment Steps

### 1. Configure Coolify Project

**Build Settings:**
- Build Command: `npm run build`
- Start Command: `npm start`
- Port: `3000`
- Node Version: `20.x`

**Advanced Settings:**
- Install Command: `npm install`
- Post-deployment Command: `npx prisma migrate deploy`

### 2. Database Setup

Run migrations after first deployment:
```bash
npx prisma migrate deploy
npx prisma generate
```

### 3. Create Admin User

```bash
# SSH into your Coolify container
npm run tsx scripts/create-admin.sh
```

Or via Supabase:
```bash
npm run tsx scripts/create-supabase-user.ts
```

### 4. Health Checks

Coolify health check endpoints:
- **Liveness:** `GET /api/warmup/status`
- **Readiness:** `GET /api/auto-scaler/status`

## Build Configuration

The application uses Next.js 14 with:
- Static generation for pages
- Server-side API routes
- Automatic optimization

### Dockerfile (if using custom build)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

## Post-Deployment Verification

### 1. Check Application Health
```bash
curl https://your-domain.com/api/warmup/status
```

Expected response:
```json
{
  "running": true,
  "nextRun": "2026-01-28T...",
  "config": {...}
}
```

### 2. Verify Auto-Scaler
```bash
curl https://your-domain.com/api/auto-scaler/status
```

### 3. Test Login
Navigate to: `https://your-domain.com/login`

## Coolify Configuration File

Create `.coolify.json` in project root:

```json
{
  "name": "email-warmup",
  "build": {
    "command": "npm run build",
    "environment": {
      "NODE_ENV": "production"
    }
  },
  "deploy": {
    "command": "npm start",
    "port": 3000,
    "healthcheck": {
      "path": "/api/warmup/status",
      "interval": 30,
      "timeout": 10,
      "retries": 3
    }
  },
  "hooks": {
    "postDeploy": [
      "npx prisma migrate deploy",
      "npx prisma generate"
    ]
  }
}
```

## Scaling with Coolify

### Horizontal Scaling
- Coolify supports multiple instances
- Use load balancer for distribution
- Warmup workers auto-coordinate

### Resource Limits
```yaml
resources:
  limits:
    memory: 2Gi
    cpu: 1000m
  requests:
    memory: 512Mi
    cpu: 250m
```

## Monitoring

### Logs
Access via Coolify dashboard or:
```bash
docker logs -f <container-name>
```

### Metrics Endpoints
- `/api/warmup/metrics` - Warmup statistics
- `/api/auto-scaler/status` - Scaling status
- `/api/user/stats` - User statistics

## Troubleshooting

### Build Fails
1. Check Node.js version (20.x required)
2. Verify `package.json` dependencies
3. Check environment variables

### Database Connection Issues
1. Verify `DATABASE_URL`
2. Check network connectivity
3. Run: `npx prisma db push`

### Warmup Not Starting
1. Set `WARMUP_AUTO_START=true`
2. Check `NODE_ENV=production`
3. Verify no `NEXT_PHASE=phase-production-build`

### 502 Bad Gateway
1. Check application is running on port 3000
2. Verify health check endpoint
3. Check container logs

## Rollback Strategy

Coolify supports instant rollback:
1. Go to Deployments tab
2. Select previous successful deployment
3. Click "Rollback"

## Security Checklist

- ✅ Environment variables set in Coolify (not in code)
- ✅ Database credentials secured
- ✅ HTTPS enabled (Coolify automatic)
- ✅ Health checks configured
- ✅ Resource limits set
- ✅ Logs monitored

## Update Deployment

Push to main branch:
```bash
git add .
git commit -m "Update: description"
git push origin main
```

Coolify will auto-deploy if webhook configured.

## Performance Optimization

### Next.js Settings
- Static page generation enabled
- Image optimization enabled
- Bundle size optimized

### Database
- Connection pooling: Prisma default
- Query optimization: Indexed fields
- Migration strategy: Zero-downtime

## Support

For issues:
1. Check Coolify logs
2. Review deployment logs
3. Verify environment variables
4. Check database connectivity

---

**Last Updated:** 2026-01-28
**Deployment Platform:** Coolify
**Node Version:** 20.x
**Next.js Version:** 14.2.35
