# 🔐 How to Login to the Email Warmup Dashboard

## Problem: Can't Login?

If you're unable to login, it's likely because:
1. Your user exists in PostgreSQL but not in Supabase Auth
2. You haven't created a password yet

## ✅ Quick Solution

### Option 1: Create Account via UI (Recommended)

1. Go to: **http://localhost:3000/login**
2. Click **"Sign up"** (toggle at bottom)
3. Enter your email: `happy.outcraftly@zohomail.in`
4. Create a password (e.g., `Admin@123`)
5. Click "Sign up"
6. Check your email for verification (or skip if auto-verified)
7. Click **"Sign in"** and login with your credentials

### Option 2: Use Existing Supabase Dashboard

1. Go to Supabase Dashboard: https://app.supabase.com
2. Select your project: `dcxnduxjczwzsxtitgjx`
3. Go to **Authentication** → **Users**
4. Click **"Add user"** → **"Create new user"**
5. Enter:
   - Email: `happy.outcraftly@zohomail.in`
   - Password: `Admin@123` (or your choice)
   - Auto-confirm: ✅ Yes
6. Click "Create user"
7. Go to http://localhost:3000/login and sign in

### Option 3: Reset Password

If the user already exists in Supabase:

1. Go to: http://localhost:3000/login
2. Click "Forgot password?"
3. Enter your email
4. Check email for reset link
5. Create new password
6. Login

## 🎯 Test Login

**URL:** http://localhost:3000/login

**Admin Credentials:**
```
Email: happy.outcraftly@zohomail.in
Password: Admin@123  (or whatever you set)
```

**After Login:**
- Admins: Redirected to `/admin/dashboard`
- Users: Redirected to `/user/dashboard`

## 📊 Your Current Users

From the database:
```
✅ happy.outcraftly@zohomail.in (admin)
✅ aadarsh.outcraftlyai1@outlook.com (user)
✅ aadarshkumarhappy@gmail.com (user)
```

These users exist in PostgreSQL. You just need to create them in Supabase Auth (use Option 1 or 2 above).

## 🔧 Troubleshooting

### "Invalid credentials" error?
- User doesn't exist in Supabase Auth yet
- Use Option 1 (Sign up) or Option 2 (Supabase Dashboard)

### "Email already registered"?
- User exists! Try logging in
- If you forgot password, use "Forgot password?" link

### Can't verify email?
- In development, email verification is optional
- Or go to Supabase Dashboard → Authentication → Users → click user → "Confirm email"

### Still having issues?
Check Supabase Auth status:
```bash
# Check if Supabase is configured
pnpm tsx -e "
import { isSupabaseReady } from './lib/supabase';
console.log('Supabase configured:', isSupabaseReady);
"
```

## 🚀 Quick Start

```bash
# 1. Make sure server is running
pnpm dev

# 2. Open browser
http://localhost:3000/login

# 3. Click "Sign up" if first time
#    Or "Sign in" if you already created account

# 4. Enjoy! 🎉
```

## ⚙️ Manual Supabase Auth Setup (Advanced)

If you want to script it:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref dcxnduxjczwzsxtitgjx

# Create user via SQL
supabase db execute "
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at)
VALUES (
  'happy.outcraftly@zohomail.in',
  crypt('Admin@123', gen_salt('bf')),
  NOW()
);
"
```

But honestly, **Option 1 (UI signup) is easiest!** 😊
