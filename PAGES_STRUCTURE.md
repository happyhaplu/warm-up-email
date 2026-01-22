# 📚 Complete Pages Structure

## 🔐 Authentication Pages
- **[/login](pages/login.tsx)** - Main login page (auto-redirects to admin/user dashboards)
- **[/auth/login](pages/auth/login.tsx)** - Alternative login
- **[/reset-password](pages/reset-password.tsx)** - Password reset page

## 👑 Admin Pages (Role: admin)

### Navigation (AdminLayout)
- 📊 Overview - [/admin/dashboard](pages/admin/dashboard.tsx)
- 📬 Mailboxes - [/admin/mailboxes](pages/admin/mailboxes.tsx) **✨ NEWLY ADDED TO NAVIGATION**
- 📝 Templates - [/admin/templates](pages/admin/templates.tsx)
- 🔥 Warmup Control - [/admin/warmup](pages/admin/warmup.tsx)
- 📋 Logs - [/admin/logs](pages/admin/logs.tsx)

### Admin Features
1. **Dashboard** - View all users, mailboxes, and system stats
2. **Mailboxes** - Manage all user mailboxes (view, edit, delete, bulk import)
3. **Templates** - Manage Send Templates & Reply Templates
4. **Warmup Control** - Start/stop warmup automation
5. **Logs** - View all system logs with filters

## 👤 User Pages (Role: user)

### Navigation (Layout)
- 📊 Dashboard - [/user/dashboard](pages/user/dashboard.tsx)
- 📋 Logs - [/user/logs](pages/user/logs.tsx)

### User Features
1. **Dashboard** - Manage own mailboxes (add, edit, delete, bulk import, warmup control)
2. **Logs** - View own email activity logs

## 🔌 API Routes

### Admin APIs
- `/api/admin/stats` - System statistics
- `/api/admin/mailboxes` - Mailbox management (GET, DELETE)
- `/api/admin/bulk-import` - Bulk import mailboxes
- `/api/admin/send-templates` - Send template CRUD
- `/api/admin/reply-templates` - Reply template CRUD
- `/api/admin/logs` - System logs

### User APIs
- `/api/user/logs` - User's logs
- `/api/accounts` - User's mailboxes CRUD
- `/api/warmup/manage` - Warmup control per mailbox **✅ FIXED warmupEnabled error**
- `/api/warmup/trigger` - Manual warmup trigger
- `/api/warmup/status` - Warmup status

### Auth APIs
- `/api/auth/login` - User authentication
- `/api/auth/logout` - User logout
- `/api/auth/me` - Current user info
- `/api/auth/forgot-password` - Password reset request
- `/api/auth/verify-reset-token` - Verify reset token
- `/api/auth/reset-password` - Complete password reset

## 📦 Components

### Layouts
- **[AdminLayout](components/AdminLayout.tsx)** - Blue gradient admin navigation
- **[Layout](components/Layout.tsx)** - Clean user navigation

### Features
- Role-based access control (admin vs user)
- Auto-redirect based on role
- Protected routes with auth middleware
- Shared authentication context

## 🚀 How to Access

### As Admin:
1. Login at `/login` with admin credentials
2. Redirects to `/admin/dashboard`
3. Full access to all admin pages
4. Can view/manage all users and mailboxes

### As User:
1. Login at `/login` with user credentials
2. Redirects to `/user/dashboard`
3. Can only manage own mailboxes
4. Cannot access admin pages (auto-redirected to user dashboard)

## 🔥 Warmup Features

### Per-Mailbox Control (Both Admin & User)
- **Start Warmup** - Enable warmup with custom max daily limit (10-20)
- **Stop Warmup** - Disable warmup
- **Reset Warmup** - Reset progress and restart
- **Update Max Daily** - Change daily limit (10-20 emails)

### Warmup Fields in Database
```prisma
model Account {
  warmupEnabled     Boolean   @default(true)
  warmupStartDate   DateTime?
  warmupMaxDaily    Int       @default(20)
  dailyWarmupQuota  Int       @default(2)
}
```

## ✅ Fixed Issues
1. ✅ Added **Mailboxes** to admin navigation
2. ✅ Fixed `warmupEnabled` TypeScript error (regenerated Prisma client)
3. ✅ Updated user navigation to use correct routes
4. ✅ All warmup management endpoints working
5. ✅ Role-based redirects working properly

## 🎯 Testing

### Admin Access:
```bash
# Visit: http://localhost:3000/login
# Login with admin account
# Should redirect to: http://localhost:3000/admin/dashboard
# Try all navigation: Overview, Mailboxes, Templates, Warmup, Logs
```

### User Access:
```bash
# Visit: http://localhost:3000/login
# Login with user account
# Should redirect to: http://localhost:3000/user/dashboard
# Try navigation: Dashboard, Logs
```

---

**Server Running:** http://localhost:3000

**All pages are now properly configured and accessible! 🎉**
