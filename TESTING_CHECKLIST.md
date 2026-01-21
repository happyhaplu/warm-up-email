# ✅ Authentication & Access Control - Testing Checklist

## 🎯 Implementation Complete

All authentication and role-based access control features have been implemented. Use this checklist to verify everything works correctly.

---

## 🔧 Setup

### 1. Start Development Server
```bash
pnpm dev
```
Server should be running at: http://localhost:3000

### 2. Clear Browser Data
Before testing, clear:
- Cookies
- LocalStorage
- SessionStorage

This ensures a fresh authentication state.

---

## 📝 Test Cases

### ✅ Test 1: Default Route Redirect
**Action:** Navigate to http://localhost:3000/
**Expected Result:** 
- Should immediately redirect to `/login`
- No content from home page should be visible

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 2: Unauthenticated Access
**Action:** Try accessing these routes without logging in:
- http://localhost:3000/user/dashboard
- http://localhost:3000/admin/dashboard
- http://localhost:3000/templates
- http://localhost:3000/recipients

**Expected Result:**
- All should redirect to `/login`
- No protected content visible

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 3: User Signup & Login
**Action:**
1. Go to http://localhost:3000/login
2. Click "Sign Up" toggle
3. Enter email: `test@example.com` and password: `Test123456`
4. Sign up and then login

**Expected Result:**
- Signup successful
- Login successful
- Redirected to `/user/dashboard`
- Can see user dashboard with "Mailboxes" section

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 4: User Access Restrictions
**While logged in as user (test@example.com):**

**Action:** Try accessing these URLs:
- http://localhost:3000/templates
- http://localhost:3000/recipients
- http://localhost:3000/admin/dashboard
- http://localhost:3000/admin/templates

**Expected Result:**
- All should redirect to `/user/dashboard`
- Error message may appear briefly
- User cannot access admin-only routes

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 5: User Can Access Own Routes
**While logged in as user:**

**Action:** Navigate to:
- http://localhost:3000/user/dashboard
- http://localhost:3000/dashboard/mailboxes
- http://localhost:3000/dashboard/logs

**Expected Result:**
- All routes accessible
- Can view own mailboxes
- Can view own logs
- Can add new mailboxes

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 6: User API Protection
**While logged in as user:**

**Action:** Open browser console and run:
```javascript
fetch('/api/templates').then(r => r.json()).then(console.log)
fetch('/api/recipients').then(r => r.json()).then(console.log)
fetch('/api/admin/mailboxes').then(r => r.json()).then(console.log)
```

**Expected Result:**
- All should return 403 Forbidden or 401 Unauthorized
- Error message: "Admin access required" or similar

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 7: Admin Login
**Action:**
1. Logout from user account
2. Go to http://localhost:3000/admin/login
3. Enter credentials:
   - Email: `happy.outcraftly@zohomail.in`
   - Password: `System@123321`
4. Click "Sign In"

**Expected Result:**
- Login successful
- Redirected to `/admin/dashboard`
- Can see admin dashboard with global statistics

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 8: Admin Full Access
**While logged in as admin:**

**Action:** Navigate to these routes:
- http://localhost:3000/admin/dashboard
- http://localhost:3000/admin/templates
- http://localhost:3000/admin/mailboxes
- http://localhost:3000/templates
- http://localhost:3000/recipients

**Expected Result:**
- All routes accessible
- Can view all mailboxes (from all users)
- Can manage templates
- Can manage recipients
- Can view global logs

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 9: Admin Redirected from User Routes
**While logged in as admin:**

**Action:** Try accessing:
- http://localhost:3000/user/dashboard
- http://localhost:3000/dashboard/mailboxes

**Expected Result:**
- Should redirect to `/admin/dashboard`
- Admin should use admin routes, not user routes

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 10: Admin API Access
**While logged in as admin:**

**Action:** Open browser console and run:
```javascript
fetch('/api/templates').then(r => r.json()).then(console.log)
fetch('/api/recipients').then(r => r.json()).then(console.log)
fetch('/api/admin/mailboxes').then(r => r.json()).then(console.log)
```

**Expected Result:**
- All requests succeed (200 OK)
- Returns array of templates, recipients, mailboxes
- No authorization errors

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 11: Session Persistence
**Action:**
1. Login as user or admin
2. Close browser tab
3. Reopen http://localhost:3000

**Expected Result:**
- Should redirect to appropriate dashboard (user or admin)
- No need to login again (session persisted)
- User data still available

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 12: Logout Functionality
**Action:**
1. While logged in (user or admin)
2. Click "Logout" button in navigation
3. Try accessing protected routes

**Expected Result:**
- Redirected to `/login` after logout
- All cookies and localStorage cleared
- Cannot access protected routes
- Must login again to access dashboard

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 13: Multiple Users Data Isolation
**Action:**
1. Login as user 1 (test@example.com)
2. Add a mailbox
3. Logout
4. Signup/login as user 2 (test2@example.com)
5. Check mailboxes list

**Expected Result:**
- User 2 cannot see user 1's mailboxes
- Each user sees only their own data
- Data properly isolated

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 14: Admin Sees All Data
**Action:**
1. Login as admin
2. Go to `/admin/mailboxes`
3. Check mailboxes list

**Expected Result:**
- Admin sees mailboxes from ALL users
- Can view user emails in mailbox list
- Has full visibility across users

**Status:** [ ] Pass [ ] Fail

---

### ✅ Test 15: Token Expiry
**Action:**
1. Login as user or admin
2. Open browser console
3. Run: `document.cookie`
4. Note the auth-token
5. Wait 24+ hours OR manually expire token in code (set JWT_EXPIRY to 60000 for 1 minute)
6. Try accessing protected routes

**Expected Result:**
- After expiry, redirected to login
- Session no longer valid
- Must login again

**Status:** [ ] Pass [ ] Fail

---

## 🎯 Production Build Test

### ✅ Test 16: Production Build
**Action:**
```bash
pnpm build
pnpm start
```

**Expected Result:**
- Build completes successfully
- No TypeScript errors
- App runs in production mode
- All authentication features work

**Status:** [ ] Pass [ ] Fail

---

## 🔍 Common Issues & Solutions

### Issue: Infinite redirect loop
**Solution:**
- Clear all cookies and localStorage
- Check middleware.ts is not blocking API routes
- Verify JWT token is valid

### Issue: "Authentication required" error
**Solution:**
- Check if auth-token cookie is set
- Verify token hasn't expired
- Ensure middleware is reading cookies correctly

### Issue: User can access admin routes
**Solution:**
- Check user role in database
- Verify middleware is checking roles correctly
- Clear cache and restart server

### Issue: Admin credentials don't work
**Solution:**
- Verify email: `happy.outcraftly@zohomail.in`
- Verify password: `System@123321`
- Check lib/auth.ts TEMP_ADMIN constant
- Ensure database connection is working

---

## 📊 Test Results Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. Default Route | [ ] | |
| 2. Unauth Access | [ ] | |
| 3. User Signup/Login | [ ] | |
| 4. User Restrictions | [ ] | |
| 5. User Own Routes | [ ] | |
| 6. User API Protection | [ ] | |
| 7. Admin Login | [ ] | |
| 8. Admin Full Access | [ ] | |
| 9. Admin User Routes | [ ] | |
| 10. Admin API Access | [ ] | |
| 11. Session Persistence | [ ] | |
| 12. Logout | [ ] | |
| 13. Data Isolation | [ ] | |
| 14. Admin All Data | [ ] | |
| 15. Token Expiry | [ ] | |
| 16. Production Build | [ ] | |

---

## ✅ Final Checklist

Before deploying to production:

- [ ] All test cases passing
- [ ] Production build successful
- [ ] JWT_SECRET changed from default
- [ ] Admin credentials updated (or moved to Supabase)
- [ ] Database migrations run
- [ ] Environment variables configured
- [ ] HTTPS enabled for cookies
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Backup strategy in place

---

## 🎉 Success Criteria

The implementation is successful when:

✅ **Default route** redirects to login  
✅ **All routes** require authentication  
✅ **Users** can only access their dashboard, mailboxes, and logs  
✅ **Users** cannot access templates or recipients  
✅ **Admin** has full access to all routes and data  
✅ **Admin** cannot access user-specific routes  
✅ **Sessions** persist across page reloads  
✅ **Logout** properly clears all authentication  
✅ **Data isolation** works between users  
✅ **Production build** completes successfully  

---

**Last Updated:** January 21, 2026  
**Status:** Ready for Testing
