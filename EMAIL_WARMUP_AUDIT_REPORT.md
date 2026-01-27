# Email Warmup System Audit Report

**Date:** January 27, 2026  
**Status:** 48 mailboxes sending only 30-40 emails/day (8% of expected 480)  
**Scale Target:** Support 1000+ users with 100 mailboxes each (100,000+ total mailboxes)

---

## Executive Summary

The email warmup system has **4 critical bottlenecks** causing a 12x throughput gap. Current architecture cannot scale beyond single-user deployment.

| Issue | Impact | Priority |
|-------|--------|----------|
| Status case mismatch | Quota tracking broken | 🔴 CRITICAL |
| Sequential processing | 7.2 hours per loop | 🔴 CRITICAL |
| One email per cycle | 3 emails vs 10 quota | 🔴 CRITICAL |
| Excessive delays | 432 min wasted per loop | 🔴 CRITICAL |

---

## Part 1: Current Bottleneck Analysis

### 🔴 Issue #1: Status Case Mismatch (CRITICAL)

**Location:** `lib/warmup-cron.ts`

| Operation | Value | Line |
|-----------|-------|------|
| Writing logs | `'SENT'` | 556 |
| Counting sent today | `'sent'` | 312 |
| Uniqueness check | `'sent'` | 470 |
| Plan limit checks | `['SENT', 'REPLIED']` | 246, 256, 397, 413 |

**Effect:** Per-mailbox quota tracking returns 0 (case mismatch), system thinks every mailbox has full quota remaining but plan limits still enforce.

**Fix:** Normalize all queries to use `'SENT'` uppercase consistently.

### 🔴 Issue #2: Sequential Processing Architecture

```typescript
// Current flow (per cycle):
for (const mailbox of shuffled) {
    await this.sendWarmupEmail(mailbox.mailboxId);  // ONE email
    await delay(3-15 minutes);                      // BLOCKING delay
}
```

**Math Breakdown:**
- 48 mailboxes × 9min average delay = 432 minutes per loop
- 1440 minutes/day ÷ 432 minutes/loop = 3.3 loops/day  
- 48 emails × 3 loops = 144 theoretical max (vs 480 needed)
- **Actual with overhead: 30-40 emails**

### 🔴 Issue #3: One Email Per Mailbox Per Cycle

**Problem:** Sends exactly 1 email per mailbox then moves to next
- Mailbox daily quota: 10 emails
- Emails sent per cycle: 1  
- Cycles per day: ~3
- **Result: ~3 emails per mailbox (not 10)**

**Location:** Lines 164-185 in runCycle method - no loop to fill quota

### 🔴 Issue #4: Excessive Inter-Mailbox Delays

**Current Config:**
```typescript
SEND_DELAY_MIN: 3,  // 3 minutes  
SEND_DELAY_MAX: 15, // 15 minutes
```

**Problem:** Treats different senders as if they need long delays between each other
- **Waste:** 48 × 9min = 432 min of unnecessary delays per loop
- **Should be:** 30sec-2min between different mailboxes, 2-10min within same mailbox

---

## Part 2: Scale Reality Check

### Current vs Target Capacity

| Metric | Current | Target | Gap |
|--------|---------|---------|-----|
| Mailboxes | 48 | 100,000 | 2,083x |
| Daily emails | 40 | 1,000,000 | 25,000x |  
| Emails/minute | 0.03 | 694 | 23,133x |
| Loop time | 7.2 hours | < 1 hour | 7x |

### Why Current Architecture Fails at Scale

1. **Sequential Processing:** Zero parallelism
2. **Linear Scaling:** Delays increase linearly with mailbox count
3. **Memory Loading:** All mailboxes loaded simultaneously  
4. **Single Thread:** One blocking operation chain
5. **No Queue System:** Cannot distribute workload

**100,000 mailboxes would take:** 100,000 × 9 min = 900,000 minutes = 625 days per loop

---

## Part 3: Scale-Ready Architecture Design

### Core Design: Distributed Scheduler + Worker Model

```
┌─────────────────────────────────────────────────────────────┐
│                    SCHEDULER SERVICE                         │
│ • Runs every 1-2 minutes                                    │
│ • Queries mailboxes needing emails                          │  
│ • Creates timestamped jobs in queue                         │
│ • Enforces global/user rate limits                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     JOB QUEUE (Database)                    │
│ • Stores pending email jobs                                 │
│ • Natural scheduling (6am-10pm window)                      │
│ • Prevents duplicate processing                             │
│ • Tracks: pending → processing → done/failed               │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   WORKER 1      │ │   WORKER 2      │ │   WORKER N      │
│ • Pick jobs     │ │ • Pick jobs     │ │ • Pick jobs     │
│ • Send emails   │ │ • Send emails   │ │ • Send emails   │  
│ • Update logs   │ │ • Update logs   │ │ • Update logs   │
│ • Natural delay │ │ • Natural delay │ │ • Natural delay │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Key Design Principles

1. **Decouple Scheduling from Sending**
   - Scheduler creates jobs fast (1000+ jobs/minute)
   - Workers process with natural delays
   - No blocking between different mailboxes

2. **Intelligent Job Distribution**
   - Spread mailbox daily quota across time window (6am-10pm)
   - Natural spacing: 2-10 minutes between emails from same mailbox
   - Parallel processing: Different mailboxes send simultaneously

3. **Horizontal Scaling**
   - Add workers as needed (1-50+ processes)
   - Each worker handles 5-20 jobs concurrently
   - Auto-scale based on queue depth

### New Database Schema

```sql
-- Email job queue
CREATE TABLE warmup_jobs (
    id SERIAL PRIMARY KEY,
    mailbox_id INT NOT NULL,
    user_id UUID NOT NULL,
    scheduled_for TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    picked_at TIMESTAMP,
    completed_at TIMESTAMP,
    worker_id VARCHAR(50),
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_jobs_status_scheduled ON warmup_jobs(status, scheduled_for);
CREATE INDEX idx_jobs_mailbox ON warmup_jobs(mailbox_id);
CREATE INDEX idx_jobs_user ON warmup_jobs(user_id, status);
```

### Scale Configuration

```typescript
export const ScaleConfig = {
  // Scheduler
  SCHEDULER_INTERVAL_MS: 60_000,          // Check every 1 minute
  JOBS_PER_SCHEDULER_RUN: 1000,           // Create up to 1000 jobs per run
  JOB_CLEANUP_DAYS: 7,                    // Clean completed jobs after 7 days
  
  // Workers  
  WORKER_CONCURRENCY: 10,                 // 10 jobs per worker simultaneously
  WORKER_COUNT: 5,                        // Default worker processes
  WORKER_JOB_BATCH_SIZE: 50,              // Pick 50 jobs at once
  
  // Natural delays (same mailbox only)
  SAME_MAILBOX_DELAY_MIN: 2,              // 2 min between emails from same mailbox
  SAME_MAILBOX_DELAY_MAX: 10,             // 10 min max spacing
  
  // Time window
  SEND_WINDOW_START_HOUR: 6,              // Start sending at 6am
  SEND_WINDOW_END_HOUR: 22,               // Stop at 10pm  
  
  // Global safety limits  
  GLOBAL_SENDS_PER_MINUTE: 100,           // System-wide throughput cap
  GLOBAL_SENDS_PER_HOUR: 5000,            // Hourly system cap
  USER_SENDS_PER_MINUTE: 5,               // Per-user rate limit
  USER_SENDS_PER_HOUR: 300,               // Per-user hourly limit
  
  // Auto-scaling
  SCALE_UP_QUEUE_THRESHOLD: 1000,         // Start more workers if queue > 1000
  SCALE_DOWN_IDLE_MINUTES: 10,            // Stop workers after 10 min idle
};
```

---

## Part 4: Performance Projections

### Throughput Capacity by Scale

| Configuration | Mailboxes | Workers | Concurrency | Emails/Day | Users |
|--------------|-----------|---------|-------------|------------|-------|
| **Small** | 100 | 1 | 5 | 1,000 | 1 |
| **Medium** | 1,000 | 2 | 10 | 10,000 | 10 |
| **Large** | 10,000 | 5 | 20 | 100,000 | 100 |
| **Enterprise** | 100,000 | 20 | 50 | 1,000,000 | 1,000 |

### Resource Requirements (1M emails/day)

- **Database:** 1M jobs/day, ~50K active jobs at peak
- **Memory:** ~2GB per worker process
- **CPU:** ~20% per worker under normal load  
- **Network:** ~1MB/sec sustained email traffic
- **Storage:** ~500MB/day for logs and job history

---

## Part 5: Implementation Phases

### Phase 1: Immediate Fixes (2-4 hours)
**Goal:** Fix current system to achieve 400-500 emails/day for 48 mailboxes

1. **Status Case Normalization** 
   ```typescript
   // Fix lines 312, 470 in warmup-cron.ts
   status: 'SENT'  // not 'sent'
   ```

2. **Fill Quota Per Mailbox**
   ```typescript
   // Current: sends 1 email per mailbox
   await this.sendWarmupEmail(mailbox.mailboxId);
   
   // Fixed: loop until quota filled
   const remaining = mailbox.remaining;
   for (let i = 0; i < remaining && i < 5; i++) {  // max 5 per cycle
     await this.sendWarmupEmail(mailbox.mailboxId);
     if (i < remaining - 1) {
       await delay(2-5 min); // delay within same mailbox
     }
   }
   ```

3. **Reduce Inter-Mailbox Delays**
   ```typescript
   // Change config from 3-15 min to 30sec-2min
   INTER_MAILBOX_DELAY_MIN: 0.5,
   INTER_MAILBOX_DELAY_MAX: 2,
   ```

4. **Parallel Batching** 
   ```typescript
   // Process 3-5 mailboxes in parallel
   const batchSize = 3;
   for (let i = 0; i < shuffled.length; i += batchSize) {
     const batch = shuffled.slice(i, i + batchSize);
     await Promise.all(batch.map(m => this.processMailbox(m)));
     await delay(30_000); // 30 sec between batches
   }
   ```

**Expected Result:** 400-500 emails/day for 48 mailboxes

### Phase 2: Queue Architecture (1-2 weeks)
**Goal:** Scale to 100 mailboxes per user

1. **Database Schema**
   - Add warmup_jobs table
   - Create performance indexes

2. **Scheduler Service**
   - Query mailboxes with remaining quota
   - Create timestamped jobs (spread across 6am-10pm)
   - Enforce rate limits

3. **Worker Processes** 
   - Pick jobs from queue
   - Send emails with natural delays
   - Update job status and logs

4. **Migration**
   - Replace current cron with scheduler + workers
   - Preserve existing configuration
   - Add monitoring and metrics

### Phase 3: Multi-Tenant Scale (2-3 weeks)
**Goal:** Support 1,000+ users with 100 mailboxes each

1. **Advanced Rate Limiting**
   - Per-user quotas and throttling
   - Dynamic global limits
   - Queue priority by user plan

2. **Auto-Scaling**
   - Spawn workers based on queue depth
   - Terminate idle workers
   - Load balancing across processes

3. **Monitoring & Analytics**
   - Real-time quota fill rates
   - Per-mailbox performance metrics
   - User dashboard with warmup progress

4. **Database Optimization**
   - Partitioning by date/user
   - Read replicas for analytics
   - Automated job cleanup

---

## Part 6: Monitoring & Metrics

### Critical Metrics

| Metric | Purpose | Alert Threshold |
|--------|---------|-----------------|
| `warmup_emails_sent_total` | Overall throughput | < 80% of expected |
| `warmup_quota_fill_rate_per_mailbox` | Per-mailbox success | < 90% daily quota |
| `warmup_queue_depth` | System load | > 10,000 pending jobs |
| `warmup_worker_utilization` | Resource usage | > 80% CPU sustained |
| `warmup_errors_per_hour` | Failure rate | > 5% error rate |
| `warmup_cycle_duration_seconds` | Processing speed | > 300 sec per cycle |

### Dashboard Queries

```sql
-- Mailboxes not meeting quota today
SELECT 
    a.email,
    w.sent_count,
    w.daily_limit,
    ROUND(w.sent_count::numeric / w.daily_limit * 100) as fill_rate_percent
FROM warmup_logs w 
JOIN accounts a ON w.mailbox_id = a.id
WHERE w.date = CURRENT_DATE 
    AND w.sent_count < w.daily_limit
ORDER BY fill_rate_percent ASC;

-- Hourly throughput trend
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as emails_sent,
    COUNT(DISTINCT sender_id) as active_mailboxes
FROM logs 
WHERE status = 'SENT' 
    AND timestamp >= CURRENT_DATE - INTERVAL '24 hours'
GROUP BY hour 
ORDER BY hour;

-- Queue health
SELECT 
    status,
    COUNT(*) as job_count,
    AVG(EXTRACT(epoch FROM (NOW() - created_at))/60) as avg_age_minutes
FROM warmup_jobs 
WHERE created_at >= CURRENT_DATE
GROUP BY status;
```

---

## Summary

### Root Cause Analysis
1. **Status case mismatch** breaks quota tracking (writes `'SENT'`, reads `'sent'`)
2. **Sequential architecture** creates 7+ hour processing loops
3. **Single email per cycle** achieves only 30% of daily quotas
4. **Excessive delays** waste 90% of available time

### Scale-Ready Solution
- **Queue-based architecture** supports 100,000+ mailboxes
- **Distributed workers** provide horizontal scaling
- **Natural scheduling** spreads emails across business hours
- **Configurable limits** prevent provider throttling
- **Comprehensive monitoring** ensures quota fulfillment

### Implementation Priority
1. **Phase 1 (Immediate):** Fix current bottlenecks → 10x improvement
2. **Phase 2 (2 weeks):** Queue architecture → 100x scale capability  
3. **Phase 3 (1 month):** Multi-tenant optimization → 1000x scale ready

**Next Decision:** Implement immediate fixes first, or jump directly to queue architecture?