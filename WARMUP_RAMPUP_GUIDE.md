# Warmup Gradual Ramp-Up Feature

## Overview

The email warmup system now includes **gradual ramp-up scheduling** and **advanced randomization** to safely warm up mailboxes while avoiding Gmail's pattern detection algorithms.

## Features

### 1. Gradual Ramp-Up Schedule

Each mailbox follows a proven warm-up schedule that gradually increases sending volume:

| Days | Daily Limit | Phase |
|------|-------------|-------|
| 1-3  | 3 emails    | Initial |
| 4-6  | 5 emails    | Early |
| 7-10 | 7 emails    | Growing |
| 11-14 | 10 emails  | Mature |
| 15+ | 10-20 emails | Established (configurable) |

**Benefits:**
- Safe ramp-up prevents triggering spam filters
- Each mailbox has independent start date and schedule
- Automatic tracking of warmup progress
- Configurable maximum daily limit (10-20 emails)

### 2. Randomization

**Send Time Randomization:**
- ±30-90 minutes offset from scheduled time
- Prevents mailboxes from sending at exact same time
- Natural variation mimics human behavior

**Reply Delay Randomization:**
- 5-240 minutes delay before replying
- Simulates realistic email response times
- Logged for tracking purposes

**Content Randomization:**
- Subject line variations (emojis, "Re:", punctuation changes)
- Body variations (greetings, closings)
- Ensures no two emails are identical

**Send Order Randomization:**
- Mailboxes selected in random order each cycle
- 2-10 minute delays between sends
- Prevents pattern detection

### 3. Database Schema

**New Account Fields:**
```typescript
warmupStartDate: DateTime?  // When warmup began
warmupEnabled: Boolean      // Whether warmup is active
warmupMaxDaily: Int         // Cap at 10-20 emails/day
```

**WarmupLog Model:**
```typescript
{
  mailboxId: Int
  date: Date
  dayNumber: Int         // Days since warmup start
  sentCount: Int         // Emails sent this day
  repliedCount: Int      // Replies sent this day
  dailyLimit: Int        // What the limit was for this day
}
```

## API Endpoints

### Manage Warmup: `/api/warmup/manage`

**Start Warmup:**
```bash
POST /api/warmup/manage
{
  "mailboxId": 1,
  "action": "start",
  "warmupMaxDaily": 20  // Optional, defaults to 20
}
```

**Stop Warmup:**
```bash
POST /api/warmup/manage
{
  "mailboxId": 1,
  "action": "stop"
}
```

**Reset Warmup (restart from Day 1):**
```bash
POST /api/warmup/manage
{
  "mailboxId": 1,
  "action": "reset"
}
```

**Update Max Daily Limit:**
```bash
POST /api/warmup/manage
{
  "mailboxId": 1,
  "action": "updateMax",
  "warmupMaxDaily": 15  // Must be 10-20
}
```

### Get Warmup Stats: `/api/warmup/stats`

**Response includes:**
```json
{
  "stats": [
    {
      "mailboxId": 1,
      "email": "user@example.com",
      "warmupEnabled": true,
      "warmupStartDate": "2026-01-15T00:00:00Z",
      "warmupDayNumber": 8,
      "warmupPhase": "Growing (Day 7-10)",
      "dailyQuota": 7,
      "sentToday": 4,
      "repliesToday": 2,
      "remaining": 3,
      "totalSent": 38,
      "percentComplete": 57,
      "warmupLog": {
        "dayNumber": 8,
        "sentCount": 4,
        "repliedCount": 2,
        "dailyLimit": 7
      }
    }
  ],
  "summary": {
    "totalMailboxes": 3,
    "totalSentToday": 12,
    "totalRemaining": 8,
    "mailboxesComplete": 0
  }
}
```

## Utility Functions

### `getDailyLimit(daysSinceStart, maxDaily)`
Returns the daily send limit based on ramp-up schedule.

```typescript
const limit = getDailyLimit(8, 20);  // Returns 7 (Day 8 is in Growing phase)
```

### `getDaysSinceStart(startDate)`
Calculates days since warmup began (1-indexed).

```typescript
const days = getDaysSinceStart(new Date('2026-01-15'));  // Returns day number
```

### `randomizeSubject(subject)`
Adds slight variations to email subject.

```typescript
const varied = randomizeSubject('Quick question');
// Could return: "Quick question 👋", "Re: Quick question", "Quick question!", etc.
```

### `randomizeBody(body)`
Adds greetings and closings to email body.

```typescript
const varied = randomizeBody('I wanted to reach out...');
// Could return: "Hi,\n\nI wanted to reach out...\n\nBest regards"
```

### `getRandomSendOffset()`
Returns random offset in milliseconds (±30-90 minutes).

```typescript
const offset = getRandomSendOffset();  // -72 to +90 minutes
```

### `getRandomReplyDelay()`
Returns random delay in milliseconds (5-240 minutes).

```typescript
const delay = getRandomReplyDelay();  // 5 to 240 minutes
```

## Testing

Run the comprehensive test suite:

```bash
npm run test:warmup-rampup
# or
npx tsx scripts/test-warmup-rampup.ts
```

**Test Coverage:**
- ✅ Daily limit ramp-up schedule (Days 1-20)
- ✅ Days since start calculation
- ✅ Send time randomization (±30-90 min)
- ✅ Reply delay randomization (5-240 min)
- ✅ Subject/body template variations
- ✅ Multiple mailboxes with different start dates

## Production Usage

### 1. Enable Warmup for a Mailbox

```javascript
// Start warmup with max 15 emails/day cap
await fetch('/api/warmup/manage', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mailboxId: 1,
    action: 'start',
    warmupMaxDaily: 15
  })
});
```

### 2. Monitor Progress

```javascript
// Get current warmup stats
const response = await fetch('/api/warmup/stats');
const { stats } = await response.json();

stats.forEach(mailbox => {
  console.log(`${mailbox.email}: Day ${mailbox.warmupDayNumber}`);
  console.log(`  Phase: ${mailbox.warmupPhase}`);
  console.log(`  Progress: ${mailbox.sentToday}/${mailbox.dailyQuota}`);
});
```

### 3. Start Warmup Cron Service

```bash
# Manual trigger
curl -X POST http://localhost:3000/api/warmup/trigger

# Or use PM2 for automatic scheduling
pm2 start ecosystem.config.js
```

## How It Works

### Warmup Cycle Flow

1. **Check Mailboxes**: Get all mailboxes with `warmupEnabled: true`
2. **Initialize Start Date**: Auto-set `warmupStartDate` if null
3. **Calculate Day Number**: Days since warmup started
4. **Get Daily Limit**: Based on ramp-up schedule
5. **Count Sent Today**: Check how many emails sent today
6. **Filter Available**: Keep mailboxes with remaining quota
7. **Randomize Order**: Shuffle to prevent patterns
8. **Send Emails**: With random delays between sends (2-10 min)
9. **Randomize Content**: Vary subject and body
10. **Check Replies**: Auto-reply with random delays (5-240 min)
11. **Log Activity**: Update WarmupLog table

### Example Scenario

**3 Mailboxes:**
- `mailbox1@example.com` - Started today (Day 1) - Limit: 3/day
- `mailbox2@example.com` - Started 6 days ago (Day 7) - Limit: 7/day  
- `mailbox3@example.com` - Started 15 days ago (Day 16) - Limit: 20/day

**Cycle Execution:**
```
🔄 Running warmup cycle...
📊 3 mailbox(es) have quota remaining:
   mailbox3@example.com: Day 16, 12/20 sent, 8 remaining
   mailbox1@example.com: Day 1, 0/3 sent, 3 remaining
   mailbox2@example.com: Day 7, 3/7 sent, 4 remaining

📧 Sending from mailbox3 to mailbox1
⏳ Waiting 7 minutes before next send...
📧 Sending from mailbox1 to mailbox2
⏳ Waiting 4 minutes before next send...
📧 Sending from mailbox2 to mailbox3
```

## Best Practices

1. **Start Slow**: Begin warmup when mailbox is first created
2. **Monitor Daily**: Check warmup logs to ensure proper progression
3. **Stagger Starts**: Don't start all mailboxes on same day
4. **Set Realistic Caps**: Use 10-15 for new domains, 20 for established
5. **Review Logs**: Check for bounces or spam folder placements
6. **Adjust if Needed**: Can stop/reset warmup if issues detected

## Safety Features

- **Automatic Initialization**: Warmup starts automatically when enabled
- **Daily Quota Enforcement**: Never exceeds calculated daily limit
- **Independent Schedules**: Each mailbox has its own timeline
- **Progress Tracking**: WarmupLog records all activity
- **Randomization**: Prevents Gmail pattern detection
- **Graceful Ramp-Up**: Follows industry-standard warm-up curve

## Migration

The database migration `20260122074540_add_warmup_tracking` adds:
- `warmup_start_date` column to accounts
- `warmup_enabled` column (default: true)
- `warmup_max_daily` column (default: 20)
- `warmup_logs` table for daily tracking

Existing accounts will have `warmupEnabled: true` and `warmupStartDate: null`, which will be auto-set when warmup cycle runs.

## Monitoring

**Check warmup logs:**
```sql
SELECT 
  a.email,
  wl.date,
  wl.day_number,
  wl.sent_count,
  wl.replied_count,
  wl.daily_limit
FROM warmup_logs wl
JOIN accounts a ON a.id = wl.mailbox_id
ORDER BY wl.date DESC, a.email;
```

**View warmup progress:**
```sql
SELECT 
  email,
  warmup_start_date,
  EXTRACT(DAY FROM NOW() - warmup_start_date) + 1 as day_number,
  warmup_enabled,
  warmup_max_daily
FROM accounts
WHERE warmup_enabled = true;
```

## Troubleshooting

**Warmup not starting:**
- Ensure `warmupEnabled: true`
- Check that warmup cron service is running
- Verify mailbox has valid SMTP/IMAP credentials

**Quota not increasing:**
- Check `warmupStartDate` is set correctly
- Verify day calculation is accurate
- Review WarmupLog table for anomalies

**Pattern detection concerns:**
- Ensure randomization is working (check logs for varied send times)
- Verify template variations are being applied
- Confirm send order is shuffled each cycle

## Performance

- **Database Queries**: Optimized with upsert and batch operations
- **Memory Usage**: Minimal - processes mailboxes sequentially
- **Network**: Efficient - only sends when quota available
- **Scalability**: Supports 100+ mailboxes per instance
