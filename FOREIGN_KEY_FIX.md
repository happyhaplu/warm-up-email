# Foreign Key Constraint Fix

## Issue Description

Users were encountering the following error when trying to create mailboxes:

```
Foreign key constraint violated: `accounts_user_id_fkey (index)`
```

This error occurred in the `/api/user/mailboxes` endpoint when calling `prisma.account.upsert()`.

## Root Cause

The issue was caused by a mismatch between Supabase user IDs and local database user IDs:

1. **User ID Mismatch**: The authentication system was trying to update existing user records with new Supabase IDs, which is not possible since the ID is a primary key referenced by foreign keys.

2. **Improper User Creation**: When users logged in, the system wasn't properly handling cases where:
   - A user existed with a different ID than the Supabase ID
   - Multiple user records existed for the same email
   - Users weren't created before account creation

3. **No Validation**: The mailbox creation endpoint didn't verify that the user existed in the database before trying to create an account with a foreign key reference.

## Changes Made

### 1. Fixed User Authentication Logic ([lib/api-auth.ts](lib/api-auth.ts))

**Before:**
```typescript
let dbUser = await prisma.user.findUnique({
  where: { email: user.email! },
});

if (!dbUser) {
  dbUser = await prisma.user.create({
    data: {
      id: user.id,
      email: user.email!,
      role: 'user',
    },
  });
}
```

**After:**
```typescript
// First try to find by Supabase ID
let dbUser = await prisma.user.findUnique({
  where: { id: user.id },
});

if (!dbUser) {
  // Check if user exists by email with different ID
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email: user.email! },
  });

  if (existingUserByEmail) {
    // User exists with different ID - use existing user
    console.warn(`User ${user.email} exists with different ID`);
    dbUser = existingUserByEmail;
  } else {
    // Create new user with Supabase ID
    dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        role: 'user',
      },
    });
  }
}
```

### 2. Fixed /api/auth/me Endpoint ([pages/api/auth/me.ts](pages/api/auth/me.ts))

**Removed** the problematic code that tried to update the user ID:
```typescript
// REMOVED - This causes foreign key issues!
if (dbUser.id !== user.id) {
  dbUser = await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      id: user.id,  // ❌ Cannot update primary key with foreign key references
      email: user.email!,
    },
  });
}
```

**Replaced with** proper handling:
- First lookup by Supabase ID
- If not found, check by email
- If exists with different ID, use existing user (log warning)
- Otherwise create new user with correct Supabase ID

### 3. Enhanced Mailbox Creation ([pages/api/user/mailboxes.ts](pages/api/user/mailboxes.ts))

**Added** user validation before account creation:
```typescript
// Verify user exists in database first
const userExists = await prisma.user.findUnique({
  where: { id: user.id },
});

if (!userExists) {
  console.error(`User ${user.id} (${user.email}) not found in database`);
  return res.status(400).json({ 
    error: 'User account not properly initialized. Please log out and log in again.' 
  });
}
```

**Added** better error handling:
```typescript
if (error.code === 'P2003') {
  return res.status(400).json({ 
    error: 'User account error. Please log out and log in again to refresh your session.' 
  });
}
```

### 4. Created Database Cleanup Script ([scripts/fix-user-ids.ts](scripts/fix-user-ids.ts))

Added a maintenance script that:
- Identifies orphaned accounts (accounts referencing non-existent users)
- Removes invalid foreign key references
- Reports on data inconsistencies

**Usage:**
```bash
pnpm fix:user-ids
```

## How to Use

### For Existing Installations

1. **Pull the latest changes**
2. **Run the cleanup script:**
   ```bash
   pnpm fix:user-ids
   ```
3. **Restart your development server:**
   ```bash
   pnpm dev
   ```
4. **Have users log out and log back in** to refresh their sessions

### For New Installations

No special action needed - the fixes are already in place.

## Prevention

The changes ensure that:

1. ✅ Users are always looked up by Supabase ID first
2. ✅ User IDs are never updated after creation
3. ✅ Account creation validates user existence
4. ✅ Better error messages guide users to solutions
5. ✅ Orphaned data can be identified and cleaned

## Testing

After applying these fixes:

1. Log in as a user
2. Try to add a mailbox
3. The foreign key error should no longer occur

If you still see issues:
1. Run `pnpm fix:user-ids`
2. Clear your browser cookies/localStorage
3. Log out and log back in

## Technical Details

### Database Schema

```prisma
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  role      String    @default("user")
  accounts  Account[]
}

model Account {
  id          Int      @id @default(autoincrement())
  userId      String?  @map("user_id")
  email       String   @unique
  // ... other fields
  
  user        User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

The `accounts_user_id_fkey` constraint ensures that `Account.userId` must reference a valid `User.id`.

### Error Codes

- **P2002**: Unique constraint violation (duplicate email)
- **P2003**: Foreign key constraint violation (invalid user reference)

## Related Files

- [lib/api-auth.ts](lib/api-auth.ts) - Authentication middleware
- [pages/api/auth/me.ts](pages/api/auth/me.ts) - User info endpoint
- [pages/api/user/mailboxes.ts](pages/api/user/mailboxes.ts) - Mailbox management
- [scripts/fix-user-ids.ts](scripts/fix-user-ids.ts) - Database cleanup utility
- [prisma/schema.prisma](prisma/schema.prisma) - Database schema

## Conclusion

This fix ensures proper user management and prevents foreign key constraint violations by:
1. Never attempting to update user IDs after creation
2. Always validating user existence before creating related records
3. Providing clear error messages for user-facing issues
4. Offering cleanup tools for existing data issues
