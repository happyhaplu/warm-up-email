// Auto-start warmup cron service on server startup
import { warmupCron } from './warmup-cron';

// Only run on server side
if (typeof window === 'undefined') {
  // Start the cron service after a brief delay to ensure database is ready
  setTimeout(async () => {
    try {
      console.log('🔧 Initializing warmup cron service...');
      await warmupCron.start();
      console.log('✅ Warmup cron service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to start warmup cron service:', error);
      console.log('⚠️ You can manually start it from the admin panel');
    }
  }, 5000); // 5 second delay
}

export {}; // Make this a module
