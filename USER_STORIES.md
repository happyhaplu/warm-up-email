# 📧 Gmail Warmup System - User Stories Implementation

## 🎯 Three Core User Stories

### User Story 1: Dashboard & Auth ✅ (Priority: Complete First)
**As a user**, I can log in via Supabase Auth and view a dashboard showing mailboxes, recipients, templates, and logs with analytics (sent count, reply rate, failures), so I can monitor warm-up health securely.

**Status**: READY - Requires Supabase API keys

**Features**:
- ✅ Supabase email/password authentication
- ✅ Mandatory login (no bypass)
- ✅ Dashboard with analytics cards
- ✅ Mailboxes table view
- ✅ Recipients table view
- ✅ Templates list view
- ✅ Activity logs with filters
- ✅ Real-time metrics calculation

---

### User Story 2: Mailbox & Data Management (Next)
**As a user**, I can add, edit, delete, and bulk import mailboxes (SMTP/IMAP credentials, sender name, app password), recipients, and templates into the system, so I can manage all warm-up data in one place.

**Status**: Partially implemented

**Features**:
- ✅ Add/Edit/Delete accounts via UI
- ✅ Add/Edit/Delete recipients via UI
- ✅ Add/Edit/Delete templates via UI
- ✅ Bulk import endpoints (CSV/JSON)
- ✅ Supabase PostgreSQL integration
- ⚠️ Needs SMTP/IMAP credential validation

---

### User Story 3: Warm-up Automation (Final)
**As a user**, I can start a warm-up job that randomly selects sender, recipient, and template, sends emails via SMTP, waits 5 minutes between sends, checks inbox via IMAP, auto-replies with natural responses, and logs all actions into Supabase.

**Status**: Partially implemented

**Features**:
- ✅ Random sender/recipient/template selection
- ✅ SMTP email sending (nodemailer)
- ✅ 5-minute delays between sends
- ✅ IMAP inbox checking
- ✅ Logging to Supabase
- ⚠️ Needs auto-reply engine
- ⚠️ Needs natural response generator

---

## 🚀 CRITICAL: Get Started (Fix "Invalid API Key")

The app currently shows "Invalid API key" because you need to add real Supabase keys.

### Quick Setup (2 minutes)

**Option 1: Automated Script**
```bash
./setup-supabase.sh
```

**Option 2: Manual Setup**

1. **Get your Supabase keys**:
   - Visit: https://supabase.com/dashboard/project/dcxnduxjczwzsxtitgjx/settings/api
   - Copy the "anon public" key (starts with `eyJhbGci...`)

2. **Update .env**:
   ```bash
   # Open .env and replace this line:
   NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."  # ← paste your real key
   ```

3. **Restart server**:
   ```bash
   npm run dev
   ```

4. **Access the app**:
   - http://localhost:3000
   - Sign up with your email
   - Start using the dashboard!

---

## 📊 User Story 1: Dashboard & Auth (CURRENT FOCUS)

### Authentication Flow

```
┌─────────────────────────────────────────────────────────┐
│  Visit http://localhost:3000                            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ Has Supabase  │
         │  keys setup?  │
         └───────┬───────┘
                 │
        ┌────────┴────────┐
        │                 │
       NO                YES
        │                 │
        ▼                 ▼
┌──────────────┐   ┌─────────────┐
│ /setup-      │   │  Has user   │
│  required    │   │  session?   │
└──────────────┘   └──────┬──────┘
                          │
                   ┌──────┴──────┐
                   │             │
                  NO            YES
                   │             │
                   ▼             ▼
             ┌──────────┐  ┌──────────┐
             │ /login   │  │/dashboard│
             └──────────┘  └──────────┘
```

### Dashboard Pages

| Page | Route | Features |
|------|-------|----------|
| **Main Dashboard** | `/dashboard` | 4 analytics cards, recent activity |
| **Mailboxes** | `/dashboard/mailboxes` | Gmail accounts table |
| **Recipients** | `/dashboard/recipients` | Warmup recipients table |
| **Templates** | `/dashboard/templates` | Email templates list |
| **Logs** | `/dashboard/logs` | Activity history with filters |

### Analytics Metrics

All metrics calculated from the **Logs** table:

```javascript
// Total Sent Emails
logs.filter(log => log.status === 'SUCCESS').length

// Total Replies
logs.filter(log => log.status === 'REPLY_SUCCESS').length

// Reply Rate
(totalReplies / totalSent) * 100

// Failures
logs.filter(log => log.status.includes('FAILED')).length
```

---

## 🗄️ Database Schema (Supabase PostgreSQL)

```prisma
model Account {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  appPassword  String   // Gmail app password
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
  status    String   // SUCCESS, FAILED, REPLY_SUCCESS, etc.
  notes     String?
}
```

---

## 🔒 Security (Authentication Mandatory)

**Changed from previous version:**
- ❌ No demo mode
- ❌ No "Continue without login"
- ❌ No auth bypass
- ✅ Supabase Auth required
- ✅ All routes protected
- ✅ Session-based access only

**Protected Routes:**
- `/dashboard/*` - All dashboard pages
- `/accounts/*` - Account management
- `/recipients/*` - Recipient management
- `/templates/*` - Template management
- `/logs` - Activity logs
- `/` - Root redirects to dashboard (if logged in) or login

**Public Routes:**
- `/login` - Login/signup page
- `/setup-required` - Setup instructions (when keys missing)

---

## 📦 What's Included (Focused on 3 User Stories)

### Core Pages (User Story 1)
- ✅ `pages/login.tsx` - Supabase auth
- ✅ `pages/dashboard.tsx` - Analytics dashboard
- ✅ `pages/dashboard/mailboxes.tsx` - Mailboxes view
- ✅ `pages/dashboard/recipients.tsx` - Recipients view
- ✅ `pages/dashboard/templates.tsx` - Templates view
- ✅ `pages/dashboard/logs.tsx` - Activity logs

### Data Management (User Story 2)
- ✅ `pages/accounts.tsx` - Full CRUD for mailboxes
- ✅ `pages/recipients.tsx` - Full CRUD for recipients
- ✅ `pages/templates.tsx` - Full CRUD for templates
- ✅ `pages/api/accounts/bulk-import.ts` - CSV/JSON import
- ✅ `pages/api/recipients/bulk-import.ts` - CSV/JSON import
- ✅ `pages/api/templates/bulk-import.ts` - CSV/JSON import

### Automation (User Story 3)
- ✅ `services/warmup.js` - Email automation worker
- ✅ `pages/api/warmup/send.ts` - Send warmup email
- ✅ `pages/api/warmup/status.ts` - Get warmup status
- ⚠️ Auto-reply engine (needs implementation)

### Configuration
- ✅ `lib/supabase.ts` - Supabase client (strict mode)
- ✅ `middleware.ts` - Mandatory auth enforcement
- ✅ `components/Layout.tsx` - Navigation & user menu

---

## 🗑️ Removed/Not Needed

These files/features are NOT part of the 3 user stories and can be ignored:

- ❌ Demo mode
- ❌ Auth bypass
- ❌ Old auth pages (`pages/auth/*` - use `/login` instead)
- ❌ Placeholder key support
- ❌ Graceful degradation for missing keys

---

## 🎯 Next Steps (Implementation Order)

### ✅ Step 1: Complete User Story 1 (Dashboard & Auth)
1. Get Supabase API keys (use `./setup-supabase.sh`)
2. Update `.env` with real keys
3. Restart dev server: `npm run dev`
4. Visit http://localhost:3000
5. Sign up with your email
6. Verify dashboard shows all 4 sections

### 🔜 Step 2: User Story 2 (Data Management)
1. Test CRUD operations for accounts/recipients/templates
2. Add SMTP/IMAP credential validation
3. Test bulk import with CSV files
4. Verify data persists in Supabase

### 🔜 Step 3: User Story 3 (Automation)
1. Implement auto-reply engine
2. Add natural response generator (GPT-like)
3. Test full warmup cycle end-to-end
4. Monitor logs for success/failures

---

## 🐛 Troubleshooting

### "Invalid API key" Error
**Cause**: PLACEHOLDER keys in .env  
**Fix**: Run `./setup-supabase.sh` or manually update .env with real keys

### Can't access dashboard
**Cause**: Not logged in (auth is mandatory)  
**Fix**: Sign up at `/login` with any email address

### Database not working
**Cause**: Schema not pushed to Supabase  
**Fix**: Run `npx prisma db push`

### Build errors
**Cause**: Missing Supabase keys during build  
**Fix**: Add real keys before running `npm run build`

---

## 📚 Commands

```bash
# Setup (first time)
./setup-supabase.sh          # Interactive setup with Supabase keys

# Development
npm run dev                  # Start dev server
npm run build                # Build for production
npm start                    # Run production server

# Database
npx prisma generate          # Generate Prisma client
npx prisma db push           # Push schema to Supabase
npx prisma studio            # Open database GUI

# Warmup Worker
npm run warmup               # Start automation worker
pm2 start ecosystem.config.js # Production worker with PM2
```

---

## 🎉 Success Criteria

### User Story 1 (Dashboard & Auth) - Complete When:
- [ ] No "Invalid API key" errors
- [ ] Can sign up with email/password
- [ ] Dashboard shows 4 analytics cards
- [ ] All 4 tables (mailboxes, recipients, templates, logs) accessible
- [ ] Metrics calculate correctly from logs
- [ ] Cannot access without login

### User Story 2 (Data Management) - Complete When:
- [ ] Can add/edit/delete mailboxes with SMTP/IMAP credentials
- [ ] Can add/edit/delete recipients
- [ ] Can add/edit/delete templates
- [ ] CSV bulk import works for all 3 entities
- [ ] All data persists in Supabase PostgreSQL

### User Story 3 (Automation) - Complete When:
- [ ] Can start warmup job
- [ ] Random selection works (sender/recipient/template)
- [ ] Emails send via SMTP successfully
- [ ] 5-minute delay between sends
- [ ] IMAP checks inbox for replies
- [ ] Auto-replies with natural responses
- [ ] All actions logged to Supabase

---

**Current Status**: User Story 1 ready, waiting for Supabase API keys to complete setup.

**Run**: `./setup-supabase.sh` to get started! 🚀
