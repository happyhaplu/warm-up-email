# 👑 Admin Setup Guide

## Current Admin Account

✅ **Admin User Created:**
- **Email:** `aadarshkumarhappy@gmail.com`
- **Role:** `admin`
- **Password:** Your existing password (same as before)

## How to Login as Admin

1. Go to: http://localhost:3000/login
2. Enter email: `aadarshkumarhappy@gmail.com`
3. Enter your password
4. You will be redirected to: http://localhost:3000/admin/dashboard

## Admin vs User Access

### Admin Pages (👑):
- **Dashboard** - `/admin/dashboard` - View all users and system stats
- **Mailboxes** - `/admin/mailboxes` - Manage ALL mailboxes (all users)
- **Templates** - `/admin/templates` - Manage send/reply templates
- **Warmup Control** - `/admin/warmup` - Global warmup automation
- **Logs** - `/admin/logs` - View all system logs

### User Pages (👤):
- **Dashboard** - `/user/dashboard` - Manage own mailboxes only
- **Logs** - `/user/logs` - View own activity only

## Managing Admin Users

### List All Users
```bash
node scripts/manage-admin.js list
```

### Make a User an Admin
```bash
node scripts/manage-admin.js make email@example.com
```

### Remove Admin Role
```bash
node scripts/manage-admin.js remove email@example.com
```

## What Was Fixed

1. ✅ **Created Admin User** - Set `aadarshkumarhappy@gmail.com` as admin
2. ✅ **Fixed Navigation** - Added "Mailboxes" to admin menu
3. ✅ **Fixed Warmup Fields** - Regenerated Prisma client
4. ✅ **Role-Based Redirects** - Admin → `/admin/dashboard`, User → `/user/dashboard`

## Testing Admin Access

### Step 1: Login
```
URL: http://localhost:3000/login
Email: aadarshkumarhappy@gmail.com
Password: (your password)
```

### Step 2: Verify Redirect
- ✅ Should redirect to `/admin/dashboard`
- ❌ If redirects to `/user/dashboard`, logout and login again

### Step 3: Test Navigation
Click on each menu item:
- 📊 Overview
- 📬 Mailboxes
- 📝 Templates
- 🔥 Warmup Control
- 📋 Logs

All should work without redirecting to user pages.

## Common Issues

### Issue: Redirects to User Dashboard Instead of Admin
**Solution:**
1. Logout completely
2. Clear browser cache/cookies
3. Login again
4. Check user role: `node scripts/manage-admin.js list`

### Issue: "Unauthorized" Error
**Solution:**
The user might not exist in the database yet. First signup, then run:
```bash
node scripts/manage-admin.js make email@example.com
```

### Issue: Navigation Missing "Mailboxes"
**Solution:** Already fixed! The navigation now includes:
- Overview, Mailboxes, Templates, Warmup Control, Logs

## Database Schema

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      String   @default("user") // "user" or "admin"
  accounts  Account[]
}
```

## Security Notes

- Only users with `role: "admin"` can access admin pages
- Regular users are automatically redirected to user dashboard
- Admin users can view/manage all users' data
- Regular users can only see their own data

---

**Your admin account is ready to use! 🎉**

Login at: http://localhost:3000/login
