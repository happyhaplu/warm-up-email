# 🚀 Gmail Warmup Automation - Production Ready

Complete Gmail warm-up automation with Supabase PostgreSQL, authentication, bulk imports, and advanced timing controls.

## 📋 Table of Contents
- [Features](#features)
- [Quick Start](#quick-start)
- [Supabase Setup](#supabase-setup)
- [Authentication](#authentication)
- [Bulk Import](#bulk-import)
- [Production Deployment](#production-deployment)
- [API Reference](#api-reference)

## ✨ Features

### Core Features
- ✅ **Supabase PostgreSQL** - Cloud database (no local SQLite)
- ✅ **Authentication** - Supabase Auth with email/password
- ✅ **Bulk Import** - CSV/JSON import for accounts, recipients, templates
- ✅ **Advanced Timing** - Configurable delays (5-10 min) between emails
- ✅ **Rate Limiting** - Max emails per hour (default: 10)
- ✅ **Production Ready** - PM2, Docker, environment validation
- ✅ **Responsive UI** - TailwindCSS with dark mode support

### Email Features
- Send emails via Gmail SMTP
- Check inbox via IMAP
- Auto-reply to received emails
- Randomized templates
- Comprehensive logging

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <your-repo>
cd email-warmup
npm install
```

### 2. Configure Environment
Create `.env` file:
```bash
# Supabase Database
DATABASE_URL="postgresql://postgres.dcxnduxjczwzsxtitgjx:yV4GRWreciMSNLh5@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.dcxnduxjczwzsxtitgjx:yV4GRWreciMSNLh5@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# Supabase Auth - Get from https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
NEXT_PUBLIC_SUPABASE_URL="https://dcxnduxjczwzsxtitgjx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Email Warmup Settings
CRON_SCHEDULE="0 * * * *"
EMAIL_DELAY_MIN_SECONDS=300
EMAIL_DELAY_MAX_SECONDS=600
MAX_EMAILS_PER_HOUR=10

# Environment
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Setup Database
```bash
npm run db:push
npm run db:seed
```

### 4. Run Application
```bash
# Development
npm run dev              # Web interface (http://localhost:3000)
npm run warmup:dev       # Email worker (with auto-reload)

# Production
npm run build            # Build Next.js
npm start                # Start web server
npm run warmup           # Start email worker
```

## 🔐 Supabase Setup

### 1. Create Project
1. Go to https://supabase.com/dashboard
2. Create new project: `gmail-warmup`
3. Region: `ap-south-1` (Mumbai)
4. Database password: `yV4GRWreciMSNLh5`

### 2. Get API Keys
1. Go to **Settings** → **API**
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configure Authentication
1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Optional: Configure email templates
4. Optional: Add custom SMTP settings

### 4. Database Connection
Already configured in `.env`:
- **Pooler URL** (port 6543) - For Prisma with connection pooling
- **Direct URL** (port 5432) - For migrations

## 🔒 Authentication

### Sign Up
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"yourpassword"}'
```

### Login Flow
1. Navigate to http://localhost:3000
2. Redirected to `/auth/login`
3. Enter email/password
4. Click "Sign in" or "Sign up"
5. Redirected to dashboard

### Protected Routes
All routes except `/auth/*` require authentication via middleware.

### Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout
```

## 📦 Bulk Import

### CSV Format

**Accounts** (`email,appPassword`):
```csv
email,appPassword
sender1@gmail.com,xxxx xxxx xxxx xxxx
sender2@gmail.com,yyyy yyyy yyyy yyyy
```

**Recipients** (`email`):
```csv
email
recipient1@example.com
recipient2@example.com
```

**Templates** (`subject,body`):
```csv
subject,body
Hello!,Hi there! How are you doing today?
Quick question,Hey! I wanted to ask you something.
```

### JSON Format

**Accounts**:
```json
[
  {"email": "sender1@gmail.com", "appPassword": "xxxx xxxx xxxx xxxx"},
  {"email": "sender2@gmail.com", "appPassword": "yyyy yyyy yyyy yyyy"}
]
```

**Recipients**:
```json
[
  {"email": "recipient1@example.com"},
  {"email": "recipient2@example.com"}
]
```

**Templates**:
```json
[
  {"subject": "Hello!", "body": "Hi there! How are you doing today?"},
  {"subject": "Quick question", "body": "Hey! I wanted to ask you something."}
]
```

### API Endpoints

**Accounts**:
```bash
curl -X POST http://localhost:3000/api/accounts/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "data": "email,appPassword\nsender@gmail.com,xxxx xxxx xxxx xxxx"
  }'
```

**Recipients**:
```bash
curl -X POST http://localhost:3000/api/recipients/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "format": "json",
    "data": "[{\"email\":\"test@example.com\"}]"
  }'
```

**Templates**:
```bash
curl -X POST http://localhost:3000/api/templates/bulk-import \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "data": "subject,body\nHello,Test message"
  }'
```

## ⚙️ Configuration

### Email Timing
Edit `.env`:
```bash
# Delay between emails (in seconds)
EMAIL_DELAY_MIN_SECONDS=300      # 5 minutes
EMAIL_DELAY_MAX_SECONDS=600      # 10 minutes

# Maximum emails per hour
MAX_EMAILS_PER_HOUR=10

# Cron schedule (every hour)
CRON_SCHEDULE="0 * * * *"
```

### Cron Schedule Examples
```bash
"0 * * * *"        # Every hour
"*/30 * * * *"     # Every 30 minutes
"0 9-17 * * *"     # Every hour from 9am-5pm
"0 */2 * * *"      # Every 2 hours
```

## 🌐 Production Deployment

### Option 1: PM2 (Process Manager)

**Install PM2**:
```bash
npm install -g pm2
```

**Start Services**:
```bash
npm run pm2:start
```

**Commands**:
```bash
pm2 list                 # List all processes
pm2 logs                 # View logs
pm2 restart all          # Restart services
pm2 stop all             # Stop services
pm2 delete all           # Remove services
```

**Auto-start on Boot**:
```bash
pm2 startup
pm2 save
```

### Option 2: Docker

**Build Image**:
```bash
docker build -t gmail-warmup .
```

**Run Container**:
```bash
docker run -d \
  --name gmail-warmup \
  -p 3000:3000 \
  --env-file .env \
  gmail-warmup
```

**Docker Compose**:
```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    restart: unless-stopped
```

### Option 3: Vercel/Netlify

**Vercel**:
```bash
npm install -g vercel
vercel
```

**Environment Variables**:
Add all `.env` variables in Vercel dashboard.

**Note**: The email worker (`services/warmup.js`) needs to run separately on a server or use cron jobs.

## 📊 API Reference

### Accounts
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create account
- `PUT /api/accounts` - Update account
- `DELETE /api/accounts?id=1` - Delete account
- `POST /api/accounts/bulk-import` - Bulk import

### Recipients
- `GET /api/recipients` - List all recipients
- `POST /api/recipients` - Create recipient
- `PUT /api/recipients` - Update recipient
- `DELETE /api/recipients?id=1` - Delete recipient
- `POST /api/recipients/bulk-import` - Bulk import

### Templates
- `GET /api/templates` - List all templates
- `POST /api/templates` - Create template
- `PUT /api/templates` - Update template
- `DELETE /api/templates?id=1` - Delete template
- `POST /api/templates/bulk-import` - Bulk import

### Logs
- `GET /api/logs` - List all logs

### Warmup
- `POST /api/warmup/trigger` - Manually trigger warm-up cycle
- `POST /api/warmup/send` - Send single email
- `GET /api/warmup/status` - Get status

### Auth
- `POST /api/auth/logout` - Logout user

## 🔧 Troubleshooting

### Database Connection Failed
```bash
# Test connection
npm run db:push

# Check environment variables
cat .env | grep DATABASE_URL
```

### Authentication Not Working
1. Check Supabase API keys in `.env`
2. Verify email provider is enabled in Supabase
3. Check middleware is running (look for network requests to `/api/auth`)

### Emails Not Sending
1. Verify Gmail app passwords are correct
2. Check 2FA is enabled on Gmail accounts
3. Enable IMAP in Gmail settings
4. Check logs: `npm run warmup` (see console output)

### Build Errors
```bash
# Clean build
rm -rf .next node_modules
npm install
npm run build
```

## 📝 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | Supabase pooler connection string | ✅ | - |
| `DIRECT_URL` | Supabase direct connection string | ✅ | - |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ | - |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ | - |
| `CRON_SCHEDULE` | Cron schedule for warmup | ❌ | `0 * * * *` |
| `EMAIL_DELAY_MIN_SECONDS` | Min delay between emails | ❌ | `300` |
| `EMAIL_DELAY_MAX_SECONDS` | Max delay between emails | ❌ | `600` |
| `MAX_EMAILS_PER_HOUR` | Max emails per hour | ❌ | `10` |
| `NODE_ENV` | Environment (development/production) | ❌ | `development` |
| `NEXT_PUBLIC_APP_URL` | App URL | ❌ | `http://localhost:3000` |

## 🎯 Best Practices

1. **Start Small**: Begin with 5-10 emails per day, gradually increase
2. **Use App Passwords**: Never use real Gmail passwords
3. **Warm Schedule**: Don't send all emails at once - spread throughout day
4. **Monitor Logs**: Check `/logs` page regularly for failures
5. **Backup Database**: Regular backups of Supabase database
6. **Rate Limiting**: Respect Gmail sending limits (500/day for free accounts)
7. **Authentication**: Always use authentication in production

## 📧 Support

- **Issues**: Create an issue on GitHub
- **Supabase**: https://supabase.com/docs
- **Gmail API**: https://support.google.com/mail/answer/7126229

---

**Built with**: Next.js 14, Prisma, Supabase, TailwindCSS, Node.js

**Database**: PostgreSQL (Supabase)

**Authentication**: Supabase Auth

**License**: MIT
