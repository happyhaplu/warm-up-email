# Scalable Warmup System - Production Deployment Guide

## 🎯 Overview

This document covers the production deployment of the scalable warmup system, designed to handle **thousands of users × 100 mailboxes each**, ensuring **minimum 30 sends/day per mailbox**.

## 📊 System Architecture

### Core Components

1. **Warmup Engine** (`lib/warmup-engine.ts`)
   - Per-mailbox quota enforcement
   - Parallel batch processing
   - Intelligent priority queue
   - Rate limiting & safety caps

2. **Warmup Cron Service** (`lib/warmup-cron-v3.ts`)
   - Scheduled execution (every 15 minutes default)
   - Distributed mode support
   - Automatic failure recovery
   - Daily cleanup tasks

3. **Metrics System** (`lib/warmup-metrics.ts`)
   - Real-time quota tracking
   - Performance monitoring
   - Prometheus export
   - Health status

4. **Configuration** (`lib/warmup-config.ts`)
   - Environment-based settings
   - Production defaults
   - Horizontal scaling parameters

---

## 🚀 Quick Start

### Single Instance Deployment

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env
# Edit .env with your configuration

# 3. Apply database migration (normalize status fields)
./scripts/normalize-status.sh

# 4. Start the warmup service
npm run dev
# or for production:
npm run build && npm start
```

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"
DIRECT_URL="postgresql://user:pass@host:5432/db"

# Warmup Engine Configuration
WARMUP_BATCH_SIZE=100                    # Process 100 mailboxes per batch
WARMUP_MAX_CONCURRENT=20                 # 20 parallel sends
WARMUP_BATCH_DELAY_MS=5000              # 5s between batches
WARMUP_STAGGER_MIN_MS=1000              # 1s min stagger
WARMUP_STAGGER_MAX_MS=5000              # 5s max stagger

# Global Limits
WARMUP_GLOBAL_HOURLY_LIMIT=10000        # 10k emails/hour system-wide
WARMUP_GLOBAL_MINUTE_LIMIT=200          # 200 emails/minute system-wide
WARMUP_USER_HOURLY_LIMIT=500            # 500 emails/hour per user

# Scheduling
WARMUP_CRON_INTERVAL_MINUTES=15         # Run every 15 minutes
WARMUP_MIN_DAILY_QUOTA=30               # Minimum 30/day per mailbox

# Monitoring
WARMUP_ENABLE_DETAILED_METRICS=true
WARMUP_METRICS_RETENTION_DAYS=30
```

---

## 📈 Horizontal Scaling

### Multi-Worker Deployment

For **thousands of users** with **100+ mailboxes each**, deploy multiple workers:

#### Architecture

```
                    Load Balancer (Round Robin)
                           |
        +------------------+------------------+
        |                  |                  |
    Worker 1           Worker 2           Worker 3
   (ID: 1/3)          (ID: 2/3)          (ID: 3/3)
        |                  |                  |
        +------------------+------------------+
                           |
                   PostgreSQL Database
```

#### Worker Configuration

**Worker 1:**
```bash
WARMUP_DISTRIBUTED_MODE=true
WARMUP_WORKER_ID=1
WARMUP_WORKER_COUNT=3
```

**Worker 2:**
```bash
WARMUP_DISTRIBUTED_MODE=true
WARMUP_WORKER_ID=2
WARMUP_WORKER_COUNT=3
```

**Worker 3:**
```bash
WARMUP_DISTRIBUTED_MODE=true
WARMUP_WORKER_ID=3
WARMUP_WORKER_COUNT=3
```

### Worker Sharding

Each worker processes a subset of mailboxes based on hash:

```typescript
// mailboxId % WORKER_COUNT === WORKER_ID - 1
// Worker 1 handles: mailbox_id % 3 === 0
// Worker 2 handles: mailbox_id % 3 === 1
// Worker 3 handles: mailbox_id % 3 === 2
```

---

## 🐳 Docker Deployment

### Single Container

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose (Multi-Worker)

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: warmup
      POSTGRES_USER: warmup
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  warmup-worker-1:
    build: .
    environment:
      DATABASE_URL: postgresql://warmup:${DB_PASSWORD}@db:5432/warmup
      WARMUP_DISTRIBUTED_MODE: "true"
      WARMUP_WORKER_ID: "1"
      WARMUP_WORKER_COUNT: "3"
      WARMUP_BATCH_SIZE: "100"
      WARMUP_MAX_CONCURRENT: "20"
    depends_on:
      - db
    restart: unless-stopped
  
  warmup-worker-2:
    build: .
    environment:
      DATABASE_URL: postgresql://warmup:${DB_PASSWORD}@db:5432/warmup
      WARMUP_DISTRIBUTED_MODE: "true"
      WARMUP_WORKER_ID: "2"
      WARMUP_WORKER_COUNT: "3"
      WARMUP_BATCH_SIZE: "100"
      WARMUP_MAX_CONCURRENT: "20"
    depends_on:
      - db
    restart: unless-stopped
  
  warmup-worker-3:
    build: .
    environment:
      DATABASE_URL: postgresql://warmup:${DB_PASSWORD}@db:5432/warmup
      WARMUP_DISTRIBUTED_MODE: "true"
      WARMUP_WORKER_ID: "3"
      WARMUP_WORKER_COUNT: "3"
      WARMUP_BATCH_SIZE: "100"
      WARMUP_MAX_CONCURRENT: "20"
    depends_on:
      - db
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - warmup-worker-1
      - warmup-worker-2
      - warmup-worker-3

volumes:
  postgres_data:
```

---

## 📊 Monitoring & Observability

### Prometheus Integration

The system exports metrics in Prometheus format:

```bash
# Scrape endpoint
curl http://localhost:3000/api/warmup/metrics?format=prometheus
```

**Sample Prometheus config:**

```yaml
scrape_configs:
  - job_name: 'warmup-system'
    static_configs:
      - targets: ['worker-1:3000', 'worker-2:3000', 'worker-3:3000']
    metrics_path: '/api/warmup/metrics'
    params:
      format: ['prometheus']
    scrape_interval: 30s
```

### Key Metrics

| Metric | Description | Type |
|--------|-------------|------|
| `warmup_total_mailboxes` | Total warmup-enabled mailboxes | Gauge |
| `warmup_active_mailboxes` | Mailboxes that sent today | Gauge |
| `warmup_emails_sent_today` | Total emails sent today | Counter |
| `warmup_emails_failed_today` | Total failed sends today | Counter |
| `warmup_throughput_per_hour` | Current send rate (emails/hour) | Gauge |
| `warmup_quota_completion_rate` | % of mailboxes at quota | Gauge |
| `warmup_system_health` | 0=critical, 1=degraded, 2=healthy | Gauge |
| `warmup_mailbox_quota_fill` | Per-mailbox quota fill rate | Gauge |

### Grafana Dashboard

Import the included dashboard:

```bash
# See grafana/warmup-dashboard.json
```

**Key Panels:**
- System health overview
- Hourly send rate
- Quota completion rate
- Top performing mailboxes
- Failed send rate
- Worker distribution

---

## 🔧 Performance Tuning

### For 1,000 Users × 100 Mailboxes (100,000 total)

**Recommended Configuration:**

```bash
# Use 10 workers
WARMUP_WORKER_COUNT=10
WARMUP_BATCH_SIZE=200              # Larger batches
WARMUP_MAX_CONCURRENT=50           # More parallelism
WARMUP_CRON_INTERVAL_MINUTES=10    # More frequent runs
WARMUP_GLOBAL_HOURLY_LIMIT=50000   # Higher limits
```

**Expected Performance:**
- **Throughput:** 50,000 emails/hour
- **Daily capacity:** 1.2M emails/day
- **Per mailbox:** 30+ emails/day easily met
- **Batch duration:** 5-10 minutes per cycle

### Database Optimization

```sql
-- Add indexes for performance
CREATE INDEX idx_logs_sender_timestamp ON logs(sender_id, timestamp);
CREATE INDEX idx_logs_status_timestamp ON logs(status, timestamp);
CREATE INDEX idx_warmup_logs_date ON warmup_logs(date);
CREATE INDEX idx_warmup_logs_mailbox_date ON warmup_logs(mailbox_id, date);
CREATE INDEX idx_accounts_warmup_enabled ON accounts(warmup_enabled) WHERE warmup_enabled = true;
```

### Connection Pooling

```bash
# For high-scale deployments
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20"
```

---

## 🚨 Monitoring & Alerts

### Health Checks

```bash
# Check service status
curl http://localhost:3000/api/warmup/control

# Check quota status
curl http://localhost:3000/api/warmup/quota

# Check system metrics
curl http://localhost:3000/api/warmup/metrics
```

### Alert Rules (Prometheus)

```yaml
groups:
  - name: warmup_alerts
    rules:
      - alert: WarmupSystemUnhealthy
        expr: warmup_system_health < 2
        for: 15m
        annotations:
          summary: "Warmup system degraded or critical"
      
      - alert: QuotaCompletionLow
        expr: warmup_quota_completion_rate < 50
        for: 2h
        annotations:
          summary: "Less than 50% of mailboxes reaching quota"
      
      - alert: HighFailureRate
        expr: rate(warmup_emails_failed_today[1h]) / rate(warmup_emails_sent_today[1h]) > 0.1
        for: 30m
        annotations:
          summary: "Email failure rate above 10%"
```

---

## 🔐 Security Best Practices

1. **API Authentication**
   - All endpoints require JWT auth
   - Admin-only control endpoints
   - Per-user data isolation

2. **Rate Limiting**
   - Global system caps
   - Per-user limits
   - Automatic backoff on limits

3. **Database Security**
   - Use SSL connections
   - Rotate credentials regularly
   - Audit logs for admin actions

4. **SMTP Credentials**
   - Store encrypted in database
   - Never log passwords
   - Use app-specific passwords

---

## 📚 API Documentation

### Control Endpoints

```bash
# Start warmup service (Admin only)
POST /api/warmup/control
{ "action": "start" }

# Stop warmup service (Admin only)
POST /api/warmup/control
{ "action": "stop" }

# Trigger manual run (Admin only)
POST /api/warmup/control
{ "action": "trigger" }

# Get service status
GET /api/warmup/control
```

### Metrics Endpoints

```bash
# Get comprehensive metrics
GET /api/warmup/metrics

# Get Prometheus format
GET /api/warmup/metrics?format=prometheus

# Get quota status (all)
GET /api/warmup/quota

# Get mailboxes behind quota
GET /api/warmup/quota?status=behind

# Get specific mailbox performance
GET /api/warmup/mailbox?id=123

# Get all user's mailboxes
GET /api/warmup/mailbox
```

---

## 🐛 Troubleshooting

### Issue: Low Send Rate

**Symptoms:** Only 30-40 emails/day instead of 480+

**Solutions:**
1. Increase `WARMUP_MAX_CONCURRENT` (default: 20)
2. Reduce `WARMUP_CRON_INTERVAL_MINUTES` (run more often)
3. Check for rate limit hits in logs
4. Verify mailbox quotas are set correctly

### Issue: High Failure Rate

**Symptoms:** Many FAILED status in logs

**Solutions:**
1. Check SMTP credentials validity
2. Verify SMTP/IMAP host settings
3. Check for ISP rate limits
4. Review error messages in logs

### Issue: Quota Not Being Met

**Symptoms:** Mailboxes not reaching 30/day minimum

**Solutions:**
1. Check `WARMUP_MIN_DAILY_QUOTA` setting
2. Verify sufficient recipient pool
3. Ensure cron service is running
4. Check for user plan limits

---

## 📊 Capacity Planning

### Small Scale (< 1,000 mailboxes)
- **Workers:** 1
- **Batch Size:** 50
- **Concurrency:** 10
- **Instance:** 2 CPU, 4GB RAM

### Medium Scale (1,000 - 10,000 mailboxes)
- **Workers:** 3-5
- **Batch Size:** 100
- **Concurrency:** 20
- **Instance:** 4 CPU, 8GB RAM per worker

### Large Scale (10,000 - 100,000 mailboxes)
- **Workers:** 10+
- **Batch Size:** 200
- **Concurrency:** 50
- **Instance:** 8 CPU, 16GB RAM per worker
- **Database:** Dedicated instance, read replicas

---

## 📝 Maintenance

### Daily Tasks (Automated)
- Cleanup old logs (90 days)
- Cleanup old metrics (30 days)
- Reset daily statistics

### Weekly Tasks
- Review system health metrics
- Check for mailboxes behind quota
- Verify SMTP credentials validity

### Monthly Tasks
- Database performance optimization
- Review and adjust rate limits
- Capacity planning review

---

## 🎯 Success Criteria

✅ **Per-Mailbox:**
- Minimum 30 sends/day
- < 5% failure rate
- Consistent daily streaks

✅ **System-Wide:**
- > 95% quota completion rate
- Health status: "healthy"
- Throughput meets demand

✅ **Scalability:**
- Linear scaling with workers
- No bottlenecks at 100k mailboxes
- Response time < 100ms for API

---

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs -f warmup-worker-1`
2. Review metrics: `/api/warmup/metrics`
3. Check quota status: `/api/warmup/quota?status=behind`

---

## 🔄 Migration from Old System

```bash
# 1. Normalize status fields
./scripts/normalize-status.sh

# 2. Update warmup initialization
# Replace old warmup-cron with warmup-cron-v3 in your startup:

# Old:
# import { warmupCron } from './lib/warmup-cron';

# New:
import { warmupCron } from './lib/warmup-cron-v3';

# 3. Test in staging first
npm run build
npm start

# 4. Monitor metrics during rollout
curl http://localhost:3000/api/warmup/metrics
```

---

**Built for scale. Ready for production. 🚀**
