#!/usr/bin/env tsx
/**
 * Auto-Scaler Daemon
 * Background service that monitors mailbox count and automatically scales workers
 * 
 * Usage:
 *   # Run as daemon
 *   npx tsx scripts/auto-scaler-daemon.ts
 * 
 *   # Or with PM2
 *   pm2 start scripts/auto-scaler-daemon.ts --name auto-scaler
 */

import { autoScaler } from '../lib/auto-scaler';
import { AutoScalerConfig } from '../lib/auto-scaler-config';
import prisma from '../lib/prisma';

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Run scaling check
 */
async function runScalingCheck() {
  if (isRunning) {
    console.log('[Auto-Scaler Daemon] Previous check still running, skipping...');
    return;
  }

  isRunning = true;

  try {
    console.log('\n' + '='.repeat(60));
    console.log('[Auto-Scaler Daemon] Starting scaling check...');
    console.log('='.repeat(60));

    const decision = await autoScaler.checkAndScale();

    console.log('\n📊 Scaling Decision:');
    console.log(`  Action: ${decision.action}`);
    console.log(`  Workers: ${decision.currentWorkers} → ${decision.targetWorkers}`);
    console.log(`  Mailboxes: ${decision.mailboxCount}`);
    console.log(`  Utilization: ${decision.utilizationPercent.toFixed(1)}%`);
    console.log(`  Reason: ${decision.reason}`);

    if (decision.action === 'scale-up') {
      console.log('\n🚀 Scaling UP - Adding worker...');
    } else if (decision.action === 'scale-down') {
      console.log('\n📉 Scaling DOWN - Removing worker...');
    } else {
      console.log('\n✅ No scaling needed - System optimal');
    }

    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('[Auto-Scaler Daemon] Error during scaling check:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the auto-scaler daemon
 */
async function start() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         AUTO-SCALER DAEMON - STARTING                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  if (!AutoScalerConfig.ENABLED) {
    console.log('❌ Auto-Scaler is DISABLED');
    console.log('   Set AUTO_SCALER_ENABLED=true in .env to enable');
    console.log('');
    process.exit(1);
  }

  console.log('✅ Auto-Scaler is ENABLED');
  console.log('');
  console.log('Configuration:');
  console.log(`  Platform: ${AutoScalerConfig.PLATFORM}`);
  console.log(`  Check Interval: ${AutoScalerConfig.CHECK_INTERVAL_MS / 1000}s`);
  console.log(`  Mailboxes per Worker: ${AutoScalerConfig.MAILBOXES_PER_WORKER}`);
  console.log(`  Min Workers: ${AutoScalerConfig.MIN_WORKERS}`);
  console.log(`  Max Workers: ${AutoScalerConfig.MAX_WORKERS}`);
  console.log(`  Scale Up Threshold: ${(AutoScalerConfig.SCALE_UP_THRESHOLD * 100).toFixed(0)}%`);
  console.log(`  Scale Down Threshold: ${(AutoScalerConfig.SCALE_DOWN_THRESHOLD * 100).toFixed(0)}%`);
  console.log('');

  // Show initial status
  try {
    const status = await autoScaler.getStatus();
    console.log('Current Status:');
    console.log(`  Workers: ${status.currentWorkers}`);
    console.log(`  Mailboxes: ${status.mailboxCount}`);
    console.log(`  Utilization: ${status.utilizationPercent.toFixed(1)}%`);
    console.log(`  Optimal Workers: ${status.optimalWorkers}`);
    console.log('');
  } catch (error) {
    console.error('Error getting initial status:', error);
  }

  // Run first check immediately
  console.log('Running initial scaling check...');
  await runScalingCheck();

  // Schedule periodic checks
  console.log(`Scheduling checks every ${AutoScalerConfig.CHECK_INTERVAL_MS / 1000}s`);
  intervalId = setInterval(runScalingCheck, AutoScalerConfig.CHECK_INTERVAL_MS);

  console.log('');
  console.log('🟢 Auto-Scaler Daemon is running...');
  console.log('   Press Ctrl+C to stop');
  console.log('');
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('\n');
  console.log('🔴 Shutting down Auto-Scaler Daemon...');

  if (intervalId) {
    clearInterval(intervalId);
  }

  await prisma.$disconnect();
  
  console.log('✅ Shutdown complete');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the daemon
start().catch((error) => {
  console.error('❌ Fatal error starting Auto-Scaler Daemon:', error);
  process.exit(1);
});
