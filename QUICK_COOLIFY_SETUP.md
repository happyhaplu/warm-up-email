# Quick Coolify Setup Guide

## 🚀 5-Minute Deployment

### Step 1: Coolify Project Setup (2 min)

1. **Login to Coolify Dashboard**
   - Go to your Coolify instance
   - Navigate to Projects

2. **Create New Application**
   - Click "New Resource" → "Application"
   - Source: "GitHub"
   - Repository: `happyhaplu/warm-up-email`
   - Branch: `main`

3. **Build Configuration**
   ```
   Build Command: npm run build
   Start Command: npm start
   Base Directory: /
   Port: 3000
   ```

### Step 2: Environment Variables (2 min)

Click "Environment Variables" and add:

```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Application (Required)
NODE_ENV=production

# Warmup (Optional - uses defaults if not set)
WARMUP_BATCH_SIZE=100
WARMUP_MAX_CONCURRENT=20
WARMUP_AUTO_START=true
```

### Step 3: Deploy (1 min)

1. Click "Deploy" button
2. Wait for build to complete (3-5 minutes)
3. Coolify will auto-assign a domain

### Step 4: Post-Deployment

Once deployed, run migrations:

**Option A: Via Coolify Terminal**
```bash
npx prisma migrate deploy
npx prisma generate
```

**Option B: Add to Post-Deploy Hook**
In Coolify → Settings → Deployment → Post-Deploy Command:
```bash
npx prisma migrate deploy && npx prisma generate
```

---

## ✅ Verify Deployment

### 1. Check Health
```bash
curl https://your-app.coolify.io/api/warmup/status
```

Should return:
```json
{
  "running": true,
  "config": {...}
}
```

### 2. Access Admin Panel
Navigate to: `https://your-app.coolify.io/admin/login`

### 3. Create Admin User
```bash
# In Coolify terminal
npx tsx scripts/create-admin.sh
```

---

## 🔧 Coolify Configuration File

The `.coolify.json` file is already configured:

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

---

## 🎯 Important Settings

### Health Check
- **Path:** `/api/warmup/status`
- **Interval:** 30 seconds
- **Timeout:** 10 seconds
- **Retries:** 3

### Resource Limits (Recommended)
```yaml
Memory: 1Gi - 2Gi
CPU: 0.5 - 1.0 cores
```

### Auto-Deploy
- ✅ Enable "Deploy on Push"
- Branch: `main`
- Coolify will auto-deploy on GitHub push

---

## 📊 Monitoring

### Coolify Dashboard
- View real-time logs
- Monitor resource usage
- Check deployment history
- View build logs

### Application Endpoints
- `/api/warmup/status` - Warmup status
- `/api/auto-scaler/status` - Scaling status
- `/api/user/stats` - User statistics

---

## 🔄 Update Deployment

To deploy updates:

```bash
# Local
git add .
git commit -m "Update: description"
git push origin main

# Coolify will auto-deploy
```

Or manually trigger in Coolify dashboard.

---

## 🚨 Troubleshooting

### Build Fails
1. Check build logs in Coolify
2. Verify Node.js version is 20.x
3. Check `package.json` dependencies

### Application Not Starting
1. Check environment variables
2. Verify `DATABASE_URL` is correct
3. Check start logs for errors

### Database Issues
1. Test connection: `npx prisma db push`
2. Run migrations: `npx prisma migrate deploy`
3. Check PostgreSQL is accessible

### Warmup Not Running
1. Verify `NODE_ENV=production`
2. Set `WARMUP_AUTO_START=true`
3. Check `/api/warmup/status`

---

## 📞 Quick Support Checklist

Before asking for help:

- [ ] Check Coolify build logs
- [ ] Verify all environment variables are set
- [ ] Check application logs
- [ ] Test database connectivity
- [ ] Review [COOLIFY_DEPLOYMENT.md](COOLIFY_DEPLOYMENT.md)

---

## 🎉 Success Criteria

Your deployment is successful when:

- ✅ Build completes without errors
- ✅ Application starts on port 3000
- ✅ Health check returns 200 OK
- ✅ Login page loads
- ✅ Admin dashboard accessible
- ✅ Warmup status shows "running: true"

---

**Estimated Total Time:** 5-10 minutes  
**Difficulty:** Easy ⭐  
**Pre-requisites:** Coolify instance, GitHub account, Database

🚀 **You're ready to deploy!**
