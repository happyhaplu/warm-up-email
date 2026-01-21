# 🚀 Quick Setup Guide - Simplified Supabase Auth

## ✅ System Now Using ONLY Supabase

All complex JWT and mixed authentication has been removed. The system now uses **only Supabase Auth** and **Supabase PostgreSQL**.

---

## 📝 Setup Steps

### 1. Create Your First User in Supabase

1. Go to your Supabase project: https://dcxnduxjczwzsxtitgjx.supabase.co
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"** or **"Invite user"**
4. Enter email and password
5. Confirm the email (check verification email)

### 2. Set Admin Role

To make a user an admin:

**Option A: Using Supabase Dashboard**
1. Go to **Table Editor** → `users` table
2. Find the user by email
3. Edit the row
4. Change `role` column from `user` to `admin`
5. Save

**Option B: Using SQL Editor**
```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';
```

---

## 🔐 How Login Works Now

1. **All users** log in at: http://localhost:3000/login
2. Supabase Auth validates credentials
3. System checks `users` table for role
4. Redirects based on role:
   - **Admin** → `/admin/dashboard` (full access)
   - **User** → `/user/dashboard` (restricted access)

---

## 🎯 User Roles Explained

### Regular User (`role: 'user'`)
✅ Can access:
- `/user/dashboard`
- `/dashboard/mailboxes`
- `/dashboard/logs`
- Own mailboxes only
- Own data only

❌ Cannot access:
- `/admin/*` routes
- `/templates`
- `/recipients`
- Other users' data

### Admin (`role: 'admin'`)
✅ Full access to:
- All `/admin/*` routes
- `/templates` and `/recipients`
- All users' mailboxes
- Global logs and analytics
- All system features

---

## 🧪 Test Your Setup

### Create Test Users

1. **Create Admin User:**
   - Email: `admin@test.com`
   - Password: `Admin123!`
   - Set role to `admin` in database

2. **Create Regular User:**
   - Email: `user@test.com`
   - Password: `User123!`
   - Role will be `user` by default

### Test Admin Access
1. Login at http://localhost:3000/login
2. Use admin credentials
3. Should redirect to `/admin/dashboard`
4. Check you can access `/admin/templates`

### Test User Access
1. Logout
2. Login with user credentials
3. Should redirect to `/user/dashboard`
4. Try accessing `/admin/dashboard` - should be blocked
5. Try accessing `/templates` - should be blocked

---

## 🔧 What Was Removed

### Deleted/Simplified:
- ❌ JWT token generation and verification
- ❌ Hardcoded admin credentials
- ❌ Multiple auth systems (JWT + Supabase)
- ❌ localStorage auth fallbacks
- ❌ Complex middleware with JWT checks
- ❌ Separate admin login page
- ❌ Old `/api/auth/login` endpoint

### Now Using:
- ✅ **Only Supabase Auth** for authentication
- ✅ **Supabase PostgreSQL** for user data and roles
- ✅ **Simple middleware** that lets client-side handle auth
- ✅ **One login page** for all users
- ✅ **Role-based routing** via React context

---

## 📊 Database Schema

### `users` table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

The `id` matches Supabase Auth `user.id` automatically.

---

## 🐛 Troubleshooting

### "Login failed" error
- Check if user exists in Supabase Auth
- Verify email is confirmed
- Check password is correct

### "Failed to get user data" error
- User exists in Supabase Auth but not in `users` table
- API will auto-create user with role='user'
- Check database connection

### Redirecting to wrong dashboard
- Check `role` in `users` table
- Should be exactly 'admin' or 'user' (lowercase)
- Clear browser cache and cookies

### Can't access admin routes
- Verify role is set to 'admin' in database
- Logout and login again
- Check browser console for errors

---

## 🎉 Benefits of Simplified System

1. **Easier to maintain** - One auth system (Supabase)
2. **More secure** - No hardcoded credentials
3. **Better UX** - One login page for all users
4. **Cloud-native** - Uses Supabase for everything
5. **Scalable** - Built on Supabase infrastructure

---

## 📞 Next Steps

1. **Create your admin user** in Supabase
2. **Test login** with admin credentials
3. **Verify access** to admin routes
4. **Create regular users** for testing
5. **Start using** the warmup tool!

---

**Last Updated:** January 21, 2026  
**Status:** ✅ Production Ready (Simplified)
