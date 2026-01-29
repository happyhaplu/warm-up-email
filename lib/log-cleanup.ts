/**
 * Automatic Log Cleanup Service
 * Runs daily to delete logs older than 30 days
 * Keeps recent logs for monthly reports, quota tracking, and deliverability stats
 */

import prisma from './prisma';

class LogCleanupService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the automatic cleanup service
   * Runs once per day at midnight
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Log cleanup service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🧹 Starting automatic log cleanup service...');
    console.log('📅 Will run daily at midnight to clean logs older than 30 days');

    // Run immediately on startup
    this.runCleanup();

    // Run every 24 hours (86400000 ms)
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Log cleanup service is not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('⏹️  Log cleanup service stopped');
  }

  /**
   * Run the cleanup process
   */
  private async runCleanup() {
    try {
      console.log('\n' + '='.repeat(80));
      console.log('🧹 Running automatic log cleanup...');
      console.log('='.repeat(80));

      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      console.log(`📅 Cutoff date: ${thirtyDaysAgo.toISOString()}`);

      // Count logs to be deleted
      const countToDelete = await prisma.log.count({
        where: {
          timestamp: {
            lt: thirtyDaysAgo
          }
        }
      });

      if (countToDelete === 0) {
        console.log('✅ No logs older than 30 days found. Nothing to clean.');
        console.log('='.repeat(80) + '\n');
        return;
      }

      console.log(`🗑️  Found ${countToDelete} logs older than 30 days`);

      // Delete old logs
      const result = await prisma.log.deleteMany({
        where: {
          timestamp: {
            lt: thirtyDaysAgo
          }
        }
      });

      console.log(`✅ Successfully deleted ${result.count} old log(s)`);

      // Get remaining logs count
      const remaining = await prisma.log.count();
      console.log(`📊 Remaining logs in database: ${remaining}`);
      console.log('='.repeat(80) + '\n');

    } catch (error) {
      console.error('❌ Error during log cleanup:', error);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      running: this.isRunning,
      interval: '24 hours',
      retentionDays: 30
    };
  }

  /**
   * Manually trigger cleanup
   */
  async triggerCleanup() {
    console.log('🔧 Manual cleanup triggered');
    await this.runCleanup();
  }
}

// Singleton instance
export const logCleanupService = new LogCleanupService();

// Auto-start in production (disable with CLEANUP_AUTO_START=false)
if (typeof window === 'undefined' && 
    process.env.NODE_ENV === 'production' && 
    process.env.NEXT_PHASE !== 'phase-production-build' &&
    process.env.CLEANUP_AUTO_START !== 'false') {
  console.log('🚀 Auto-starting log cleanup service...');
  logCleanupService.start();
}
