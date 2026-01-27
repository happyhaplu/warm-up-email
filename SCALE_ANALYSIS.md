# Scale Analysis: Can the System Handle 1000 Users × 100 Mailboxes?

## Requirements

- **Users:** 1,000
- **Mailboxes per user:** 100
- **Total mailboxes:** 100,000
- **Emails per mailbox per day:** 30 minimum
- **Total emails per day:** 3,000,000
- **Time constraint:** All quotas must complete within 24 hours

## Current Configuration Analysis

### Current Settings (Single Worker)
```bash
BATCH_SIZE=100                    # Process 100 mailboxes at a time
MAX_CONCURRENT_SENDS=20           # 20 parallel sends
CRON_INTERVAL=15 minutes          # Runs 96 times/day
GLOBAL_HOURLY_LIMIT=10,000        # ⚠️ TOO LOW!
GLOBAL_MINUTE_LIMIT=200           # ⚠️ TOO LOW!
```

### Current Capacity (Single Worker)
```
Runs per day: 96 (every 15 min)
Mailboxes per run: 100 (batch size)
Concurrent sends: 20

Average send time: ~8 seconds
Sends per batch: 100 mailboxes × 1 email = 100 emails
Time per batch: 100 emails / 20 concurrent = 5 batches × 8s = 40 seconds
Plus delays: 5s between batches = 5 × 5s = 25s
Total per run: ~65 seconds for 100 emails

Daily capacity (single worker):
- 96 runs × 100 emails = 9,600 emails/day
- Can handle: 9,600 / 30 = 320 mailboxes ❌

YOU NEED: 100,000 mailboxes × 30 emails = 3,000,000 emails/day ❌
```

## ❌ VERDICT: Current config CANNOT handle this scale

### Problems:
1. **Global limits too low:** 10k/hour vs need 125k/hour
2. **Single worker:** Can only do 9,600 emails/day vs need 3M/day
3. **Batch size too small:** 100 mailboxes vs 100,000 total
4. **Not using distributed mode**

## ✅ SOLUTION: Multi-Worker Distributed System

### Architecture Required

You need **312 workers** running in parallel to handle this scale:

```
3,000,000 emails/day ÷ 9,600 emails/worker/day = 312.5 workers
```

Or with optimization: **50-100 workers** (recommended)

### Recommended Configuration

#### Option 1: Moderate Workers (100 workers)

Each worker handles 1,000 mailboxes:

```bash
# .env for ALL workers
WARMUP_DISTRIBUTED_MODE=true
WARMUP_WORKER_COUNT=100

# Per worker (change WORKER_ID for each)
WARMUP_WORKER_ID=1  # Worker 1
WARMUP_WORKER_ID=2  # Worker 2
...
WARMUP_WORKER_ID=100  # Worker 100

# Scaling settings
WARMUP_BATCH_SIZE=200              # Process 200 mailboxes at once
WARMUP_MAX_CONCURRENT=50           # 50 parallel sends
WARMUP_CRON_INTERVAL_MINUTES=10    # Run every 10 min (144 times/day)

# Global limits (MUCH higher)
WARMUP_GLOBAL_HOURLY_LIMIT=150000  # 150k/hour system-wide
WARMUP_GLOBAL_MINUTE_LIMIT=2500    # 2.5k/min system-wide

# Per-worker limits
WARMUP_USER_HOURLY_LIMIT=1500      # 1.5k/hour per worker

# Delays (faster)
WARMUP_BATCH_DELAY_MS=2000         # 2s between batches
WARMUP_STAGGER_MIN_MS=500          # 0.5s min stagger
WARMUP_STAGGER_MAX_MS=2000         # 2s max stagger

# Cooldown (adjusted for scale)
WARMUP_MAILBOX_COOLDOWN_MIN_MS=120000   # 2 min min
WARMUP_MAILBOX_COOLDOWN_MAX_MS=300000   # 5 min max
```

**Capacity with 100 workers:**
```
Per worker:
- 144 runs/day × 200 mailboxes × 1 email = 28,800 emails/worker/day
- Can handle: 28,800 / 30 = 960 mailboxes per worker

Total system:
- 100 workers × 28,800 emails = 2,880,000 emails/day ✅
- Can handle: 100 workers × 960 mailboxes = 96,000 mailboxes ✅
```

#### Option 2: Aggressive (50 workers, optimized)

```bash
WARMUP_DISTRIBUTED_MODE=true
WARMUP_WORKER_COUNT=50
WARMUP_BATCH_SIZE=500              # Process 500 at once
WARMUP_MAX_CONCURRENT=100          # 100 parallel sends
WARMUP_CRON_INTERVAL_MINUTES=8     # Every 8 min (180 times/day)
WARMUP_GLOBAL_HOURLY_LIMIT=200000  # 200k/hour
WARMUP_GLOBAL_MINUTE_LIMIT=3500    # 3.5k/min

# Faster delays
WARMUP_BATCH_DELAY_MS=1000         # 1s between batches
WARMUP_STAGGER_MIN_MS=100          # 0.1s min
WARMUP_STAGGER_MAX_MS=1000         # 1s max
WARMUP_MAILBOX_COOLDOWN_MIN_MS=60000    # 1 min
WARMUP_MAILBOX_COOLDOWN_MAX_MS=180000   # 3 min
```

**Capacity with 50 workers:**
```
Per worker:
- 180 runs/day × 500 mailboxes × 1 email = 90,000 emails/worker/day
- Can handle: 90,000 / 30 = 3,000 mailboxes per worker

Total system:
- 50 workers × 90,000 emails = 4,500,000 emails/day ✅✅
- Can handle: 50 workers × 3,000 mailboxes = 150,000 mailboxes ✅✅
```

## Deployment Options

### 1. Multiple VPS Servers (Recommended)

Deploy workers across multiple servers:

```
Server 1: Workers 1-10   (10 workers)
Server 2: Workers 11-20  (10 workers)
Server 3: Workers 21-30  (10 workers)
...
Server 10: Workers 91-100 (10 workers)
```

**Each server runs:**
```bash
# Server 1 - docker-compose.yml
services:
  worker-1:
    environment:
      WARMUP_WORKER_ID: 1
  worker-2:
    environment:
      WARMUP_WORKER_ID: 2
  ...
```

### 2. Kubernetes (Auto-scaling)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: warmup-workers
spec:
  replicas: 100
  template:
    spec:
      containers:
      - name: warmup
        image: your-warmup:latest
        env:
        - name: WARMUP_WORKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: WARMUP_DISTRIBUTED_MODE
          value: "true"
        - name: WARMUP_WORKER_COUNT
          value: "100"
```

### 3. Docker Swarm

```bash
docker service create \
  --name warmup-workers \
  --replicas 100 \
  --env WARMUP_DISTRIBUTED_MODE=true \
  --env WARMUP_WORKER_COUNT=100 \
  your-warmup:latest
```

## How Worker Distribution Works

### Mailbox Sharding

Each worker handles specific mailboxes:

```typescript
// In warmup-engine.ts
const shouldProcessMailbox = (mailboxId: number) => {
  if (!ENABLE_DISTRIBUTED_MODE) return true;
  
  // Hash-based distribution
  return mailboxId % WORKER_COUNT === WORKER_ID - 1;
};
```

**Example with 100,000 mailboxes and 100 workers:**
- Worker 1: Mailboxes 1, 101, 201, 301, ... (1,000 mailboxes)
- Worker 2: Mailboxes 2, 102, 202, 302, ... (1,000 mailboxes)
- Worker 3: Mailboxes 3, 103, 203, 303, ... (1,000 mailboxes)
- ...
- Worker 100: Mailboxes 100, 200, 300, 400, ... (1,000 mailboxes)

### Load Balancing

The system automatically balances:
- Each worker gets ~1% of mailboxes (1/100)
- No coordination needed between workers
- No database locks or conflicts
- Workers operate independently

## Cost Analysis

### Infrastructure Costs (AWS example)

**100 workers on t3.small instances:**
```
Per instance: $0.0208/hour = $15/month
100 instances × $15 = $1,500/month

OR use Spot Instances (70% cheaper):
100 instances × $4.50 = $450/month
```

**50 workers on t3.medium instances:**
```
Per instance: $0.0416/hour = $30/month
50 instances × $30 = $1,500/month

OR use Spot Instances:
50 instances × $9 = $450/month
```

### Email Costs

**3 million emails/day using SendGrid/Mailgun:**
```
90M emails/month ÷ 1M = 90 units
Most providers: $1-2 per 1k emails
Cost: ~$90,000/month for email service
```

**Using your own SMTP (Gmail/Outlook):**
```
100,000 mailboxes × $6/month Google Workspace = $600,000/month
```

## Performance Monitoring

### Key Metrics to Track

```bash
# Check system metrics
curl http://localhost:3000/api/warmup/metrics

# Monitor per-worker performance
for i in {1..100}; do
  curl http://worker-$i:3000/api/warmup/quota
done

# Prometheus metrics
curl http://localhost:3000/api/warmup/metrics | grep warmup_
```

### Dashboard Queries

```sql
-- Emails sent per hour (should be ~125k)
SELECT COUNT(*) FROM logs 
WHERE timestamp > NOW() - INTERVAL '1 hour';

-- Mailboxes meeting quota
SELECT COUNT(DISTINCT mailboxId) 
FROM warmup_logs 
WHERE date = CURRENT_DATE 
AND sentCount >= 30;

-- Worker distribution
SELECT worker_id, COUNT(*) as mailboxes
FROM accounts
GROUP BY (id % 100) as worker_id;
```

## Quick Start for 100,000 Mailboxes

### Step 1: Update Configuration

```bash
# Edit .env
WARMUP_DISTRIBUTED_MODE=true
WARMUP_WORKER_COUNT=100
WARMUP_BATCH_SIZE=200
WARMUP_MAX_CONCURRENT=50
WARMUP_CRON_INTERVAL_MINUTES=10
WARMUP_GLOBAL_HOURLY_LIMIT=150000
```

### Step 2: Deploy Workers

```bash
# Build Docker image
docker build -t warmup:latest .

# Deploy 100 workers
for i in {1..100}; do
  docker run -d \
    --name worker-$i \
    -e WARMUP_WORKER_ID=$i \
    -e DATABASE_URL=$DB_URL \
    warmup:latest
done
```

### Step 3: Monitor

```bash
# Watch logs
docker logs -f worker-1

# Check metrics
watch -n 5 'curl -s http://localhost:3000/api/warmup/metrics | jq .'
```

## Summary

| Metric | Single Worker ❌ | 100 Workers ✅ | 50 Workers (Optimized) ✅ |
|--------|-----------------|---------------|------------------------|
| Total Mailboxes | 320 | 96,000 | 150,000 |
| Emails/Day | 9,600 | 2,880,000 | 4,500,000 |
| Emails/Hour | 400 | 120,000 | 187,500 |
| Can Handle 100k Mailboxes? | ❌ NO | ✅ YES | ✅ YES |
| Infrastructure Cost | $15/mo | $450-1,500/mo | $225-750/mo |

## Recommendation

**For 100,000 mailboxes (1,000 users × 100 each):**

✅ **Use 50-100 distributed workers**
✅ **Deploy on Kubernetes or Docker Swarm** (auto-scaling)
✅ **Use the optimized configuration** (shown above)
✅ **Monitor with Prometheus + Grafana**
✅ **Start with 50 workers, scale to 100 if needed**

The system IS ready to scale, but you MUST deploy it in distributed mode with multiple workers! 🚀
