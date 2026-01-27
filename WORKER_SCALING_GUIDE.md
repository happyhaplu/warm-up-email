# Worker Scaling Guide
**Auto vs Manual Worker Distribution**

---

## Current Implementation: **MANUAL SCALING**

The warmup system currently requires **manual configuration** for worker distribution. It does NOT auto-scale based on demand.

### Why Manual Scaling?

1. **Predictable Performance** - You control exactly how many workers run
2. **Cost Control** - No surprise resource usage spikes
3. **Stable Operations** - Workers don't start/stop unexpectedly
4. **Simple Architecture** - No complex orchestration needed

---

## 📊 When to Scale (Manual Triggers)

### Current Setup (Single Worker)
```bash
# No special configuration needed
# Default: Single worker mode
WARMUP_ENABLE_DISTRIBUTED_MODE=false
```
**Capacity:** 500-1,000 mailboxes

### Trigger 1: 500+ Mailboxes
**Action:** Add monitoring to watch performance

```bash
# Check if approaching limit
npx tsx scripts/test-warmup-system.ts
```

### Trigger 2: 1,000+ Mailboxes
**Action:** Deploy 2-5 distributed workers

```bash
# Enable distributed mode
WARMUP_ENABLE_DISTRIBUTED_MODE=true
WARMUP_WORKER_COUNT=3
```

**Deploy manually:**
```bash
# Worker 1
docker run -e WARMUP_WORKER_ID=1 -e WARMUP_WORKER_COUNT=3 ...

# Worker 2
docker run -e WARMUP_WORKER_ID=2 -e WARMUP_WORKER_COUNT=3 ...

# Worker 3
docker run -e WARMUP_WORKER_ID=3 -e WARMUP_WORKER_COUNT=3 ...
```

### Trigger 3: 10,000+ Mailboxes
**Action:** Deploy 10-20 workers

```bash
# Use deployment script
./scripts/deploy-100-workers.sh

# Or manually set count
WARMUP_WORKER_COUNT=20
```

### Trigger 4: 100,000+ Mailboxes
**Action:** Deploy to Kubernetes with 50-100 workers

```bash
# Use Kubernetes deployment
kubectl apply -f k8s/warmup-deployment.yaml
kubectl scale deployment warmup-workers --replicas=100
```

---

## 🔧 How to Scale Manually

### Step 1: Determine Worker Count

**Formula:**
```
Workers Needed = Total Mailboxes ÷ 1,000 (rounded up)
```

**Examples:**
- 1,500 mailboxes → 2 workers
- 5,000 mailboxes → 5 workers
- 25,000 mailboxes → 25 workers
- 100,000 mailboxes → 100 workers

### Step 2: Update Configuration

**Option A: Environment Variables**
```env
# .env
WARMUP_ENABLE_DISTRIBUTED_MODE=true
WARMUP_WORKER_COUNT=10
WARMUP_WORKER_ID=1  # Unique per worker (1-10)
```

**Option B: Production Config File**
```bash
# Use pre-configured file
cp .env.production.100k .env
# Edit WARMUP_WORKER_COUNT to your needs
```

### Step 3: Deploy Workers

**Docker Deployment:**
```bash
# Deploy 10 workers
for i in {1..10}; do
  docker run -d \
    --name warmup-worker-$i \
    -e WARMUP_ENABLE_DISTRIBUTED_MODE=true \
    -e WARMUP_WORKER_COUNT=10 \
    -e WARMUP_WORKER_ID=$i \
    -e DATABASE_URL="$DATABASE_URL" \
    warmup-app
done
```

**Kubernetes Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: warmup-workers
spec:
  replicas: 10  # Set worker count here
  template:
    spec:
      containers:
      - name: warmup
        env:
        - name: WARMUP_ENABLE_DISTRIBUTED_MODE
          value: "true"
        - name: WARMUP_WORKER_COUNT
          value: "10"
        - name: WARMUP_WORKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name  # Unique per pod
```

### Step 4: Verify Distribution

```bash
# Check logs for worker assignment
docker logs warmup-worker-1 | grep "Worker ID"
# Should show: Worker ID: 1/10

# Test each worker
npx tsx scripts/test-warmup-system.ts
```

---

## 🤖 Future: Auto-Scaling (Not Currently Implemented)

If you need **automatic scaling based on demand**, here's what would be required:

### Architecture Changes Needed:

1. **Metrics Collection**
   - Monitor queue depth (pending mailboxes)
   - Track processing time per batch
   - Measure CPU/memory usage

2. **Auto-Scaling Logic**
   ```typescript
   // Not implemented yet
   if (pendingMailboxes > 1000 && workers < maxWorkers) {
     scaleUp(workers + 1);
   }
   if (pendingMailboxes < 100 && workers > 1) {
     scaleDown(workers - 1);
   }
   ```

3. **Orchestration Integration**
   - Kubernetes Horizontal Pod Autoscaler (HPA)
   - AWS ECS Auto Scaling
   - Google Cloud Run auto-scaling

### Kubernetes HPA Example (Future Implementation):

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: warmup-workers-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: warmup-workers
  minReplicas: 1
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

This would automatically add/remove workers based on CPU/memory usage.

---

## 📋 Monitoring & Scaling Checklist

### Daily Monitoring (Current Scale)
```bash
# Check mailbox count
npx tsx scripts/test-warmup-system.ts

# Look for these metrics:
# - Total Mailboxes: X
# - Active Mailboxes Today: Y
# - Sends Today: Z
```

### When to Scale Up:
- [ ] Total mailboxes > 500 (consider adding workers)
- [ ] Total mailboxes > 1,000 (must add workers)
- [ ] Processing time > 30 minutes per cycle
- [ ] Mailboxes missing daily quota targets
- [ ] Error rate increasing

### How to Scale Up:
1. Calculate needed workers: `Mailboxes ÷ 1,000`
2. Update `WARMUP_WORKER_COUNT` in .env
3. Deploy additional worker containers/pods
4. Verify distribution with test script
5. Monitor for 24 hours to confirm

### When to Scale Down:
- [ ] Total mailboxes < 500 (can use single worker)
- [ ] Workers idle most of the time
- [ ] Over-provisioned resources

---

## 🎯 Current Answer: **MANUAL SCALING REQUIRED**

**Your Question:** Is worker distribution automatic based on demand?

**Answer:** ❌ **No, it's currently manual.**

**What this means:**
- You must decide when to add workers
- You must manually deploy additional workers
- Workers don't start/stop automatically
- You control the scaling based on mailbox count

**Scaling Process:**
1. **Monitor:** Check mailbox count daily
2. **Decide:** Use formula (Mailboxes ÷ 1,000 = Workers)
3. **Deploy:** Manually add workers via Docker/Kubernetes
4. **Verify:** Test distribution is working

**Example Timeline:**
- **Today:** 48 mailboxes → 1 worker ✅ (perfect)
- **Week 1:** 500 mailboxes → 1 worker ✅ (still good)
- **Week 2:** 1,200 mailboxes → **YOU ADD** 2 workers manually
- **Month 1:** 5,000 mailboxes → **YOU ADD** 5 workers manually
- **Month 3:** 25,000 mailboxes → **YOU ADD** 25 workers manually

**Recommendation:**
- Set up alerts when mailbox count crosses thresholds (500, 1000, 5000)
- Plan scaling in advance (not reactive)
- Test scaling in staging first
- Use Kubernetes for easier multi-worker management

---

## 🚀 Quick Start: Scaling Right Now

If you need to scale **TODAY**, here's the fastest path:

### For 1,000-5,000 Mailboxes:
```bash
# Use Docker Compose
docker-compose -f docker-compose.production.yml up -d --scale warmup-worker=5
```

### For 5,000-25,000 Mailboxes:
```bash
# Deploy to Kubernetes
kubectl apply -f k8s/warmup-deployment.yaml
kubectl scale deployment warmup-workers --replicas=25
```

### For 100,000+ Mailboxes:
```bash
# Use automated deployment script
./scripts/deploy-100-workers.sh
```

---

**Summary:**
- ❌ **NOT automatic** - You must manually scale
- ✅ **Easy to scale** - Just set worker count and deploy
- ✅ **Stateless** - Workers don't need coordination
- ✅ **Predictable** - You control when/how to scale
- ⚠️ **Monitoring required** - Watch mailbox growth and plan ahead
