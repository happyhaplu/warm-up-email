/**
 * Scalable Warmup Engine
 * Production-ready email warmup system designed to handle:
 * - Thousands of users × 100 mailboxes each
 * - Per-mailbox quota enforcement (minimum 30/day)
 * - Parallel/batched sending with concurrency control
 * - Configurable delays without blocking quotas
 * - Global safety caps (per user, per system)
 * - Real-time metrics and monitoring
 * - Horizontal scalability
 */

import nodemailer from 'nodemailer';
import imaps from 'imap-simple';
import prisma from './prisma';
import { WarmupEngineConfig } from './warmup-config';
import {
  getDailyLimit,
  getDaysSinceStart,
  getRandomReplyDelay,
  randomizeSubject,
  randomizeBody,
} from './warmup-utils';

interface MailboxJob {
  mailboxId: number;
  email: string;
  userId: string;
  dailyQuota: number;
  sentToday: number;
  remaining: number;
  dayNumber: number;
  priority: number; // Higher = more urgent (based on quota deficit)
}

interface SendResult {
  success: boolean;
  mailboxId: number;
  email: string;
  error?: string;
  timestamp: Date;
}

interface BatchResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  duration: number;
  results: SendResult[];
}

export class WarmupEngine {
  private metrics: any;
  private isRunning = false;
  private batchQueue: MailboxJob[] = [];
  private activeSends = new Map<number, Promise<SendResult>>();
  
  // Rate limiting counters
  private hourlyCounter = 0;
  private minuteCounter = 0;
  private lastHourReset = Date.now();
  private lastMinuteReset = Date.now();
  
  // User-level tracking
  private userDailyCounts = new Map<string, number>();
  private userMonthlyCounts = new Map<string, number>();
  
  // Per-mailbox cooldown tracking (prevents same mailbox from sending too frequently)
  private mailboxLastSent = new Map<number, number>(); // mailboxId -> timestamp
  private mailboxCooldownUntil = new Map<number, number>(); // mailboxId -> timestamp when cooldown expires

  constructor() {
    // Lazy import to avoid circular dependency
    const { WarmupMetrics } = require('./warmup-metrics');
    this.metrics = new WarmupMetrics();
    this.resetRateLimitCounters();
  }

  /**
   * Main entry point: Process all mailboxes in optimized batches
   */
  async processBatch(): Promise<BatchResult> {
    if (this.isRunning) {
      throw new Error('Batch processing already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();
    const results: SendResult[] = [];

    try {
      console.log('🚀 Starting scalable warmup batch processing...');
      
      // 1. Load all mailboxes that need sending
      await this.loadMailboxQueue();
      
      if (this.batchQueue.length === 0) {
        console.log('✅ No mailboxes need sending at this time');
        return {
          totalProcessed: 0,
          successful: 0,
          failed: 0,
          duration: Date.now() - startTime,
          results: [],
        };
      }

      console.log(`📊 Loaded ${this.batchQueue.length} mailboxes with quota remaining`);
      
      // 2. Process in parallel batches with concurrency control
      const batchResults = await this.processInParallelBatches();
      results.push(...batchResults);

      // 3. Update metrics
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      await this.metrics.recordBatchComplete({
        totalProcessed: results.length,
        successful,
        failed,
        duration: Date.now() - startTime,
      });

      console.log(`✅ Batch complete: ${successful} sent, ${failed} failed in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

      return {
        totalProcessed: results.length,
        successful,
        failed,
        duration: Date.now() - startTime,
        results,
      };

    } finally {
      this.isRunning = false;
      this.batchQueue = [];
      this.activeSends.clear();
    }
  }

  /**
   * Load all mailboxes that need to send emails into the queue
   * Prioritizes mailboxes furthest from their daily quota
   * In distributed mode, each worker only processes its assigned mailboxes
   */
  private async loadMailboxQueue(): Promise<void> {
    const accounts = await prisma.account.findMany({
      where: {
        email: { not: '' },
        warmupEnabled: true,
      },
      include: {
        user: {
          include: {
            plan: true,
          },
        },
      },
    });

    // Filter for this worker's mailboxes in distributed mode
    const assignedAccounts = WarmupEngineConfig.ENABLE_DISTRIBUTED_MODE
      ? accounts.filter(acc => this.shouldProcessMailbox(acc.id))
      : accounts;

    if (WarmupEngineConfig.ENABLE_DISTRIBUTED_MODE) {
      console.log(`🔧 Worker ${WarmupEngineConfig.WORKER_ID}/${WarmupEngineConfig.WORKER_COUNT}: Processing ${assignedAccounts.length}/${accounts.length} mailboxes`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset user tracking
    this.userDailyCounts.clear();
    this.userMonthlyCounts.clear();

    // Pre-load user limits
    await this.preloadUserLimits(accounts, today);

    const jobs: MailboxJob[] = [];

    for (const account of assignedAccounts) {
      // Skip if user exceeded their plan limits
      if (account.userId && await this.isUserLimitExceeded(account.userId, account.user?.plan)) {
        continue;
      }

      // Initialize warmup start date if needed
      let warmupStartDate = account.warmupStartDate;
      if (!warmupStartDate) {
        warmupStartDate = new Date();
        await prisma.account.update({
          where: { id: account.id },
          data: { warmupStartDate },
        });
      }

      const dayNumber = getDaysSinceStart(warmupStartDate);
      const dailyQuota = getDailyLimit(
        dayNumber,
        account.warmupMaxDaily,
        account.warmupStartCount,
        account.warmupIncreaseBy
      );

      // Count sent today (normalize status to uppercase)
      const sentToday = await prisma.log.count({
        where: {
          senderId: account.id,
          timestamp: { gte: today, lt: tomorrow },
          status: { in: ['SENT', 'sent', 'REPLIED', 'replied'] },
        },
      });

      const remaining = Math.max(0, dailyQuota - sentToday);

      if (remaining > 0) {
        // Calculate priority: mailboxes with larger quota deficits get higher priority
        const quotaFillRate = sentToday / Math.max(dailyQuota, 1);
        const priority = (1 - quotaFillRate) * 100 + remaining;

        jobs.push({
          mailboxId: account.id,
          email: account.email!,
          userId: account.userId || 'unknown',
          dailyQuota,
          sentToday,
          remaining,
          dayNumber,
          priority,
        });
      }

      // Update warmup log
      await prisma.warmupLog.upsert({
        where: {
          mailboxId_date: {
            mailboxId: account.id,
            date: today,
          },
        },
        update: {
          sentCount: sentToday,
          dailyLimit: dailyQuota,
          dayNumber,
        },
        create: {
          mailboxId: account.id,
          date: today,
          dayNumber,
          sentCount: sentToday,
          dailyLimit: dailyQuota,
        },
      });
    }

    // Sort by priority (highest first) - ensures mailboxes furthest from quota get processed first
    jobs.sort((a, b) => b.priority - a.priority);

    this.batchQueue = jobs;
    
    // Log top priorities
    if (jobs.length > 0) {
      console.log('📌 Top priority mailboxes:');
      jobs.slice(0, 5).forEach(job => {
        console.log(`   ${job.email}: ${job.sentToday}/${job.dailyQuota} sent, ${job.remaining} remaining (priority: ${job.priority.toFixed(1)})`);
      });
    }
  }

  /**
   * Pre-load user email counts to avoid repeated queries
   */
  private async preloadUserLimits(accounts: any[], today: Date): Promise<void> {
    const userIds = [...new Set(accounts.map(a => a.userId).filter(Boolean))];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    for (const userId of userIds) {
      const userMailboxIds = accounts
        .filter(a => a.userId === userId)
        .map(a => a.id);

      const dailyCount = await prisma.log.count({
        where: {
          senderId: { in: userMailboxIds },
          timestamp: { gte: today, lt: tomorrow },
          status: { in: ['SENT', 'sent', 'REPLIED', 'replied'] },
        },
      });

      const monthlyCount = await prisma.log.count({
        where: {
          senderId: { in: userMailboxIds },
          timestamp: { gte: firstDayOfMonth },
          status: { in: ['SENT', 'sent', 'REPLIED', 'replied'] },
        },
      });

      this.userDailyCounts.set(userId, dailyCount);
      this.userMonthlyCounts.set(userId, monthlyCount);
    }
  }

  /**
   * Check if user has exceeded their plan limits
   */
  private async isUserLimitExceeded(userId: string, plan: any): Promise<boolean> {
    if (!plan) return false;

    const dailyCount = this.userDailyCounts.get(userId) || 0;
    const monthlyCount = this.userMonthlyCounts.get(userId) || 0;

    if (dailyCount >= plan.dailyEmailLimit) {
      console.log(`⛔ User limit reached: ${dailyCount}/${plan.dailyEmailLimit} daily emails`);
      return true;
    }

    if (monthlyCount >= plan.monthlyEmailLimit) {
      console.log(`⛔ User limit reached: ${monthlyCount}/${plan.monthlyEmailLimit} monthly emails`);
      return true;
    }

    return false;
  }

  /**
   * Process queue in parallel batches with concurrency control
   */
  private async processInParallelBatches(): Promise<SendResult[]> {
    const allResults: SendResult[] = [];
    const batchSize = WarmupEngineConfig.BATCH_SIZE;
    const maxConcurrent = WarmupEngineConfig.MAX_CONCURRENT_SENDS;

    console.log(`⚡ Processing ${this.batchQueue.length} mailboxes with concurrency: ${maxConcurrent}`);

    // Process in chunks
    for (let i = 0; i < this.batchQueue.length; i += batchSize) {
      const batch = this.batchQueue.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(this.batchQueue.length / batchSize)} (${batch.length} mailboxes)`);

      const batchResults = await this.processConcurrentSends(batch, maxConcurrent);
      allResults.push(...batchResults);

      // Add delay between batches to avoid overwhelming the system
      if (i + batchSize < this.batchQueue.length) {
        const delayMs = WarmupEngineConfig.BATCH_DELAY_MS;
        console.log(`⏳ Batch cooldown: ${delayMs / 1000}s`);
        await this.sleep(delayMs);
      }
    }

    return allResults;
  }

  /**
   * Send emails with controlled concurrency
   */
  private async processConcurrentSends(
    jobs: MailboxJob[],
    maxConcurrent: number
  ): Promise<SendResult[]> {
    const results: SendResult[] = [];
    const queue = [...jobs];

    while (queue.length > 0 || this.activeSends.size > 0) {
      // Start new sends up to concurrency limit
      while (queue.length > 0 && this.activeSends.size < maxConcurrent) {
        const job = queue.shift()!;
        
        // Check per-mailbox cooldown (natural gap between sends from same mailbox)
        if (!this.isMailboxReady(job.mailboxId)) {
          const cooldownRemaining = this.getMailboxCooldownRemaining(job.mailboxId);
          if (cooldownRemaining > 1000) { // More than 1 second remaining
            queue.push(job); // Put at end of queue, try other mailboxes first
            continue; // Skip this mailbox for now
          }
        }
        
        // Check global rate limits
        if (!await this.checkGlobalRateLimit()) {
          console.log('⚠️  Global rate limit reached, throttling...');
          await this.sleep(WarmupEngineConfig.RATE_LIMIT_BACKOFF_MS);
          queue.unshift(job); // Put back in queue
          continue;
        }

        // Start send (non-blocking)
        const sendPromise = this.sendWarmupEmail(job);
        this.activeSends.set(job.mailboxId, sendPromise);

        // Add natural delay between initiating sends
        if (queue.length > 0) {
          const delayMs = this.getStaggerDelay();
          await this.sleep(delayMs);
        }
      }

      // Wait for at least one send to complete
      if (this.activeSends.size > 0) {
        const completed = await Promise.race(Array.from(this.activeSends.values()));
        results.push(completed);
        this.activeSends.delete(completed.mailboxId);
      }
    }

    return results;
  }

  /**
   * Get random stagger delay between initiating sends (natural spacing)
   */
  private getStaggerDelay(): number {
    const min = WarmupEngineConfig.SEND_STAGGER_MIN_MS;
    const max = WarmupEngineConfig.SEND_STAGGER_MAX_MS;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Send a single warmup email from specified mailbox
   */
  private async sendWarmupEmail(job: MailboxJob): Promise<SendResult> {
    const startTime = Date.now();
    
    try {
      // Get sender account
      const sender = await prisma.account.findUnique({
        where: { id: job.mailboxId },
      });

      if (!sender) {
        throw new Error(`Sender mailbox ${job.mailboxId} not found`);
      }

      // Get random recipient (different from sender)
      const recipient = await this.getRandomRecipient(job.mailboxId);
      if (!recipient) {
        throw new Error('No suitable recipient found');
      }

      // Get send template
      const template = await this.getRandomSendTemplate();
      if (!template) {
        throw new Error('No send templates available');
      }

      // Prepare email
      const subject = randomizeSubject(template.subject);
      const body = randomizeBody(template.body);

      // Send via SMTP
      const transporter = nodemailer.createTransport({
        host: sender.smtpHost,
        port: sender.smtpPort,
        secure: sender.smtpPort === 465,
        auth: {
          user: sender.email,
          pass: sender.appPassword,
        },
        connectionTimeout: WarmupEngineConfig.SMTP_TIMEOUT_MS,
        greetingTimeout: WarmupEngineConfig.SMTP_TIMEOUT_MS,
      });

      await transporter.sendMail({
        from: `"${sender.senderName || sender.email}" <${sender.email}>`,
        to: recipient.email,
        subject,
        text: body,
        html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
      });

      // Log success
      await prisma.log.create({
        data: {
          senderId: sender.id,
          recipientId: recipient.id,
          sender: sender.email,
          recipient: recipient.email,
          subject,
          status: 'SENT',
          notes: `Sent via scalable warmup engine (Day ${job.dayNumber})`,
        },
      });

      // Schedule auto-reply if enabled
      if (sender.warmupReplyRate && Math.random() * 100 < sender.warmupReplyRate) {
        const replyDelay = getRandomReplyDelay();
        const scheduledFor = new Date(Date.now() + replyDelay);
        
        const replyTemplate = await this.getRandomReplyTemplate();
        if (replyTemplate) {
          await prisma.scheduledReply.create({
            data: {
              accountId: recipient.id,
              recipientEmail: sender.email,
              subject: `Re: ${subject}`,
              body: replyTemplate.text,
              scheduledFor,
              metadata: { originalSender: sender.email },
            },
          });
        }
      }

      // Update user counts
      if (job.userId) {
        this.userDailyCounts.set(job.userId, (this.userDailyCounts.get(job.userId) || 0) + 1);
        this.userMonthlyCounts.set(job.userId, (this.userMonthlyCounts.get(job.userId) || 0) + 1);
      }

      // Update metrics
      await this.metrics.recordEmailSent(job.mailboxId, job.email, Date.now() - startTime);
      this.incrementRateCounters();
      
      // Set mailbox cooldown (prevents this mailbox from sending again too soon)
      this.setMailboxCooldown(job.mailboxId);

      const cooldownMin = Math.floor(WarmupEngineConfig.MAILBOX_COOLDOWN_MIN_MS / 60000);
      const cooldownMax = Math.floor(WarmupEngineConfig.MAILBOX_COOLDOWN_MAX_MS / 60000);
      console.log(`✉️  ${job.email} → ${recipient.email} (${((Date.now() - startTime) / 1000).toFixed(2)}s) [cooldown: ${cooldownMin}-${cooldownMax}min]`);

      return {
        success: true,
        mailboxId: job.mailboxId,
        email: job.email,
        timestamp: new Date(),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ ${job.email}: ${errorMessage}`);

      // Log failure
      await prisma.log.create({
        data: {
          senderId: job.mailboxId,
          sender: job.email,
          recipient: 'unknown',
          subject: 'Failed warmup send',
          status: 'FAILED',
          notes: errorMessage,
        },
      }).catch(() => {
        // Ignore log failures
      });

      await this.metrics.recordEmailFailed(job.mailboxId, job.email, errorMessage);

      return {
        success: false,
        mailboxId: job.mailboxId,
        email: job.email,
        error: errorMessage,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get random recipient (excluding sender)
   */
  private async getRandomRecipient(excludeMailboxId: number): Promise<any> {
    const accounts = await prisma.account.findMany({
      where: {
        id: { not: excludeMailboxId },
        email: { not: '' },
      },
    });

    if (accounts.length === 0) return null;
    return accounts[Math.floor(Math.random() * accounts.length)];
  }

  /**
   * Get random send template
   */
  private async getRandomSendTemplate(): Promise<any> {
    const templates = await prisma.sendTemplate.findMany();
    if (templates.length === 0) return null;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Get random reply template
   */
  private async getRandomReplyTemplate(): Promise<any> {
    const templates = await prisma.replyTemplate.findMany();
    if (templates.length === 0) return null;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Check global rate limits (system-wide safety)
   */
  private async checkGlobalRateLimit(): Promise<boolean> {
    this.resetRateLimitCounters();

    if (this.hourlyCounter >= WarmupEngineConfig.GLOBAL_HOURLY_LIMIT) {
      return false;
    }

    if (this.minuteCounter >= WarmupEngineConfig.GLOBAL_MINUTE_LIMIT) {
      return false;
    }

    return true;
  }

  /**
   * Increment rate limit counters
   */
  private incrementRateCounters(): void {
    this.hourlyCounter++;
    this.minuteCounter++;
  }

  /**
   * Reset rate limit counters when time windows expire
   */
  private resetRateLimitCounters(): void {
    const now = Date.now();

    // Reset hourly counter
    if (now - this.lastHourReset >= 3600000) {
      this.hourlyCounter = 0;
      this.lastHourReset = now;
    }

    // Reset minute counter
    if (now - this.lastMinuteReset >= 60000) {
      this.minuteCounter = 0;
      this.lastMinuteReset = now;
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus() {
    return {
      queueSize: this.batchQueue.length,
      activeSends: this.activeSends.size,
      isRunning: this.isRunning,
      rateLimit: {
        hourly: `${this.hourlyCounter}/${WarmupEngineConfig.GLOBAL_HOURLY_LIMIT}`,
        minute: `${this.minuteCounter}/${WarmupEngineConfig.GLOBAL_MINUTE_LIMIT}`,
      },
    };
  }

  /**
   * Get metrics instance for external access
   */
  getMetrics(): any {
    return this.metrics;
  }

  /**
   * Check if mailbox is ready to send (cooldown expired)
   */
  private isMailboxReady(mailboxId: number): boolean {
    const cooldownUntil = this.mailboxCooldownUntil.get(mailboxId);
    if (!cooldownUntil) return true; // No cooldown set
    return Date.now() >= cooldownUntil;
  }

  /**
   * Get remaining cooldown time for mailbox (in milliseconds)
   */
  private getMailboxCooldownRemaining(mailboxId: number): number {
    const cooldownUntil = this.mailboxCooldownUntil.get(mailboxId);
    if (!cooldownUntil) return 0;
    return Math.max(0, cooldownUntil - Date.now());
  }

  /**
   * Set cooldown for mailbox after send
   * Prevents same mailbox from sending again too soon (natural gap)
   */
  private setMailboxCooldown(mailboxId: number): void {
    const now = Date.now();
    this.mailboxLastSent.set(mailboxId, now);
    
    // Calculate cooldown duration
    let cooldownMs: number;
    if (WarmupEngineConfig.MAILBOX_COOLDOWN_RANDOMIZE) {
      // Randomize between min and max for natural patterns
      const min = WarmupEngineConfig.MAILBOX_COOLDOWN_MIN_MS;
      const max = WarmupEngineConfig.MAILBOX_COOLDOWN_MAX_MS;
      cooldownMs = Math.floor(Math.random() * (max - min + 1)) + min;
    } else {
      // Use minimum cooldown
      cooldownMs = WarmupEngineConfig.MAILBOX_COOLDOWN_MIN_MS;
    }
    
    this.mailboxCooldownUntil.set(mailboxId, now + cooldownMs);
  }

  /**
   * Clear expired cooldowns (cleanup)
   */
  private clearExpiredCooldowns(): void {
    const now = Date.now();
    for (const [mailboxId, cooldownUntil] of this.mailboxCooldownUntil.entries()) {
      if (now >= cooldownUntil) {
        this.mailboxCooldownUntil.delete(mailboxId);
      }
    }
  }

  /**
   * Determine if this worker should process a specific mailbox (distributed mode)
   * Uses modulo sharding: mailbox_id % worker_count === worker_id - 1
   */
  private shouldProcessMailbox(mailboxId: number): boolean {
    if (!WarmupEngineConfig.ENABLE_DISTRIBUTED_MODE) {
      return true; // Single worker processes all
    }

    const workerId = parseInt(WarmupEngineConfig.WORKER_ID, 10);
    const workerCount = WarmupEngineConfig.WORKER_COUNT;

    // Hash-based distribution ensures each mailbox goes to exactly one worker
    return mailboxId % workerCount === (workerId - 1) % workerCount;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const warmupEngine = new WarmupEngine();
