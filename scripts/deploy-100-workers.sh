#!/bin/bash

# Deploy 100 Workers for Email Warmup System
# Handles 100,000 mailboxes (1,000 users × 100 mailboxes each)

set -e

echo "=========================================="
echo "Deploying 100 Warmup Workers"
echo "=========================================="

# Load environment variables
if [ ! -f .env.production.100k ]; then
  echo "❌ .env.production.100k not found!"
  echo "Copy .env.production.100k.example and configure it first."
  exit 1
fi

source .env.production.100k

# Build Docker image
echo "📦 Building Docker image..."
docker build -t warmup-worker:latest .

# Stop and remove existing workers
echo "🛑 Stopping existing workers..."
docker ps -a | grep warmup-worker | awk '{print $1}' | xargs -r docker stop
docker ps -a | grep warmup-worker | awk '{print $1}' | xargs -r docker rm

# Deploy 100 workers
echo "🚀 Deploying 100 workers..."

for i in {1..100}; do
  echo "Starting worker-$i..."
  
  docker run -d \
    --name warmup-worker-$i \
    --restart unless-stopped \
    --network warmup-network \
    -e DATABASE_URL="$DATABASE_URL" \
    -e DIRECT_URL="$DIRECT_URL" \
    -e NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
    -e NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
    -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
    -e WARMUP_DISTRIBUTED_MODE=true \
    -e WARMUP_WORKER_COUNT=100 \
    -e WARMUP_WORKER_ID=$i \
    -e WARMUP_BATCH_SIZE=200 \
    -e WARMUP_MAX_CONCURRENT=50 \
    -e WARMUP_CRON_INTERVAL_MINUTES=10 \
    -e WARMUP_GLOBAL_HOURLY_LIMIT=150000 \
    -e WARMUP_GLOBAL_MINUTE_LIMIT=2500 \
    -e WARMUP_MAILBOX_COOLDOWN_MIN_MS=120000 \
    -e WARMUP_MAILBOX_COOLDOWN_MAX_MS=300000 \
    -e NODE_ENV=production \
    warmup-worker:latest
  
  # Stagger deployments to avoid overwhelming the system
  if [ $((i % 10)) -eq 0 ]; then
    echo "✅ Deployed $i/100 workers"
    sleep 2
  fi
done

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "📊 Status:"
docker ps | grep warmup-worker | wc -l
echo " workers running"
echo ""
echo "🔍 Monitor workers:"
echo "  docker logs -f warmup-worker-1"
echo "  docker stats"
echo ""
echo "📈 Check metrics:"
echo "  curl http://localhost:3000/api/warmup/metrics"
echo ""
echo "🛑 Stop all workers:"
echo "  ./scripts/stop-workers.sh"
echo ""
