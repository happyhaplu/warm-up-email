# 🔥 Gmail Warm-up Tool

> **Complete email warm-up automation with user/admin separation, template system, and intelligent automation**

## ✨ Features

### 👤 User Side
- ✅ **Supabase Authentication** - Secure user sign-up and login
- ✅ **Mailbox Management** - Connect Gmail accounts with SMTP/IMAP
- ✅ **Personal Dashboard** - View your mailbox stats and activity
- ✅ **Activity Logs** - Track emails sent/received from your accounts
- ✅ **Real-time Stats** - Monitor send rate, reply rate, and failures

### 🛠️ Admin Side
- ✅ **Global Dashboard** - View all connected mailboxes and users
- ✅ **Template Management** - Create/edit SendTemplates and ReplyTemplates
- ✅ **Mailbox Pool** - Manage all connected accounts across users
- ✅ **Global Analytics** - Monitor overall warmup performance
- ✅ **Activity Monitoring** - Track all warmup activity across the platform

### 🎯 Warm-up Engine
- ✅ **Smart Automation** - Random sender/recipient selection from pool
- ✅ **Template System** - Use templates for natural-looking emails
- ✅ **Auto-Reply** - Automatic replies using reply templates
- ✅ **5-Minute Intervals** - Configurable delay between sends
- ✅ **SMTP/IMAP Integration** - Real email sending and receiving
- ✅ **Activity Logging** - Comprehensive logging of all actions

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (or npm/yarn)
- Supabase account with PostgreSQL database
- Gmail accounts with App Passwords enabled

### 1. Clone & Install
```bash
git clone <your-repo>
cd email-warmup
pnpm install
```

### 2. Setup Environment
Create `.env` file:
```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 3. Run Setup Script
```bash
chmod +x quick-setup.sh
./quick-setup.sh
```

Or manually:
```bash
pnpm db:generate
pnpm db:migrate:deploy
node prisma/seed-templates.js
pnpm build
```

### 4. Start Application
```bash
# Development
pnpm dev

# Production
pnpm start
```

---

## 🔐 Login Credentials

### Admin Access (Temporary)
- **URL**: http://localhost:3000/login
- **Email**: `happy.outcraftly@zohomail.in`
- **Password**: `System@123321`
- **Redirects to**: `/admin/dashboard`

### User Access
- **Sign up** at http://localhost:3000/login
- **Confirm email** via Supabase
- **Redirects to**: `/user/dashboard`

---

## 📖 User Guide

### For Regular Users

1. **Sign Up**
   - Go to `/login`
   - Click "Sign Up"
   - Enter email and password
   - Confirm email from inbox

2. **Connect Mailbox**
   - Login → `/user/dashboard`
   - Click "Add Mailbox"
   - Enter:
     - Email address
     - Sender name (optional)
     - Gmail App Password
     - SMTP/IMAP settings (defaults provided)

3. **View Stats**
   - Dashboard shows:
     - Total emails sent
     - Total replies received
     - Reply rate percentage
     - Failures count

4. **Check Logs**
   - Go to `/user/logs`
   - See all emails sent/received from your accounts
   - Filter by status (SENT, REPLIED, FAILED)

---

## 👨‍💼 Admin Guide

### Admin Features

1. **Global Dashboard** (`/admin/dashboard`)
   - View total mailboxes across all users
   - See global stats (total sent, replies, failures)
   - Monitor all connected accounts

2. **Template Management** (`/admin/templates`)
   - **Send Templates**: Full emails with subject + body
   - **Reply Templates**: Short replies (e.g., "Thanks!")
   - Add/Edit/Delete templates
   - Templates randomly selected during warmup

3. **Pool Management**
   - All connected mailboxes act as sender/recipient pool
   - View mailbox owners
   - Monitor connection status

4. **Global Logs**
   - See all warmup activity across platform
   - Filter by user, mailbox, status
   - Export logs for analysis

---

## 🎯 Warm-up Flow

### How It Works

```
1. Pick Random Sender → Select from mailbox pool
2. Pick Random Recipient → Select different mailbox from pool
3. Get Send Template → Random template with subject + body
4. Send Email → Via SMTP
5. Wait 30s → Let email arrive
6. Check Inbox → Recipient checks IMAP
7. Get Reply Template → Random short reply
8. Send Reply → Via SMTP
9. Log Action → Record in database
10. Wait 5 min → Configurable delay
11. Repeat → Loop continues
```

### Starting Warmup

**Option 1: API Call**
```bash
curl -X POST http://localhost:3000/api/warmup/trigger \
  -H "Content-Type: application/json" \
  -d '{"minDelayMinutes": 5, "autoReply": true}'
```

**Option 2: Admin Interface**
*Coming soon: Admin warmup control panel*

**Option 3: Programmatic**
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

## 🗂️ Project Structure

```
email-warmup/
├── components/           # React components
│   └── Layout.tsx
├── lib/                 # Core libraries
│   ├── auth.ts         # Authentication helpers
│   ├── api-auth.ts     # API auth middleware
│   ├── supabase.ts     # Supabase client
│   ├── prisma.ts       # Prisma client
│   └── warmup-service-v2.ts  # Enhanced warmup engine
├── pages/
│   ├── admin/          # Admin pages
│   │   ├── dashboard.tsx
│   │   └── templates.tsx
│   ├── user/           # User pages
│   │   ├── dashboard.tsx
│   │   └── logs.tsx
│   ├── api/            # API routes
│   │   ├── admin/      # Admin endpoints
│   │   ├── user/       # User endpoints
│   │   └── warmup/     # Warmup control
│   ├── login.tsx
│   └── dashboard.tsx   # Router
├── prisma/
│   ├── schema.prisma   # Database schema
│   ├── seed-templates.js
│   └── migrations/
├── COMPLETE_GUIDE.md   # Detailed guide
└── package.json
```

---

## 🔌 API Endpoints

### User APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/mailboxes` | List user's mailboxes |
| POST | `/api/user/mailboxes` | Connect new mailbox |
| GET | `/api/user/stats` | Get user's stats |
| GET | `/api/user/logs` | Get user's logs |

### Admin APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Global statistics |
| GET | `/api/admin/mailboxes` | All mailboxes |
| GET | `/api/admin/send-templates` | List send templates |
| POST | `/api/admin/send-templates` | Create send template |
| DELETE | `/api/admin/send-templates?id=X` | Delete template |
| GET | `/api/admin/reply-templates` | List reply templates |
| POST | `/api/admin/reply-templates` | Create template |
| DELETE | `/api/admin/reply-templates?id=X` | Delete template |

### Warmup APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/warmup/trigger` | Start warmup |
| DELETE | `/api/warmup/trigger` | Stop warmup |
| GET | `/api/warmup/status` | Check status |

---

## 🗄️ Database Schema

### Users
- `id` (UUID) - Primary key
- `email` (String) - Unique
- `role` (String) - "user" or "admin"
- `createdAt`, `updatedAt`

### Accounts (Mailboxes)
- `id` (Int) - Primary key
- `userId` (UUID) - Foreign key to Users
- `email`, `senderName`
- `smtpHost`, `smtpPort`, `imapHost`, `imapPort`
- `appPassword` (encrypted)

### SendTemplates
- `id` (Int)
- `subject`, `body`
- Used for initial warmup emails

### ReplyTemplates
- `id` (Int)
- `text`
- Used for auto-replies

### Logs
- `id` (Int)
- `senderId`, `recipientId` - FK to Accounts
- `sender`, `recipient` (emails)
- `subject`, `status`, `notes`
- `timestamp`

---

## 🛠️ Development

### Run Development Server
```bash
pnpm dev
```

### Build for Production
```bash
pnpm build
pnpm start
```

### Database Commands
```bash
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Create migration
pnpm db:push        # Push schema changes
pnpm db:studio      # Open Prisma Studio
```

### PM2 (Production)
```bash
pnpm pm2:start      # Start with PM2
pnpm pm2:stop       # Stop
pnpm pm2:restart    # Restart
pnpm pm2:logs       # View logs
```

---

## 🧪 Testing

### Manual Testing Flow

1. **Admin Login**
   ```
   → Go to /login
   → Use: happy.outcraftly@zohomail.in / System@123321
   → Should redirect to /admin/dashboard
   ```

2. **Add Templates**
   ```
   → Go to /admin/templates
   → Add SendTemplate: subject + body
   → Add ReplyTemplate: short text
   ```

3. **User Signup**
   ```
   → Go to /login → Sign Up
   → Enter email/password
   → Confirm via Supabase email
   ```

4. **Connect Mailbox**
   ```
   → Login as user
   → Go to /user/dashboard
   → Click "Add Mailbox"
   → Enter Gmail credentials
   ```

5. **Start Warmup**
   ```bash
   curl -X POST http://localhost:3000/api/warmup/trigger \
     -H "Content-Type: application/json" \
     -d '{"minDelayMinutes": 5}'
   ```

6. **Monitor Activity**
   ```
   → Admin: /admin/dashboard
   → User: /user/logs
   → Check database: pnpm db:studio
   ```

---

## 🔮 Roadmap

- [ ] Replace temp admin with Supabase Auth + roles
- [ ] Bulk mailbox import (CSV)
- [ ] Advanced scheduling (time-based warmup)
- [ ] Email open tracking
- [ ] Reputation score calculator
- [ ] Email threading
- [ ] Multi-language templates
- [ ] Webhook notifications
- [ ] Admin control panel for warmup
- [ ] User warmup pause/resume
- [ ] Template variables (name, company, etc.)
- [ ] A/B testing for templates

---

## 📝 Environment Variables

```env
# Required
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhb..."
SUPABASE_SERVICE_ROLE_KEY="eyJhb..."

# Optional
NODE_ENV="production"
PORT=3000
```

---

## 📞 Support

- **Documentation**: See `COMPLETE_GUIDE.md`
- **Database**: `pnpm db:studio`
- **Logs**: Terminal output or `pnpm pm2:logs`
- **Issues**: Check GitHub Issues

---

## 📄 License

MIT License - See LICENSE file

---

## 🙏 Credits

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a service
- [Prisma](https://www.prisma.io/) - ORM
- [Nodemailer](https://nodemailer.com/) - Email sending
- [TypeScript](https://www.typescriptlang.org/) - Type safety

---

**⚡ Start warming up your Gmail accounts today!**
