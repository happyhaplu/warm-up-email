# 🚀 START HERE - Gmail Warmup Dashboard

## ⚠️ Current Issue: "Invalid API key"

You're seeing this error because **Supabase API keys are required** to run this app.

---

## ✅ Quick Fix (2 Minutes)

### Option 1: Automated Setup (Recommended)
```bash
./setup-supabase.sh
```
This script will:
1. Guide you to get your Supabase keys
2. Update your .env file automatically
3. Test the connection
4. Set up the database

### Option 2: Manual Setup

**Step 1: Get Your Supabase Keys**

Visit: https://supabase.com/dashboard/project/dcxnduxjczwzsxtitgjx/settings/api

Copy your **anon/public** key (starts with `eyJhbGci...`)

**Step 2: Update .env**

Open `.env` file and replace this line:
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."  # ← paste your real key here
```

**Step 3: Test Connection**
```bash
./test-supabase-connection.sh
```

**Step 4: Start Server**
```bash
npm run dev
```

---

## 🎯 What This App Does

### Three User Stories:

1. **Dashboard & Auth** ✅
   - Secure login with Supabase
   - View analytics (sent count, reply rate, failures)
   - Manage mailboxes, recipients, templates

2. **Data Management** 🔄
   - Add/edit/delete Gmail accounts (SMTP/IMAP)
   - Manage recipients and email templates
   - Bulk import from CSV

3. **Warmup Automation** 🔄
   - Send warmup emails automatically
   - 5-minute delays between sends
   - Auto-reply to inbox messages
   - Log all activity

---

## 📋 Quick Commands

```bash
# First time setup
./setup-supabase.sh              # Get and configure Supabase keys

# Test connection
./test-supabase-connection.sh    # Verify keys work

# Development
npm run dev                      # Start dev server (http://localhost:3000)

# Database
npx prisma db push               # Push schema to Supabase

# Production
npm run build                    # Build for production
npm start                        # Run production server
```

---

## 🔒 Authentication (MANDATORY)

**Changed**: Authentication is now **required** for all users.

- ✅ Must sign up/login to access
- ✅ All routes protected
- ✅ Session-based security
- ❌ No demo mode
- ❌ No bypass

---

## 📱 Pages After Login

| Page | What You'll See |
|------|-----------------|
| `/dashboard` | Analytics with 4 metric cards |
| `/dashboard/mailboxes` | Gmail accounts table |
| `/dashboard/recipients` | Recipients table |
| `/dashboard/templates` | Email templates list |
| `/dashboard/logs` | Activity history with filters |

---

## 🐛 Common Issues

### Issue: "Invalid API key" on login page
**Fix**: You need to add real Supabase keys
```bash
./setup-supabase.sh
```

### Issue: Can't sign up
**Fix**: Check if keys are correct
```bash
./test-supabase-connection.sh
```

### Issue: Database errors
**Fix**: Push schema to Supabase
```bash
npx prisma db push
```

---

## 📚 Documentation

- `USER_STORIES.md` - Detailed implementation guide
- `GET_KEYS_NOW.md` - Step-by-step key retrieval
- `README_DASHBOARD.md` - Feature documentation
- `FEATURES_COMPLETE.md` - Complete feature list

---

## ✨ After Setup

Once you've added your Supabase keys:

1. Visit http://localhost:3000
2. Sign up with your email
3. Start adding mailboxes and recipients
4. View analytics on the dashboard!

---

**Need Help?** Run `./setup-supabase.sh` for guided setup! 🚀
