# Warmup System Improvements - Implementation Guide

## ✅ Completed

### 1. Configuration System
- **File:** `lib/warmup-config.ts`
- **Features:**
  - Centralized configuration for all warmup parameters
  - Environment variable support
  - Validation functions
  - Configurable delays, limits, and thresholds

### 2. Database Schema Updates
- **File:** `prisma/schema.prisma`
- **Changes:**
  - Enhanced `Recipient` model with `isActive` and `tags` for dedicated pool
  - New `ScheduledReply` table for deferred reply execution
  - New `RateLimitLog` table for global rate limiting
  - Proper indexes for performance

### 3. Utility Functions
- **File:** `lib/warmup-utils.ts`
- **Updates:**
  - All functions now use `WarmupConfig` values
  - New `getScheduledReplyTime()` for reply scheduling
  - New `checkPlanLimits()` for plan enforcement
  - Improved type safety

## 📋 Next Steps Required

### Step 1: Apply Database Migrations
```bash
# Generate migration from schema changes
npx prisma migrate dev --name add_scheduled_replies_and_rate_limits

# Or apply manually
npx prisma db push
```

### Step 2: Update warmup-cron.ts

Key implementations needed:

#### A. Reply Delay Mechanism
```typescript
// Instead of sending replies immediately:
// 1. Create ScheduledReply record
await prisma.scheduledReply.create({
  data: {
    accountId,
    accountEmail,
    originalFrom,
    originalSubject,
    originalMessageId,
    replyTemplate,
    scheduledFor: getScheduledReplyTime(),
    status: 'pending'
  }
});

// 2. Add processScheduledReplies() function
// Called every cron cycle to check for due replies
```

#### B. Email Uniqueness Check
```typescript
// Before selecting recipient:
const sentToday = await prisma.log.findMany({
  where: {
    senderId,
    timestamp: { gte: today },
    recipient: potentialRecipient.email
  }
});

if (sentToday.length > 0) {
  // Skip this recipient
  continue;
}
```

#### C. Plan Limits Enforcement
```typescript
// In getMailboxQuotaInfo():
const user = await prisma.user.findUnique({
  where: { id: account.userId },
  include: { plan: true }
});

if (user?.plan) {
  const usage = await getUserUsage(user.id);
  const limits = checkPlanLimits(usage, user.plan);
  
  if (limits.dailyLimitExceeded) {
    // Skip this mailbox
    return null;
  }
}
```

#### D. Global Rate Limiting
```typescript
// Check global rate before sending:
const currentHourSlot = new Date();
currentHourSlot.setMinutes(0, 0, 0);

const hourlyCount = await prisma.rateLimitLog.findUnique({
  where: { timeSlot: currentHourSlot }
});

if (hourlyCount && hourlyCount.count >= WarmupConfig.GLOBAL_HOURLY_LIMIT) {
  console.log('⏸️ Global hourly limit reached, pausing...');
  return;
}

// After sending, increment:
await prisma.rateLimitLog.upsert({
  where: { timeSlot: currentHourSlot },
  update: { count: { increment: 1 } },
  create: { timeSlot: currentHourSlot, count: 1 }
});
```

#### E. Dedicated Recipient Pool
```typescript
// Option to use recipients table instead of peer-to-peer:
if (WarmupConfig.USE_DEDICATED_RECIPIENT_POOL) {
  recipients = await prisma.recipient.findMany({
    where: { isActive: true }
  });
} else {
  // Current peer-to-peer logic
  recipients = await prisma.account.findMany({
    where: { id: { not: senderId } }
  });
}
```

### Step 3: Update API Endpoints

Files to modify:
- `pages/api/user/warmup-settings.ts`
- `pages/api/user/mailboxes.ts`  
- `pages/api/admin/mailboxes.ts`

Add plan validation:
```typescript
import { validateWarmupSettings } from '../../../lib/warmup-config';
import { checkPlanLimits } from '../../../lib/warmup-utils';

// Before allowing mailbox creation:
const user = await prisma.user.findUnique({
  where: { id: user.id },
  include: { plan: true, accounts: true }
});

if (user.plan && user.accounts.length >= user.plan.mailboxLimit) {
  return res.status(403).json({ 
    error: `Mailbox limit reached (${user.plan.mailboxLimit})` 
  });
}

// Validate warmup settings:
const validation = validateWarmupSettings(settings);
if (!validation.valid) {
  return res.status(400).json({ errors: validation.errors });
}
```

### Step 4: Environment Variables

Add to `.env`:
```env
# Warmup Configuration
WARMUP_SEND_DELAY_MIN=3
WARMUP_SEND_DELAY_MAX=15
WARMUP_REPLY_DELAY_MIN=5
WARMUP_REPLY_DELAY_MAX=240
WARMUP_GLOBAL_HOURLY_LIMIT=500
WARMUP_GLOBAL_MINUTE_LIMIT=20
WARMUP_USE_RECIPIENT_POOL=false
WARMUP_VERBOSE_LOGGING=false
WARMUP_CHECK_INTERVAL_MS=300000
```

### Step 5: Testing

Create test file `tests/warmup-improvements.test.ts`:
```typescript
import { getDailyLimit, checkPlanLimits } from '../lib/warmup-utils';
import { validateWarmupSettings } from '../lib/warmup-config';

describe('Warmup Improvements', () => {
  test('Daily limit calculation', () => {
    expect(getDailyLimit(1, 20, 3, 3)).toBe(3);
    expect(getDailyLimit(2, 20, 3, 3)).toBe(6);
    expect(getDailyLimit(10, 20, 3, 3)).toBe(20); // capped
  });

  test('Plan limits enforcement', () => {
    const result = checkPlanLimits(
      { mailboxCount: 5, dailyEmailsSent: 100, monthlyEmailsSent: 2500 },
      { mailboxLimit: 10, dailyEmailLimit: 100, monthlyEmailLimit: 3000 }
    );
    expect(result.exceeded).toBe(true);
    expect(result.dailyLimitExceeded).toBe(true);
  });

  test('Settings validation', () => {
    const result = validateWarmupSettings({
      warmupStartCount: 50  // Too high
    });
    expect(result.valid).toBe(false);
  });
});
```

## 🔍 Summary

**Files Created:**
- ✅ `lib/warmup-config.ts` - Configuration system
- ✅ `WARMUP_IMPROVEMENTS.md` - This guide

**Files Modified:**
- ✅ `prisma/schema.prisma` - New tables and fields
- ✅ `lib/warmup-utils.ts` - Enhanced utilities

**Files Pending:**
- ⏳ `lib/warmup-cron.ts` - Core improvements needed
- ⏳ `pages/api/user/warmup-settings.ts` - Add validation
- ⏳ `pages/api/user/mailboxes.ts` - Add plan checks
- ⏳ `pages/api/admin/mailboxes.ts` - Add plan checks
- ⏳ `tests/warmup-improvements.test.ts` - Unit tests

**Migration Steps:**
1. Run `npx prisma migrate dev`
2. Implement warmup-cron.ts changes
3. Update API endpoints
4. Add environment variables
5. Run tests
6. Deploy

**Backward Compatibility:**
- ✅ All existing functionality preserved
- ✅ Config defaults match current behavior
- ✅ New features are opt-in via env vars
- ✅ No breaking changes to API

**Performance Impact:**
- Minimal - only adds DB checks before sending
- Scheduled replies reduce immediate load
- Rate limiting prevents overload
- Indexes optimize query performance
