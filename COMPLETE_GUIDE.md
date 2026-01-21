# Gmail Warm-up Tool - Complete Setup Guide

## 🎯 Project Overview

This is a complete Gmail warm-up automation tool with:
- **User Side**: Simple mailbox connect + personal dashboard
- **Admin Side**: Full pool management, templates, and analytics
- **Warm-up Engine**: Automated send/reply with smart templates

## 🔐 Login Credentials

### Admin Login (Temporary)
- **Email**: `happy.outcraftly@zohomail.in`
- **Password**: `System@123321`

### User Login
Users can sign up through Supabase Auth at `/login`

---

## 📦 Installation Steps

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Setup Environment Variables
Create a `.env` file:
```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 3. Run Database Migrations
```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed templates (optional but recommended)
node prisma/seed-templates.js
```

### 4. Build & Run
```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

---

## 🏗️ Architecture

### Database Schema

**Users Table**
- Stores user accounts with roles (`user` or `admin`)
- Connected to Accounts via `userId`

**Accounts Table**
- Mailboxes with SMTP/IMAP credentials
- Belongs to a User (or admin-managed)
- Acts as both sender and recipient pool

**SendTemplates Table**
- Templates for first emails (subject + body)
- Admin can add/edit/delete

**ReplyTemplates Table**
- Short reply templates (just text)
- Used for auto-replies

**Logs Table**
- All warmup activity logs
- Linked to sender/recipient accounts

---

## 👤 User Flow

1. **Sign Up** → Create account via Supabase Auth
2. **Login** → Access personal dashboard at `/user/dashboard`
3. **Connect Mailbox** → Add Gmail accounts with app passwords
4. **View Stats** → See personal warmup metrics
5. **View Logs** → Track emails sent/received from your mailboxes

### User Pages
- `/user/dashboard` - Mailbox management & stats
- `/user/logs` - Personal activity logs

---

## 🛠️ Admin Flow

1. **Login** → Use temporary credentials (happy.outcraftly@zohomail.in)
2. **Dashboard** → View global stats at `/admin/dashboard`
3. **Manage Pool** → See all connected mailboxes
4. **Templates** → Add/edit SendTemplates and ReplyTemplates at `/admin/templates`
5. **Global Logs** → Monitor all warmup activity

### Admin Pages
- `/admin/dashboard` - Overview with global stats
- `/admin/templates` - Template management
- `/admin/mailboxes` - View all mailboxes
- `/admin/logs` - Global activity logs

---

## 🎯 Warm-up Engine

### How It Works

1. **Random Selection**: Pick random sender & recipient from account pool
2. **Send Email**: Use random SendTemplate → send via SMTP
3. **Wait 30s**: Let email arrive
4. **Check Inbox**: Recipient checks IMAP for new email
5. **Auto-Reply**: Use random ReplyTemplate → send reply
6. **Wait 5 min**: Delay before next cycle
7. **Repeat**: Loop continues while service is running

### Starting Warmup

**Via API**:
```bash
curl -X POST http://localhost:3000/api/warmup/trigger \
  -H "Content-Type: application/json" \
  -d '{"minDelayMinutes": 5, "autoReply": true}'
```

**Via Code**:
```typescript
import { warmupServiceV2 } from './lib/warmup-service-v2';

await warmupServiceV2.startWarmup({
  minDelayMinutes: 5,
  autoReply: true,
});
```

### Stopping Warmup
```bash
curl -X DELETE http://localhost:3000/api/warmup/trigger
```

---

## 📝 API Endpoints

### User APIs
- `GET /api/user/mailboxes` - Get user's mailboxes
- `POST /api/user/mailboxes` - Connect new mailbox
- `GET /api/user/stats` - Get user's stats
- `GET /api/user/logs` - Get user's logs

### Admin APIs
- `GET /api/admin/stats` - Global statistics
- `GET /api/admin/mailboxes` - All mailboxes
- `GET /api/admin/send-templates` - List send templates
- `POST /api/admin/send-templates` - Create send template
- `DELETE /api/admin/send-templates?id=X` - Delete send template
- `GET /api/admin/reply-templates` - List reply templates
- `POST /api/admin/reply-templates` - Create reply template
- `DELETE /api/admin/reply-templates?id=X` - Delete reply template

### Warmup APIs
- `POST /api/warmup/trigger` - Start warmup
- `DELETE /api/warmup/trigger` - Stop warmup
- `GET /api/warmup/status` - Check status

---

## 🔑 Authentication

### User Auth
- **Method**: Supabase Auth (email/password)
- **Pages**: `/login`, `/auth/callback`
- **Protected**: User pages require Supabase session

### Admin Auth
- **Method**: Temporary hardcoded credentials
- **Email**: `happy.outcraftly@zohomail.in`
- **Password**: `System@123321`
- **Session**: Cookie-based (`admin-session` token)
- **Protected**: Admin pages check for admin role

### Future Enhancement
Replace temporary admin login with Supabase Auth + role-based access control

---

## 🚀 Production Deployment

### Build
```bash
pnpm build
```

### Run with PM2
```bash
pnpm pm2:start
```

### Docker
```bash
pnpm docker:build
pnpm docker:run
```

---

## 📊 Database Migrations

After schema changes:
```bash
# Create migration
pnpm db:migrate

# Deploy to production
pnpm db:migrate:deploy
```

---

## 🧪 Testing

1. **Login as Admin**
   - Go to `/login`
   - Use: `happy.outcraftly@zohomail.in` / `System@123321`
   - Should redirect to `/admin/dashboard`

2. **Add Templates**
   - Go to `/admin/templates`
   - Add SendTemplates (subject + body)
   - Add ReplyTemplates (short text)

3. **Sign Up as User**
   - Go to `/login` → Switch to Sign Up
   - Create account with email/password
   - Confirm email via Supabase

4. **Connect Mailbox**
   - Login as user → `/user/dashboard`
   - Click "Add Mailbox"
   - Enter Gmail credentials (use App Password)

5. **Start Warmup**
   - POST to `/api/warmup/trigger`
   - Check `/admin/logs` or `/user/logs` for activity

---

## 📁 Key Files

- `/lib/auth.ts` - Authentication helpers
- `/lib/api-auth.ts` - API authentication middleware
- `/lib/warmup-service-v2.ts` - Enhanced warmup engine
- `/prisma/schema.prisma` - Database schema
- `/pages/admin/*` - Admin pages
- `/pages/user/*` - User pages
- `/pages/api/admin/*` - Admin API routes
- `/pages/api/user/*` - User API routes

---

## 🎨 Features

✅ Dual authentication (User + Admin)
✅ Role-based access control
✅ Mailbox pool management
✅ Template system (Send + Reply)
✅ Automated warmup engine
✅ Activity logging
✅ User-scoped dashboards
✅ Admin analytics
✅ SMTP/IMAP integration
✅ Production-ready build

---

## 🔮 Future Enhancements

- [ ] Replace temporary admin with Supabase Auth + roles
- [ ] Bulk mailbox import
- [ ] Advanced scheduling (time-based warmup)
- [ ] Email open tracking
- [ ] Reputation score calculation
- [ ] Email chain threading
- [ ] Multi-language templates
- [ ] Webhook notifications

---

## 📞 Support

For issues or questions, check:
- Database logs: `pnpm db:studio`
- Application logs: Check terminal output
- PM2 logs: `pnpm pm2:logs`

---

**Built with**: Next.js, Supabase, Prisma, PostgreSQL, TypeScript
**License**: MIT
