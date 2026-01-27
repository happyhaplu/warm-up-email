# Warmup System Audit Notes

**Date:** January 27, 2026  
**Current:** 48 mailboxes × 10 emails/day = expected ~480, actual 30-40  
**Target:** 100 mailboxes/user × thousands of users, all quotas met

---

## Part 1: Current Bottleneck Analysis

### Issue 1: Status Case Mismatch (CRITICAL)

| Operation | Value | Location |
|-----------|-------|----------|
| Writing logs | `'SENT'` | Line 556 |
| Counting sent today | `'sent'` | Line 312 |
| Uniqueness check | `'sent'` | Line 470 |
| Plan limit checks | `['SENT', 'REPLIED']` | Lines 246, 256, 397, 413 |

**Effect:** Per-mailbox quota tracking returns 0 (case mismatch), but plan limits work (uppercase). System thinks each mailbox has full quota but still rate-limits at global/plan level.

### Issue 2: Sequential Processing Architecture

```
Current Flow (per cycle):
┌─────────────────────────────────────────────────────┐
│  for each mailbox (one at a time):                  │
│    → send 1 email                                   │
│    → wait 3-15 minutes                              │
│    → next mailbox                                   │
└─────────────────────────────────────────────────────┘
```

- **Problem:** Blocking loop, no parallelism
- **48 mailboxes × 9 min avg = 7.2 hours per loop**
- **Only ~3 complete loops per 24 hours**

### Issue 3: One Email Per Mailbox Per Cycle

```typescript
// Current: sends exactly 1, then moves on
await this.sendWarmupEmail(mailbox.mailboxId);  // ONE email
// Should: loop until quota filled
```

- Mailbox quota: 10/day
- Sends per cycle: 1
- Cycles per day: ~3
- **Actual per mailbox: ~3 emails (not 10)**

### Issue 4: Delay Configuration

| Setting | Current | Problem |
|---------|---------|---------|
| `SEND_DELAY_MIN` | 3 min | Too long for scale |
| `SEND_DELAY_MAX` | 15 min | Blocks throughput |
| `CHECK_INTERVAL_MS` | 5 min | Cycle starts slow |
| Inter-mailbox delay | 3-15 min | Sequential bottleneck |

---

## Part 2: Math Breakdown

### Current System (48 mailboxes)

```
Available time:           24 hours = 1,440 minutes
Inter-mailbox delay:      3-15 min (avg 9 min)
Time per full loop:       48 × 9 = 432 min (~7 hours)
Loops per day:            1,440 ÷ 432 = 3.3 loops
Emails per loop:          48 (one per mailbox)
Theoretical max:          48 × 3 = 144 emails
Actual (with overhead):   30-40 emails
```

### Target System (100 mailboxes × 1000 users)

```
Total mailboxes:          100,000
Emails needed per day:    100,000 × 10 = 1,000,000
Emails per minute needed: 1,000,000 ÷ 1,440 = 694/min
Current capacity:         ~0.03/min per instance
Gap:                      23,000x improvement needed
```

---

## Part 3: Scale-Ready Design

### Architecture: Distributed Worker Model

```
┌─────────────────────────────────────────────────────────────┐
│                     SCHEDULER SERVICE                        │
│  - Runs every 1-5 minutes                                   │
│  - Queries mailboxes with remaining quota                    │
│  - Creates "send jobs" in queue                              │
│  - Respects global rate limits                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      JOB QUEUE (Redis/DB)                   │
│  - Stores pending send jobs                                  │
│  - Tracks job status: pending → processing → done/failed    │
│  - Prevents duplicate processing                             │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   WORKER 1      │ │   WORKER 2      │ │   WORKER N      │
│  - Picks jobs   │ │  - Picks jobs   │ │  - Picks jobs   │
│  - Sends emails │ │  - Sends emails │ │  - Sends emails │
│  - Updates logs │ │  - Updates logs │ │  - Updates logs │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Key Design Principles

1. **Decouple scheduling from sending**
   - Scheduler creates jobs fast
   - Workers process jobs in parallel

2. **Per-mailbox quota batching**
   - If mailbox needs 10 emails, create 10 jobs
   - Spread jobs across time window (e.g., 6am-10pm)

3. **Configurable concurrency**
   - Workers process N jobs simultaneously
   - Adjustable per deployment size

4. **Natural delay within mailbox, not between**
   - Delay between emails FROM same mailbox: 2-10 min
   - Different mailboxes can send in parallel

### New Config Structure

```typescript
export const ScaleConfig = {
  // Scheduler
  SCHEDULER_INTERVAL_MS: 60_000,        // Check every 1 min
  JOBS_PER_SCHEDULER_RUN: 500,          // Create up to 500 jobs/run
  
  // Workers
  WORKER_CONCURRENCY: 10,               // Process 10 jobs in parallel
  WORKER_COUNT: 5,                      // Run 5 worker processes
  
  // Per-mailbox delays (natural spacing)
  SAME_MAILBOX_DELAY_MIN: 2,            // 2 min between sends from same mailbox
  SAME_MAILBOX_DELAY_MAX: 10,           // 10 min max
  
  // Global safety limits
  GLOBAL_SENDS_PER_MINUTE: 100,         // System-wide cap
  GLOBAL_SENDS_PER_HOUR: 5000,          // Hourly cap
  
  // Per-user limits (in addition to plan)
  USER_SENDS_PER_MINUTE: 5,             // Max 5/min per user
  USER_SENDS_PER_HOUR: 200,             // Max 200/hr per user
  
  // Time window
  SEND_WINDOW_START_HOUR: 6,            // Start sending at 6am
  SEND_WINDOW_END_HOUR: 22,             // Stop at 10pm
  SEND_WINDOW_TIMEZONE: 'UTC',          // Or user's timezone
};
```

### Capacity Planning

| Scale | Mailboxes | Emails/Day | Workers | Sends/Min |
|-------|-----------|------------|---------|-----------|
| Small | 100 | 1,000 | 1 | 1 |
| Medium | 1,000 | 10,000 | 3 | 7 |
| Large | 10,000 | 100,000 | 10 | 70 |
| Enterprise | 100,000 | 1,000,000 | 50 | 700 |

### Job Schema (New Table)

```sql
CREATE TABLE warmup_jobs (
  id SERIAL PRIMARY KEY,
  mailbox_id INT NOT NULL,
  user_id UUID NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending, processing, done, failed
  picked_at TIMESTAMP,
  completed_at TIMESTAMP,
  worker_id VARCHAR(50),
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jobs_status_scheduled ON warmup_jobs(status, scheduled_for);
CREATE INDEX idx_jobs_mailbox ON warmup_jobs(mailbox_id, status);
```

---

## Part 4: Immediate Fixes (No Architecture Change)

### Fix 1: Status Case Normalization

```typescript
// Change all queries to use uppercase
status: 'SENT'  // not 'sent'

// Or normalize on write
status: status.toUpperCase()
```

**Locations to fix:**
- `lib/warmup-cron.ts:312` → `'SENT'`
- `lib/warmup-cron.ts:470` → `'SENT'`

### Fix 2: Send Multiple Per Mailbox

```typescript
// Current
await this.sendWarmupEmail(mailbox.mailboxId);

// Fixed
const remaining = mailbox.remaining;
for (let i = 0; i < remaining; i++) {
  await this.sendWarmupEmail(mailbox.mailboxId);
  if (i < remaining - 1) {
    await delay(getRandomSendDelay()); // 2-5 min within mailbox
  }
}
```

### Fix 3: Reduce Inter-Mailbox Delay

```typescript
// Current: 3-15 min between mailboxes
SEND_DELAY_MIN: 3
SEND_DELAY_MAX: 15

// Fixed: 30sec-2min between mailboxes (different senders)
INTER_MAILBOX_DELAY_MIN: 0.5
INTER_MAILBOX_DELAY_MAX: 2

// Keep longer delays for same mailbox
SAME_MAILBOX_DELAY_MIN: 2
SAME_MAILBOX_DELAY_MAX: 5
```

### Fix 4: Parallel Batch Processing

```typescript
// Current: sequential
for (const mailbox of shuffled) {
  await this.sendWarmupEmail(mailbox);
}

// Fixed: parallel batches
const batchSize = 5;
for (let i = 0; i < shuffled.length; i += batchSize) {
  const batch = shuffled.slice(i, i + batchSize);
  await Promise.all(batch.map(m => this.sendWarmupEmail(m.mailboxId)));
  await delay(30_000); // 30 sec between batches
}
```

---

## Part 5: Metrics & Monitoring

### Required Metrics

| Metric | Purpose |
|--------|---------|
| `warmup_emails_sent_total` | Total sent counter |
| `warmup_emails_per_mailbox` | Per-mailbox daily count |
| `warmup_quota_fill_rate` | % of quota used per mailbox |
| `warmup_cycle_duration_seconds` | Time per cron cycle |
| `warmup_queue_depth` | Pending jobs (if using queue) |
| `warmup_worker_active` | Active workers |
| `warmup_errors_total` | Failed sends |

### Dashboard Queries

```sql
-- Mailboxes not meeting quota
SELECT email, sent_count, daily_limit, 
       ROUND(sent_count::numeric / daily_limit * 100) as fill_rate
FROM warmup_logs 
JOIN accounts ON warmup_logs.mailbox_id = accounts.id
WHERE date = CURRENT_DATE AND sent_count < daily_limit;

-- Hourly throughput
SELECT DATE_TRUNC('hour', timestamp) as hour, COUNT(*) 
FROM logs WHERE status = 'SENT' 
GROUP BY 1 ORDER BY 1;
```

---

## Summary

| Problem | Current | Target |
|---------|---------|--------|
| Status mismatch | `'sent'` vs `'SENT'` | Normalize to `'SENT'` |
| Processing | Sequential | Parallel batches |
| Emails per cycle | 1 per mailbox | Fill quota |
| Inter-mailbox delay | 3-15 min | 30s-2 min |
| Same-mailbox delay | None | 2-5 min |
| Throughput | ~40/day | 480+/day (immediate) |
| Scale target | 48 mailboxes | 100K+ mailboxes |

---

## Files to Edit

| File | Changes |
|------|---------|
| `lib/warmup-cron.ts` | Fix status case, add batching, quota loop |
| `lib/warmup-config.ts` | Add scale configs, separate delay types |
| `lib/warmup-utils.ts` | Add batch helpers |
| `prisma/schema.prisma` | Add jobs table (for queue model) |
