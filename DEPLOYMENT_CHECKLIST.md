# 📋 Scalable Warmup System - Deployment Checklist

## Pre-Deployment

### 1. Database Preparation
- [ ] Backup current database
- [ ] Apply status normalization migration
  ```bash
  ./scripts/normalize-status.sh
  ```
- [ ] Verify migration succeeded
  ```sql
  SELECT status, COUNT(*) FROM logs GROUP BY status;
  ```
- [ ] Confirm only uppercase values (SENT, REPLIED, FAILED)

### 2. Configuration
- [ ] Copy `.env.scalable.example` to `.env`
- [ ] Set `DATABASE_URL` and `DIRECT_URL`
- [ ] Configure batch settings:
  - [ ] `WARMUP_BATCH_SIZE` (default: 100)
  - [ ] `WARMUP_MAX_CONCURRENT` (default: 20)
  - [ ] `WARMUP_CRON_INTERVAL_MINUTES` (default: 15)
- [ ] Set global limits:
  - [ ] `WARMUP_GLOBAL_HOURLY_LIMIT` (default: 10000)
  - [ ] `WARMUP_GLOBAL_MINUTE_LIMIT` (default: 200)
  - [ ] `WARMUP_MIN_DAILY_QUOTA` (default: 30)
- [ ] Enable monitoring:
  - [ ] `WARMUP_ENABLE_DETAILED_METRICS=true`

### 3. Code Integration
- [ ] Update app initialization code:
  ```typescript
  import { initializeScalableWarmup } from '@/lib/warmup-init-v3';
  initializeScalableWarmup();
  ```
- [ ] Remove old warmup initialization if present
- [ ] Build application: `npm run build`
- [ ] Verify no TypeScript errors

### 4. Testing (Local)
- [ ] Start application: `npm run dev`
- [ ] Check service started:
  ```bash
  curl http://localhost:3000/api/warmup/control
  ```
- [ ] Verify response shows `"running": true`
- [ ] Check initial metrics:
  ```bash
  curl http://localhost:3000/api/warmup/metrics
  ```
- [ ] Trigger manual run:
  ```bash
  curl -X POST http://localhost:3000/api/warmup/control \
    -H "Content-Type: application/json" \
    -d '{"action": "trigger"}'
  ```
- [ ] Monitor logs for batch processing
- [ ] Verify emails being sent
- [ ] Check quota status:
  ```bash
  curl http://localhost:3000/api/warmup/quota
  ```

---

## Deployment

### 5. Production Deployment

#### Single Instance
- [ ] Deploy to production environment
- [ ] Set environment variables
- [ ] Start application
- [ ] Verify service health
- [ ] Monitor initial batch

#### Multi-Worker (Horizontal Scaling)
- [ ] Configure worker count (e.g., 3 or 10)
- [ ] Set `WARMUP_DISTRIBUTED_MODE=true`
- [ ] Deploy Worker 1:
  - [ ] `WARMUP_WORKER_ID=1`
  - [ ] `WARMUP_WORKER_COUNT=3` (or total count)
- [ ] Deploy Worker 2:
  - [ ] `WARMUP_WORKER_ID=2`
  - [ ] `WARMUP_WORKER_COUNT=3`
- [ ] Deploy Worker 3:
  - [ ] `WARMUP_WORKER_ID=3`
  - [ ] `WARMUP_WORKER_COUNT=3`
- [ ] Verify each worker started
- [ ] Check load distribution

### 6. Monitoring Setup

#### API Endpoints
- [ ] Test metrics endpoint:
  ```bash
  curl https://your-domain.com/api/warmup/metrics
  ```
- [ ] Test quota endpoint:
  ```bash
  curl https://your-domain.com/api/warmup/quota
  ```
- [ ] Verify authentication working

#### Prometheus (Optional)
- [ ] Configure Prometheus scraping
- [ ] Add scrape target:
  ```yaml
  - targets: ['your-domain.com:3000']
    metrics_path: '/api/warmup/metrics'
    params:
      format: ['prometheus']
  ```
- [ ] Verify metrics appearing in Prometheus
- [ ] Set up Grafana dashboard (optional)

#### Alerts
- [ ] Configure alert for system health
- [ ] Configure alert for quota completion < 80%
- [ ] Configure alert for failure rate > 10%
- [ ] Test alerts

---

## Post-Deployment

### 7. Verification (First 24 Hours)

#### Hour 1
- [ ] Check service is running
- [ ] Verify first batch completed successfully
- [ ] Check quota status for all mailboxes
- [ ] Verify no errors in logs

#### Hour 4
- [ ] Check quota completion rate (should be ~15-25%)
- [ ] Verify emails being sent consistently
- [ ] Check failure rate (should be < 5%)
- [ ] Monitor throughput

#### Hour 12
- [ ] Check quota completion rate (should be ~50-75%)
- [ ] Verify mailboxes on track
- [ ] Check for any mailboxes behind quota
- [ ] Review any failures

#### Hour 24
- [ ] Check quota completion rate (should be >95%)
- [ ] Verify all mailboxes met minimum 30/day
- [ ] Calculate total emails sent
- [ ] Compare to expected (mailboxes × 30)

### 8. Performance Validation

#### Expected Results (48 Mailboxes)
- [ ] Total emails sent: **1,440+** (48 × 30)
- [ ] Quota completion: **>95%** of mailboxes at quota
- [ ] Failure rate: **<5%**
- [ ] System health: **Healthy**
- [ ] Throughput: **~60 emails/hour**

#### Metrics to Track
```bash
# Total sent today
curl https://your-domain.com/api/warmup/metrics | jq '.data.system.totalSentToday'
# Should show: 1440+

# Quota completion rate
curl https://your-domain.com/api/warmup/metrics | jq '.data.system.quotaCompletionRate'
# Should show: >95

# Mailboxes behind
curl https://your-domain.com/api/warmup/quota?status=behind | jq '.data.total'
# Should show: 0-2

# System health
curl https://your-domain.com/api/warmup/metrics | jq '.data.system.systemHealth'
# Should show: "healthy"
```

---

## Troubleshooting

### Issue: Service Not Starting
- [ ] Check environment variables set
- [ ] Verify DATABASE_URL is correct
- [ ] Check application logs
- [ ] Ensure database is accessible
- [ ] Verify warmup-init-v3.ts imported correctly

### Issue: Low Send Rate
- [ ] Increase `WARMUP_MAX_CONCURRENT`
- [ ] Reduce `WARMUP_CRON_INTERVAL_MINUTES`
- [ ] Check for rate limit errors in logs
- [ ] Verify SMTP credentials valid
- [ ] Check global limits not too restrictive

### Issue: Mailboxes Not Reaching Quota
- [ ] Check priority queue working
- [ ] Verify enough recipient mailboxes
- [ ] Check for user plan limits
- [ ] Review individual mailbox errors:
  ```bash
  curl https://your-domain.com/api/warmup/mailbox?id=123
  ```

### Issue: High Failure Rate
- [ ] Check SMTP credentials
- [ ] Verify SMTP/IMAP settings
- [ ] Review timeout settings
- [ ] Check for ISP rate limiting
- [ ] Examine error messages in logs

---

## Maintenance

### Daily
- [ ] Check system health status
- [ ] Review quota completion rate
- [ ] Monitor failure rate
- [ ] Check for errors in logs

### Weekly
- [ ] Review performance trends
- [ ] Check for mailboxes consistently behind
- [ ] Verify SMTP credentials valid
- [ ] Review throughput vs. capacity

### Monthly
- [ ] Review configuration settings
- [ ] Optimize batch size/concurrency if needed
- [ ] Check database performance
- [ ] Review capacity planning
- [ ] Update documentation if configuration changed

---

## Rollback Plan (If Needed)

### Emergency Rollback
1. [ ] Stop new warmup service:
   ```bash
   curl -X POST https://your-domain.com/api/warmup/control \
     -H "Content-Type: application/json" \
     -d '{"action": "stop"}'
   ```
2. [ ] Revert code to old warmup initialization
3. [ ] Restart application
4. [ ] Verify old system working
5. [ ] Investigate issue before re-deploying

---

## Success Criteria

### ✅ Deployment Successful If:
- [x] Service running without errors
- [x] Emails being sent consistently
- [x] All mailboxes reaching minimum 30/day
- [x] Quota completion rate >95%
- [x] Failure rate <5%
- [x] System health: "healthy"
- [x] Monitoring endpoints accessible
- [x] Total daily emails = mailboxes × 30+

### ❌ Rollback If:
- [ ] Service crashes repeatedly
- [ ] Failure rate >20%
- [ ] Quota completion <50% after 24 hours
- [ ] Critical errors in logs
- [ ] Database issues

---

## Sign-Off

- [ ] All pre-deployment checks completed
- [ ] Deployment executed successfully
- [ ] 24-hour verification completed
- [ ] Performance targets met
- [ ] Monitoring configured
- [ ] Team trained on new system
- [ ] Documentation reviewed
- [ ] Rollback plan understood

**Deployed By:** _______________  
**Date:** _______________  
**Environment:** Production / Staging  
**Result:** Success / Rollback / Partial  

---

## Quick Commands Reference

```bash
# Check service status
curl http://localhost:3000/api/warmup/control

# View comprehensive metrics
curl http://localhost:3000/api/warmup/metrics | jq

# Check quota status
curl http://localhost:3000/api/warmup/quota | jq

# Mailboxes behind quota
curl http://localhost:3000/api/warmup/quota?status=behind | jq

# Trigger manual run (admin)
curl -X POST http://localhost:3000/api/warmup/control \
  -H "Content-Type: application/json" \
  -d '{"action": "trigger"}'

# Stop service (admin)
curl -X POST http://localhost:3000/api/warmup/control \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'

# Prometheus metrics
curl http://localhost:3000/api/warmup/metrics?format=prometheus
```

---

**Ready for production deployment! 🚀**
