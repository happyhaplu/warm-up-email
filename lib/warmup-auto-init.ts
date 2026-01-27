import { warmupCron } from './warmup-cron';

// Global flag to track if warmup has been initialized
let warmupInitialized = false;

/**
 * Initialize warmup cron service (call this from API routes)
 * Only initializes once, subsequent calls are no-op
 */
export async function initializeWarmupCron() {
  // Don't initialize during build or development
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  if (warmupInitialized) {
    return;
  }

  try {
    console.log('🔧 Initializing warmup cron service...');
    await warmupCron.start();
    warmupInitialized = true;
    console.log('✅ Warmup cron service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to start warmup cron service:', error);
    // Don't throw - allow the app to continue even if warmup fails to start
  }
}

// Auto-initialize on module load (server-side only, production only)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
  // Delay initialization to ensure database is ready
  setTimeout(() => {
    initializeWarmupCron();
  }, 5000);
}
