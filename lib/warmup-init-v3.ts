/**
 * Initialize Scalable Warmup System on App Startup
 * Replace old warmup initialization with this version
 */

import { warmupCron } from './warmup-cron-v3';

let isInitialized = false;

export async function initializeScalableWarmup() {
  if (isInitialized) {
    console.log('⚠️  Scalable warmup already initialized');
    return;
  }

  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 Initializing Scalable Warmup System');
    console.log('='.repeat(80));

    // Start the warmup cron service
    await warmupCron.start();

    isInitialized = true;

    console.log('✅ Scalable warmup system initialized successfully');
    console.log('='.repeat(80) + '\n');

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('\n📌 Shutting down warmup system...');
      warmupCron.stop();
      console.log('✅ Warmup system stopped gracefully');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('❌ Failed to initialize scalable warmup:', error);
    throw error;
  }
}

// Auto-initialize only in production runtime (not during build or test)
if (process.env.NODE_ENV === 'production' && 
    process.env.NEXT_PHASE !== 'phase-production-build' && 
    process.env.WARMUP_AUTO_START !== 'false') {
  initializeScalableWarmup().catch(err => {
    console.error('❌ Warmup initialization error:', err);
  });
}
