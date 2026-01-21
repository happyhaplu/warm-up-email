# Gmail Warmup Dashboard - Complete Setup Guide

## 🎯 Features

- **Supabase Authentication**: Secure login/signup with email & password
- **Protected Dashboard**: Analytics with sent count, reply rate, and failures
- **Mailboxes Management**: View and manage Gmail accounts
- **Recipients Management**: Organize warmup recipients
- **Templates Management**: Email templates library
- **Activity Logs**: Complete history with filtering
- **Production Ready**: PM2, Docker, optimized builds

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase

Get your Supabase keys from: https://supabase.com/dashboard/project/dcxnduxjczwzsxtitgjx/settings/api

Update `.env`:
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

### 3. Setup Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Seed Initial Data (Optional)
```bash
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

## 📱 Dashboard Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | `/login` | Authentication page |
| Dashboard | `/dashboard` | Analytics overview with cards |
| Mailboxes | `/dashboard/mailboxes` | Gmail accounts table |
| Recipients | `/dashboard/recipients` | Recipients list |
| Templates | `/dashboard/templates` | Email templates |
| Logs | `/dashboard/logs` | Activity history with filters |

## 🔐 Authentication

### With Supabase Auth (Production)
1. Configure Supabase keys in `.env`
2. Users must sign up/login
3. Protected routes redirect to `/login`

### Demo Mode (Development)
- Leave Supabase keys as PLACEHOLDER
- Click "Continue without login"
- All features work without authentication

## 📊 Analytics

The dashboard displays:
- **Total Sent**: Successfully sent emails
- **Replies**: Emails with replies (SUCCESS_REPLY status)
- **Reply Rate**: Percentage of sent emails that received replies
- **Failures**: Failed email attempts

Metrics are calculated from the Logs table in real-time.

## 🏗️ Production Deployment

### Option 1: PM2 (Recommended)
```bash
npm run build
npm install -g pm2
pm2 start ecosystem.config.js
```

### Option 2: Docker
```bash
docker build -t gmail-warmup .
docker run -p 3000:3000 --env-file .env gmail-warmup
```

### Option 3: Manual
```bash
npm run build
npm start
```

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL connection string |
| `DIRECT_URL` | ✅ | Direct PostgreSQL connection |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ | Anon key (optional for demo) |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ | Service role key (optional) |
| `EMAIL_DELAY_MIN_SECONDS` | ❌ | Min delay between emails (default: 300) |
| `EMAIL_DELAY_MAX_SECONDS` | ❌ | Max delay between emails (default: 600) |
| `MAX_EMAILS_PER_HOUR` | ❌ | Rate limit (default: 10) |

## 📦 Database Schema

```prisma
model Account {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  appPassword  String
  name         String?
  status       String   @default("ACTIVE")
  createdAt    DateTime @default(now())
}

model Recipient {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
}

model Template {
  id        Int      @id @default(autoincrement())
  subject   String
  body      String
  createdAt DateTime @default(now())
}

model Log {
  id        Int      @id @default(autoincrement())
  timestamp DateTime @default(now())
  sender    String
  recipient String
  subject   String
  status    String
  notes     String?
}
```

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/logout` - Logout user

### Accounts (Mailboxes)
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create account
- `PUT /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account
- `POST /api/accounts/bulk-import` - Import CSV/JSON

### Recipients
- `GET /api/recipients` - List all recipients
- `POST /api/recipients` - Create recipient
- `PUT /api/recipients/:id` - Update recipient
- `DELETE /api/recipients/:id` - Delete recipient
- `POST /api/recipients/bulk-import` - Import CSV/JSON

### Templates
- `GET /api/templates` - List all templates
- `POST /api/templates` - Create template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/templates/bulk-import` - Import CSV/JSON

### Logs
- `GET /api/logs` - List all logs

### Warmup
- `POST /api/warmup/send` - Send warmup email
- `GET /api/warmup/status` - Get warmup status
- `POST /api/warmup/trigger` - Trigger warmup cycle

## 🔄 Warmup Worker

Start the background worker:
```bash
npm run warmup
```

The worker:
- Runs on a cron schedule (default: every hour)
- Selects random account + recipient + template
- Sends email with random delay (5-10 minutes)
- Respects rate limits (10 emails/hour per account)
- Logs all activities to database

## 📁 Project Structure

```
email-warmup/
├── pages/
│   ├── dashboard.tsx          # Main dashboard with analytics
│   ├── login.tsx              # Login/signup page
│   ├── dashboard/
│   │   ├── mailboxes.tsx     # Mailboxes table
│   │   ├── recipients.tsx    # Recipients table
│   │   ├── templates.tsx     # Templates list
│   │   └── logs.tsx          # Activity logs with filters
│   ├── api/
│   │   ├── accounts/         # Account CRUD + bulk import
│   │   ├── recipients/       # Recipient CRUD + bulk import
│   │   ├── templates/        # Template CRUD + bulk import
│   │   ├── logs/             # Log viewing
│   │   ├── auth/             # Logout endpoint
│   │   └── warmup/           # Warmup automation
├── components/
│   └── Layout.tsx            # Main layout with nav & auth
├── lib/
│   └── supabase.ts           # Supabase client config
├── services/
│   └── warmup.js             # Email automation worker
├── middleware.ts             # Route protection
├── prisma/
│   └── schema.prisma         # Database schema
└── ecosystem.config.js       # PM2 configuration
```

## 🎨 Tech Stack

- **Frontend**: Next.js 14, React 18, TailwindCSS 3
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth (@supabase/ssr)
- **ORM**: Prisma 5
- **Email**: nodemailer, imap-simple
- **Automation**: node-cron
- **Process Manager**: PM2

## 📝 Usage Examples

### Import Accounts (CSV)
```csv
email,appPassword,name
user1@gmail.com,app-password-1,User One
user2@gmail.com,app-password-2,User Two
```

Upload via bulk import or:
```bash
curl -X POST http://localhost:3000/api/accounts/bulk-import \
  -H "Content-Type: text/csv" \
  -d @accounts.csv
```

### Check Analytics
```bash
curl http://localhost:3000/api/logs | jq '
  {
    total: length,
    success: [.[] | select(.status == "SUCCESS")] | length,
    failed: [.[] | select(.status | contains("FAILED"))] | length
  }
'
```

## 🔒 Security Notes

- Never commit `.env` file
- Use app passwords for Gmail (not main password)
- Rotate Supabase service role key regularly
- Enable RLS (Row Level Security) in Supabase for production
- Use HTTPS in production

## 🐛 Troubleshooting

### Build Errors
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Database Issues
```bash
npx prisma migrate reset
npx prisma db push
```

### Auth Not Working
1. Check Supabase keys in `.env`
2. Verify keys don't contain "PLACEHOLDER"
3. Check Supabase dashboard → Authentication → URL Configuration
4. Ensure Site URL = http://localhost:3000

## 📚 Documentation

- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [PM2 Guide](https://pm2.keymetrics.io/docs/usage/quick-start/)

## 🤝 Support

For issues or questions:
1. Check `.env` configuration
2. Review console errors in browser
3. Check server logs: `pm2 logs`
4. Verify database connection: `npx prisma studio`

---

**Ready to warm up your Gmail? 📧🔥**
