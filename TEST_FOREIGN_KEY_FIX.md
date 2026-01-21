# Quick Test Guide for Foreign Key Fix

## Steps to Test the Fix

### 1. Ensure Database is Clean
```bash
pnpm fix:user-ids
```

This will identify and fix any orphaned accounts.

### 2. Start the Development Server
```bash
pnpm dev
```

### 3. Test the Mailbox Creation

1. **Open your browser** and navigate to `http://localhost:3000`

2. **Log in** as a user (not admin)
   - If you see errors, try logging out and logging back in
   - This ensures your session uses the correct user ID

3. **Navigate to the Mailbox/Dashboard page**

4. **Try to add a mailbox** with these test details:
   - Email: `test@example.com`
   - Sender Name: `Test User`
   - App Password: `test-password`
   - SMTP Host: `smtp.example.com`
   - SMTP Port: `587`
   - IMAP Host: `imap.example.com`
   - IMAP Port: `993`

### Expected Results

✅ **Success Case:**
- The mailbox should be created without errors
- You should see a success message
- The mailbox should appear in your list

❌ **If you still see the foreign key error:**
1. Check the browser console for any errors
2. Open browser DevTools → Network tab
3. Look at the `/api/user/mailboxes` request
4. Check the request headers - you should see `Authorization: Bearer <token>`
5. Check the response - it should show the specific error

### 4. Verify User Session

If issues persist, check your user session:

```bash
# Check if you're logged in correctly
# Open browser console and run:
localStorage.getItem('warmup_user')
```

This should show your user data with an ID that matches your Supabase user ID.

### 5. Check Logs

In the terminal where `pnpm dev` is running, you should see:
- No `prisma:error` messages
- Successful `POST /api/user/mailboxes 201` responses

## Troubleshooting

### Issue: "User account not properly initialized"

**Solution:**
1. Log out completely
2. Clear browser localStorage: `localStorage.clear()`
3. Log back in
4. Try again

### Issue: Still getting P2003 foreign key error

**Solution:**
1. Stop the dev server (Ctrl+C)
2. Run `pnpm fix:user-ids`
3. Restart dev server: `pnpm dev`
4. Log out and log back in

### Issue: "Email already registered to another user"

**Solution:**
- Use a different email address
- Or delete the existing account from Prisma Studio:
  ```bash
  pnpm prisma studio
  # Navigate to Account model and delete the record
  ```

## What Changed

The fix ensures:
1. ✅ User IDs from Supabase are properly synchronized
2. ✅ Users are verified to exist before creating accounts
3. ✅ Better error messages guide you to solutions
4. ✅ No more foreign key constraint violations

## Still Having Issues?

Run this diagnostic:

```bash
# Create a test file
cat > /tmp/test-user.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('\n=== Users in Database ===');
  users.forEach(u => {
    console.log(`Email: ${u.email}`);
    console.log(`ID: ${u.id}`);
    console.log(`Role: ${u.role}\n`);
  });
  
  const accounts = await prisma.account.findMany();
  console.log('=== Accounts in Database ===');
  if (accounts.length === 0) {
    console.log('No accounts yet\n');
  } else {
    accounts.forEach(a => {
      console.log(`Email: ${a.email}`);
      console.log(`User ID: ${a.userId || 'NULL'}\n`);
    });
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
EOF

# Run it
node /tmp/test-user.js
```

This will show you the current state of your database.
