/**
 * Scalable Warmup Cron Service
 * Production-ready scheduler for the warmup engine
 * Supports distributed deployment and horizontal scaling
 */

import prisma from './prisma';
import { warmupEngine } from './warmup-engine';
import { WarmupEngineConfig } from './warmup-config';
import { getRandomReplyDelay } from './warmup-utils';

class WarmupCronService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastRunTime: Date | null = null;
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 5;

  /**
   * Start the automatic warmup cron service
   * Runs at configured intervals with intelligent scheduling
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Warmup cron service is already running');
      return;
    }

    this.isRunning = true;
    const intervalMinutes = WarmupEngineConfig.CRON_INTERVAL_MINUTES;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log('🚀 Starting scalable warmup cron service...');
    console.log(`⏰ Interval: Every ${intervalMinutes} minutes`);
    console.log(`🔧 Worker: ${WarmupEngineConfig.WORKER_ID}/${WarmupEngineConfig.WORKER_COUNT}`);
    console.log(`📊 Batch size: ${WarmupEngineConfig.BATCH_SIZE}, Concurrency: ${WarmupEngineConfig.MAX_CONCURRENT_SENDS}`);

    // Run immediately on start
    await this.runCycle();

    // Schedule periodic runs
    this.intervalId = setInterval(async () => {
      await this.runCycle();
    }, intervalMs);

    // Schedule daily cleanup at midnight
    this.scheduleDailyCleanup();
  }

  /**
   * Stop the cron service
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Warmup cron service is not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('⏹️  Warmup cron service stopped');
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      running: this.isRunning,
      lastRunTime: this.lastRunTime,
      consecutiveFailures: this.consecutiveFailures,
      checkIntervalMinutes: WarmupEngineConfig.CRON_INTERVAL_MINUTES,
      queueStatus: warmupEngine.getQueueStatus(),
      workerId: WarmupEngineConfig.WORKER_ID,
    };
  }

  /**
   * Main execution cycle
   * 1. Process scheduled replies
   * 2. Run warmup batch
   * 3. Update metrics
   */
  private async runCycle() {
    const cycleStartTime = Date.now();
    
    try {
      console.log('\n' + '='.repeat(80));
      console.log(`🔄 Starting warmup cycle at ${new Date().toISOString()}`);
      console.log('='.repeat(80));

      // Step 1: Process scheduled replies that are due
      await this.processScheduledReplies();

      // Step 2: Run main warmup batch using scalable engine
      const batchResult = await warmupEngine.processBatch();

      // Step 3: Display metrics
      const metrics = warmupEngine.getMetrics();
      const statusString = await metrics.getStatusString();
      console.log('\n📊 Current Status:');
      console.log(statusString);

      // Step 4: Check for mailboxes behind quota
      const behindQuota = await metrics.getMailboxesBehindQuota();
      if (behindQuota.length > 0) {
        console.log(`\n⚠️  ${behindQuota.length} mailboxes behind quota:`);
        behindQuota.slice(0, 10).forEach((m: any) => {
          console.log(`   ${m.email}: ${m.sentToday}/${m.dailyQuota} (${m.percentComplete.toFixed(1)}% complete)`);
        });
      }

      // Reset failure counter on success
      if (batchResult.successful > 0) {
        this.consecutiveFailures = 0;
      }

      this.lastRunTime = new Date();
      const cycleDuration = ((Date.now() - cycleStartTime) / 1000).toFixed(1);
      console.log(`\n✅ Cycle completed in ${cycleDuration}s`);
      console.log('='.repeat(80) + '\n');

    } catch (error) {
      this.consecutiveFailures++;
      console.error('❌ Error in warmup cycle:', error);
      
      // Auto-stop if too many consecutive failures
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        console.error(`🛑 Stopping cron service after ${this.consecutiveFailures} consecutive failures`);
        this.stop();
      }
    }
  }

  /**
   * Process scheduled replies that are due
   */
  private async processScheduledReplies() {
    try {
      const now = new Date();
      const dueReplies = await prisma.scheduledReply.findMany({
        where: {
          scheduledFor: { lte: now },
          status: 'pending',
        },
        take: 100, // Process in batches
      });

      if (dueReplies.length === 0) {
        return;
      }

      console.log(`⏰ Processing ${dueReplies.length} scheduled reply(ies)...`);

      let successCount = 0;
      let failureCount = 0;

      for (const reply of dueReplies) {
        try {
          await this.sendScheduledReply(reply);
          await prisma.scheduledReply.update({
            where: { id: reply.id },
            data: { 
              status: 'sent',
              sentAt: new Date(),
            },
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to send scheduled reply ${reply.id}:`, error);
          await prisma.scheduledReply.update({
            where: { id: reply.id },
            data: { 
              status: 'failed',
              metadata: { 
                ...((reply.metadata as any) || {}),
                error: error instanceof Error ? error.message : 'Unknown error',
                failedAt: new Date().toISOString(),
              }
            },
          });
          failureCount++;
        }
      }

      console.log(`✅ Scheduled replies: ${successCount} sent, ${failureCount} failed`);

    } catch (error) {
      console.error('Error processing scheduled replies:', error);
    }
  }

  /**
   * Send a single scheduled reply
   */
  private async sendScheduledReply(reply: any) {
    const nodemailer = require('nodemailer');
    
    // Get sender account (the one replying)
    const account = await prisma.account.findUnique({
      where: { id: reply.accountId },
    });

    if (!account) {
      throw new Error(`Account ${reply.accountId} not found`);
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpPort === 465,
      auth: {
        user: account.email,
        pass: account.appPassword,
      },
      connectionTimeout: WarmupEngineConfig.SMTP_TIMEOUT_MS,
    });

    // Send reply
    await transporter.sendMail({
      from: `"${account.senderName || account.email}" <${account.email}>`,
      to: reply.recipientEmail,
      subject: reply.subject,
      text: reply.body,
      html: `<p>${reply.body.replace(/\n/g, '<br>')}</p>`,
    });

    // Log the reply
    await prisma.log.create({
      data: {
        senderId: account.id,
        sender: account.email,
        recipient: reply.recipientEmail,
        subject: reply.subject,
        status: 'REPLIED',
        notes: 'Automated reply from warmup system',
      },
    });

    console.log(`📧 Reply sent: ${account.email} → ${reply.recipientEmail}`);
  }

  /**
   * Schedule daily cleanup at midnight
   */
  private scheduleDailyCleanup() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 5, 0, 0); // Run at 00:05 AM

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.performDailyCleanup();
      // Reschedule for next day
      setInterval(() => {
        this.performDailyCleanup();
      }, 24 * 60 * 60 * 1000); // Every 24 hours
    }, msUntilMidnight);

    console.log(`🧹 Daily cleanup scheduled for ${tomorrow.toISOString()}`);
  }

  /**
   * Perform daily cleanup tasks
   */
  private async performDailyCleanup() {
    console.log('🧹 Running daily cleanup...');
    
    try {
      // Clean up old metrics
      const metrics = warmupEngine.getMetrics();
      await metrics.cleanupOldMetrics();
      
      // Reset daily stats
      metrics.resetDailyStats();
      
      // Clean up old logs (optional - keep last 90 days)
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - 90);
      
      const deletedLogs = await prisma.log.deleteMany({
        where: {
          timestamp: { lt: retentionDate },
        },
      });

      console.log(`✅ Daily cleanup complete: ${deletedLogs.count} old logs removed`);
    } catch (error) {
      console.error('❌ Error during daily cleanup:', error);
    }
  }

  /**
   * Manually trigger a cycle (for testing or manual runs)
   */
  async triggerManualRun() {
    console.log('🔧 Manual warmup cycle triggered');
    await this.runCycle();
  }

  /**
   * Get comprehensive status report
   */
  async getDetailedStatus() {
    const metrics = warmupEngine.getMetrics();
    const [systemMetrics, quotaStatus, batchHistory, performanceSummary] = await Promise.all([
      metrics.getSystemMetrics(),
      metrics.getQuotaStatus(),
      Promise.resolve(metrics.getBatchHistory(10)),
      metrics.getPerformanceSummary(),
    ]);

    return {
      cron: this.getStatus(),
      system: systemMetrics,
      quotaStatus: quotaStatus.slice(0, 20), // Top 20
      batchHistory,
      performanceSummary,
    };
  }

  /**
   * Export metrics in Prometheus format for monitoring
   */
  async exportMetrics() {
    const metrics = warmupEngine.getMetrics();
    return await metrics.exportPrometheusMetrics();
  }
}

// Singleton instance
export const warmupCron = new WarmupCronService();

// Export for direct use in distributed systems
export { WarmupCronService };
