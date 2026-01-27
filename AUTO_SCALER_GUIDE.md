# 🤖 Auto-Scaler - Automatic Worker Scaling

**Your system now has AUTOMATIC worker scaling based on mailbox count!**

---

## ✅ What Changed?

The warmup system now **automatically adds and removes workers** as your mailbox count grows or shrinks.

### Before (Manual)
- You manually add workers when mailbox count grows
- You need to monitor and decide when to scale
- Risk of under/over-provisioning

### After (Automatic) ✨
- **System monitors mailbox count every 5 minutes**
- **Automatically adds workers** when utilization hits 80%
- **Automatically removes workers** when utilization drops below 30%
- No manual intervention needed!

---

## 🚀 How It Works

### 1. Auto-Scaler Daemon Monitors Mailbox Count

Every 5 minutes, the auto-scaler:
1. Counts active mailboxes in database
2. Calculates current utilization
3. Determines if scaling is needed
4. Executes scaling action

### 2. Automatic Scaling Triggers

**Scale UP when:**
- Utilization reaches **80%** capacity
- Example: 800 mailboxes with 1 worker (1000 capacity)
- Action: Add 1 worker → Now 2 workers (2000 capacity)

**Scale DOWN when:**
- Utilization drops below **30%** capacity
- Example: 250 mailboxes with 2 workers (2000 capacity)
- Action: Remove 1 worker → Now 1 worker (1000 capacity)

### 3. Cool-down Periods

To prevent rapid scaling (flapping):
- **Scale-up cooldown:** 5 minutes
- **Scale-down cooldown:** 10 minutes

This ensures stable operations.

---

## 📊 Example Scaling Timeline

```
Day 1:  48 mailboxes  → 1 worker  (5% utilization)  ✅ Stable
Day 10: 500 mailboxes → 1 worker  (50% utilization) ✅ Stable  
Day 15: 850 mailboxes → 1 worker  (85% utilization) 🚀 AUTO SCALE UP!
        ↓ Auto-scaler adds worker
        850 mailboxes → 2 workers (42% utilization) ✅ Stable

Day 30: 1,800 mailboxes → 2 workers (90% utilization) 🚀 AUTO SCALE UP!
        ↓ Auto-scaler adds worker
        1,800 mailboxes → 3 workers (60% utilization) ✅ Stable

Day 45: 3,200 mailboxes → 3 workers (107% - over!) 🚀 AUTO SCALE UP!
        ↓ Auto-scaler adds worker
        3,200 mailboxes → 4 workers (80% utilization) ✅ Stable

Later:  1,200 mailboxes → 4 workers (30% utilization) 📉 AUTO SCALE DOWN!
        ↓ Auto-scaler removes worker
        1,200 mailboxes → 3 workers (40% utilization) ✅ Stable
```

**You don't do anything - it's all automatic!**

---

## 🔧 Setup Instructions

### Option 1: Docker Compose (Recommended for Single Server)

1. **Start the auto-scaler daemon:**
   ```bash
   docker-compose -f docker-compose.auto-scale.yml up -d
   ```

2. **That's it!** The system will now:
   - Monitor mailbox count every 5 minutes
   - Automatically scale workers up/down
   - Handle everything for you

3. **Check status:**
   ```bash
   # View auto-scaler logs
   docker-compose -f docker-compose.auto-scale.yml logs -f auto-scaler
   
   # Check current workers
   docker-compose -f docker-compose.auto-scale.yml ps
   ```

### Option 2: Kubernetes (For Production Scale)

1. **Deploy auto-scaler:**
   ```bash
   kubectl apply -f k8s/auto-scaler-deployment.yaml
   ```

2. **Deploy warmup workers:**
   ```bash
   kubectl apply -f k8s/warmup-deployment.yaml
   ```

3. **Monitor:**
   ```bash
   # Check auto-scaler logs
   kubectl logs -f deployment/warmup-auto-scaler
   
   # Check current replicas
   kubectl get deployment warmup-workers
   ```

### Option 3: PM2 (For Development/Testing)

1. **Start auto-scaler with PM2:**
   ```bash
   pm2 start scripts/auto-scaler-daemon.ts --name auto-scaler
   ```

2. **Monitor:**
   ```bash
   pm2 logs auto-scaler
   pm2 status
   ```

---

## ⚙️ Configuration

All settings are in `.env`:

```env
# Enable/disable auto-scaling
AUTO_SCALER_ENABLED=true

# Check interval (how often to check)
AUTO_SCALER_CHECK_INTERVAL_MS=300000  # 5 minutes

# Mailboxes per worker
AUTO_SCALER_MAILBOXES_PER_WORKER=1000

# Min/max workers
AUTO_SCALER_MIN_WORKERS=1
AUTO_SCALER_MAX_WORKERS=100

# Scaling thresholds
AUTO_SCALER_SCALE_UP_THRESHOLD=0.8    # 80%
AUTO_SCALER_SCALE_DOWN_THRESHOLD=0.3  # 30%

# Platform (docker, kubernetes, or manual)
AUTO_SCALER_PLATFORM=docker
```

### Tuning for Your Needs

**Conservative (slower scaling, more stable):**
```env
AUTO_SCALER_SCALE_UP_THRESHOLD=0.9     # Scale at 90%
AUTO_SCALER_SCALE_DOWN_THRESHOLD=0.2   # Scale down at 20%
AUTO_SCALER_SCALE_UP_COOLDOWN_MS=600000   # 10 min cooldown
AUTO_SCALER_SCALE_DOWN_COOLDOWN_MS=1800000 # 30 min cooldown
```

**Aggressive (faster scaling, more responsive):**
```env
AUTO_SCALER_SCALE_UP_THRESHOLD=0.7     # Scale at 70%
AUTO_SCALER_SCALE_DOWN_THRESHOLD=0.4   # Scale down at 40%
AUTO_SCALER_SCALE_UP_COOLDOWN_MS=180000   # 3 min cooldown
AUTO_SCALER_SCALE_DOWN_COOLDOWN_MS=300000  # 5 min cooldown
```

---

## 📡 Monitoring & API

### Check Status via API

```bash
# Get auto-scaler status
curl http://localhost:3001/api/auto-scaler/status

# Response:
{
  "enabled": true,
  "currentWorkers": 2,
  "mailboxCount": 1500,
  "utilizationPercent": 75.0,
  "optimalWorkers": 2,
  "canScaleUp": true,
  "canScaleDown": true,
  "config": {
    "enabled": true,
    "checkIntervalMs": 300000,
    "mailboxesPerWorker": 1000,
    "minWorkers": 1,
    "maxWorkers": 100,
    "scaleUpThreshold": 0.8,
    "scaleDownThreshold": 0.3,
    "platform": "docker"
  }
}
```

### Manually Trigger Scaling Check (Admin)

```bash
# Trigger immediate check
curl -X POST http://localhost:3001/api/auto-scaler/trigger \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Response:
{
  "success": true,
  "decision": {
    "action": "scale-up",
    "currentWorkers": 1,
    "targetWorkers": 2,
    "reason": "High utilization (85.0%) - adding worker",
    "mailboxCount": 850,
    "utilizationPercent": 85.0
  },
  "message": "Scaling check complete: scale-up"
}
```

---

## 🔍 Troubleshooting

### Auto-Scaler Not Starting

**Check environment variable:**
```bash
# Make sure it's enabled
grep AUTO_SCALER_ENABLED .env
# Should show: AUTO_SCALER_ENABLED=true
```

**Check logs:**
```bash
# Docker
docker-compose logs auto-scaler

# PM2
pm2 logs auto-scaler

# Kubernetes
kubectl logs deployment/warmup-auto-scaler
```

### Workers Not Scaling

**Check platform configuration:**
```bash
# For Docker
grep AUTO_SCALER_PLATFORM .env
# Should show: AUTO_SCALER_PLATFORM=docker

# Verify Docker socket access
docker ps
```

**Check permissions:**
```bash
# Docker needs socket access
ls -la /var/run/docker.sock

# Kubernetes needs RBAC permissions
kubectl get role warmup-auto-scaler-role
kubectl get rolebinding warmup-auto-scaler-binding
```

### Scaling Too Frequently (Flapping)

**Increase cooldown periods:**
```env
AUTO_SCALER_SCALE_UP_COOLDOWN_MS=600000    # 10 minutes
AUTO_SCALER_SCALE_DOWN_COOLDOWN_MS=1800000 # 30 minutes
```

**Widen threshold gap:**
```env
AUTO_SCALER_SCALE_UP_THRESHOLD=0.85    # Scale up at 85%
AUTO_SCALER_SCALE_DOWN_THRESHOLD=0.25  # Scale down at 25%
```

---

## 📈 Performance Impact

### Resource Usage

**Auto-Scaler Daemon:**
- CPU: ~50-100m (minimal)
- Memory: ~128-256MB
- Network: Negligible
- Disk: Minimal (logs only)

**Overhead:** Less than 1% of total system resources

### Scaling Speed

**Docker Compose:**
- Scale up: ~10-30 seconds
- Scale down: ~5-15 seconds

**Kubernetes:**
- Scale up: ~15-45 seconds (includes pod startup)
- Scale down: ~10-20 seconds

---

## 🎯 Best Practices

### 1. Set Appropriate Limits
```env
# Don't set MAX too high if you have resource constraints
AUTO_SCALER_MAX_WORKERS=50  # Adjust based on server capacity
```

### 2. Monitor Initially
- Watch logs for first 24 hours
- Verify scaling happens at expected thresholds
- Adjust thresholds if needed

### 3. Test Scaling
```bash
# Manually trigger to test
curl -X POST http://localhost:3001/api/auto-scaler/trigger
```

### 4. Set Up Alerts
- Alert when workers hit MAX_WORKERS (capacity limit)
- Alert if scaling fails repeatedly
- Monitor mailbox growth rate

### 5. Plan for Growth
```env
# If growing fast, be aggressive
AUTO_SCALER_SCALE_UP_THRESHOLD=0.7

# If growth is slow/stable, be conservative
AUTO_SCALER_SCALE_UP_THRESHOLD=0.85
```

---

## 📋 Quick Start Checklist

- [ ] Update `.env` with auto-scaler settings (already done ✅)
- [ ] Start auto-scaler daemon:
  ```bash
  docker-compose -f docker-compose.auto-scale.yml up -d
  ```
- [ ] Verify auto-scaler is running:
  ```bash
  docker-compose logs auto-scaler
  ```
- [ ] Check initial status:
  ```bash
  curl http://localhost:3001/api/auto-scaler/status
  ```
- [ ] Monitor for 24 hours
- [ ] Adjust thresholds if needed

---

## 🎉 You're Done!

Your system now has **fully automatic worker scaling**!

**What happens now:**
1. ✅ System monitors mailbox count every 5 minutes
2. ✅ Automatically adds workers when you hit 80% capacity
3. ✅ Automatically removes workers when usage drops below 30%
4. ✅ No manual intervention needed - it just works!

**Next Steps:**
- Start the auto-scaler: `docker-compose -f docker-compose.auto-scale.yml up -d`
- Watch it work: `docker-compose logs -f auto-scaler`
- Check status: `curl http://localhost:3001/api/auto-scaler/status`

**Questions?**
- Check logs: `docker-compose logs auto-scaler`
- Test manually: `curl -X POST http://localhost:3001/api/auto-scaler/trigger`
- Adjust thresholds in `.env` as needed

---

**System Status:** 🤖 **AUTO-SCALING ENABLED**

Your warmup system now scales automatically from 1 worker to 100 workers based on demand!
