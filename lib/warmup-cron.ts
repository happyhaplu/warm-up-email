import nodemailer from 'nodemailer';
import imaps from 'imap-simple';
import prisma from './prisma';
import { WarmupConfig } from './warmup-config';
import {
  getDailyLimit,
  getDaysSinceStart,
  getRandomSendOffset,
  getRandomReplyDelay,
  getRandomSendDelay,
  randomizeSubject,
  randomizeBody,
  canSendToday,
  getScheduledReplyTime,
  checkPlanLimits,
} from './warmup-utils';

interface DailyQuotaInfo {
  mailboxId: number;
  email: string;
  dailyQuota: number;
  sentToday: number;
  remaining: number;
  dayNumber: number;
  warmupStartDate: Date | null;
}

class WarmupCronService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
  private readonly MIN_DELAY_BETWEEN_SENDS_MS = 2 * 60 * 1000; // 2 minutes between sends
  private lastSendTime: Date | null = null;

  /**
   * Start the automatic warmup cron service
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Warmup cron service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting automatic warmup cron service...');
    console.log(`📅 Will check mailboxes every ${this.CHECK_INTERVAL_MS / 1000 / 60} minutes`);

    // Run immediately on start
    await this.runCycle();

    // Then run periodically
    this.intervalId = setInterval(async () => {
      await this.runCycle();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Stop the cron service
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Warmup cron service is not running');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('⏹️ Warmup cron service stopped');
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      running: this.isRunning,
      lastSendTime: this.lastSendTime,
      checkIntervalMinutes: this.CHECK_INTERVAL_MS / 1000 / 60,
    };
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
        take: 50, // Process in batches
      });

      if (dueReplies.length > 0) {
        console.log(`⏰ Processing ${dueReplies.length} scheduled reply(ies)...`);
      }

      for (const reply of dueReplies) {
        try {
          await this.sendScheduledReply(reply);
          await prisma.scheduledReply.update({
            where: { id: reply.id },
            data: { status: 'sent' },
          });
        } catch (error) {
          console.error(`Failed to send scheduled reply ${reply.id}:`, error);
          await prisma.scheduledReply.update({
            where: { id: reply.id },
            data: { 
              status: 'failed',
              metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
            },
          });
        }
      }
    } catch (error) {
      console.error('Error processing scheduled replies:', error);
    }
  }

  /**
   * Main cycle - check all mailboxes and send if needed
   */
  private async runCycle() {
    try {
      console.log('🔄 Running warmup cycle...');

      // First, process any scheduled replies that are due
      await this.processScheduledReplies();

      // Get all mailboxes with their quota and today's sent count
      const quotaInfo = await this.getMailboxQuotaInfo();

      if (quotaInfo.length === 0) {
        console.log('📭 No mailboxes configured for warmup');
        return;
      }

      // Filter mailboxes that still have quota remaining
      const mailboxesWithQuota = quotaInfo.filter(m => m.remaining > 0);

      if (mailboxesWithQuota.length === 0) {
        console.log('✅ All mailboxes have reached their daily quota');
        quotaInfo.forEach(m => {
          console.log(`   ${m.email}: Day ${m.dayNumber}, ${m.sentToday}/${m.dailyQuota} sent`);
        });
        return;
      }

      console.log(`📊 ${mailboxesWithQuota.length} mailbox(es) have quota remaining:`);
      mailboxesWithQuota.forEach(m => {
        console.log(`   ${m.email}: Day ${m.dayNumber}, ${m.sentToday}/${m.dailyQuota} sent, ${m.remaining} remaining`);
      });

      // Randomize order to prevent pattern detection
      const shuffled = [...mailboxesWithQuota].sort(() => Math.random() - 0.5);

      // Send from multiple mailboxes with random delays between sends (3-15 minutes)
      for (const mailbox of shuffled) {
        if (!canSendToday(mailbox.sentToday, mailbox.dailyQuota)) {
          continue;
        }

        // Check global rate limiting
        const canSend = await this.checkGlobalRateLimit();
        if (!canSend) {
          console.log('⚠️ Global rate limit reached, pausing sends...');
          break; // Stop sending from all mailboxes
        }

        // Add random delay between sends (3-15 minutes) except for first email
        if (mailbox !== shuffled[0]) {
          const delay = getRandomSendDelay(); // 3-15 minutes
          const delayMinutes = Math.round(delay / 1000 / 60);
          console.log(`⏳ Waiting ${delayMinutes} minutes before next send...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        await this.sendWarmupEmail(mailbox.mailboxId);

        // Check for replies after sending
        await this.checkAndReplyToInbox(mailbox.mailboxId);
      }

      this.lastSendTime = new Date();
    } catch (error) {
      console.error('❌ Error in warmup cycle:', error);
    }
  }

  /**
   * Get quota information for all mailboxes with gradual ramp-up
   */
  private async getMailboxQuotaInfo(): Promise<DailyQuotaInfo[]> {
    const accounts = await prisma.account.findMany({
      where: {
        email: { not: undefined },
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const quotaInfo: DailyQuotaInfo[] = [];

    for (const account of accounts) {
      // Check plan limits if user has a plan
      if (account.user?.plan) {
        const mailboxCount = await prisma.account.count({
          where: { userId: account.userId },
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dailyEmailsSent = await prisma.log.count({
          where: {
            senderId: account.id,
            timestamp: { gte: today, lt: tomorrow },
            status: 'sent',
          },
        });

        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthlyEmailsSent = await prisma.log.count({
          where: {
            senderId: account.id,
            timestamp: { gte: firstDayOfMonth },
            status: 'sent',
          },
        });

        const limitCheck = checkPlanLimits(
          { mailboxCount, dailyEmailsSent, monthlyEmailsSent },
          {
            mailboxLimit: account.user.plan.mailboxLimit || 999,
            dailyEmailLimit: account.user.plan.dailyEmailLimit || 9999,
            monthlyEmailLimit: account.user.plan.monthlyEmailLimit || 99999,
          }
        );

        if (limitCheck.exceeded) {
          console.log(`⚠️ ${account.email}: ${limitCheck.message}`);
          continue; // Skip this mailbox
        }
      }

      // Initialize warmup start date if not set
      let warmupStartDate = account.warmupStartDate;
      if (!warmupStartDate) {
        warmupStartDate = new Date();
        await prisma.account.update({
          where: { id: account.id },
          data: { warmupStartDate },
        });
      }

      // Calculate days since warmup start
      const dayNumber = getDaysSinceStart(warmupStartDate);
      
      // Get daily limit based on custom ramp-up settings
      const dailyQuota = getDailyLimit(
        dayNumber, 
        account.warmupMaxDaily,
        account.warmupStartCount,
        account.warmupIncreaseBy
      );

      // Count emails sent today from this mailbox
      const sentToday = await prisma.log.count({
        where: {
          senderId: account.id,
          timestamp: {
            gte: today,
            lt: tomorrow,
          },
          status: 'sent',
        },
      });

      // Calculate remaining (unlimited if maxDaily is 0 or -1)
      const isUnlimited = account.warmupMaxDaily === 0 || account.warmupMaxDaily === -1;
      const remaining = isUnlimited ? dailyQuota : Math.max(0, dailyQuota - sentToday);

      // Update or create warmup log for today
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

      quotaInfo.push({
        mailboxId: account.id,
        email: account.email!,
        dailyQuota,
        sentToday,
        remaining,
        dayNumber,
        warmupStartDate,
      });
    }

    return quotaInfo;
  }

  /**
   * Send a warmup email from specified mailbox
   */
  private async sendWarmupEmail(senderId: number): Promise<boolean> {
    try {
      // Get sender account
      const sender = await prisma.account.findUnique({
        where: { id: senderId },
      });

      if (!sender) {
        console.error(`❌ Sender mailbox ${senderId} not found`);
        return false;
      }

      // Check if we should use dedicated recipient pool
      let recipient: any;
      
      if (WarmupConfig.USE_DEDICATED_RECIPIENT_POOL) {
        // Use dedicated recipient pool
        const recipientPool = await prisma.recipient.findMany({
          where: { isActive: true },
        });

        if (recipientPool.length === 0) {
          console.error('❌ No active recipients in dedicated pool');
          return false;
        }

        // Pick random from pool
        recipient = recipientPool[Math.floor(Math.random() * recipientPool.length)];
      } else {
        // Use peer-to-peer (other mailboxes)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get all other mailboxes as potential recipients
        const allRecipients = await prisma.account.findMany({
          where: {
            id: { not: senderId },
          },
        });

        if (allRecipients.length === 0) {
          console.error('❌ No recipient mailboxes available');
          return false;
        }

        // Filter out recipients already emailed today (uniqueness check)
        if (WarmupConfig.PREVENT_DUPLICATE_SENDS_PER_DAY) {
          const sentToday = await prisma.log.findMany({
            where: {
              senderId,
              timestamp: { gte: today, lt: tomorrow },
              status: 'sent',
            },
            select: { recipientId: true },
          });

          const sentRecipientIds = new Set(sentToday.map(log => log.recipientId));
          const availableRecipients = allRecipients.filter(
            r => !sentRecipientIds.has(r.id)
          );

          if (availableRecipients.length === 0) {
            console.log('ℹ️ All available recipients already received email today');
            return false;
          }

          recipient = availableRecipients[Math.floor(Math.random() * availableRecipients.length)];
        } else {
          recipient = allRecipients[Math.floor(Math.random() * allRecipients.length)];
        }
      }

      // Get a random send template
      const templates = await prisma.sendTemplate.findMany();
      if (templates.length === 0) {
        console.error('❌ No send templates available');
        return false;
      }

      const template = templates[Math.floor(Math.random() * templates.length)];

      // Randomize subject and body to avoid pattern detection
      const randomizedSubject = randomizeSubject(template.subject);
      const randomizedBody = randomizeBody(template.body);

      console.log(`📧 Sending from ${sender.email} to ${recipient.email}`);
      console.log(`📝 Template: "${randomizedSubject}"`);

      // Detect provider for optional enhancements
      const isOutlook = sender.smtpHost.toLowerCase().includes('outlook') || 
                        sender.smtpHost.toLowerCase().includes('office365');
      const isYahoo = sender.smtpHost.toLowerCase().includes('yahoo');

      // Universal robust SMTP configuration for ALL providers
      const transportOptions: any = {
        host: sender.smtpHost,
        port: sender.smtpPort,
        secure: sender.smtpPort === 465,
        auth: {
          user: sender.email,
          pass: sender.appPassword,
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        requireTLS: sender.smtpPort === 587,
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        },
      };

      // Provider-specific enhancements
      if (isOutlook || isYahoo) {
        transportOptions.auth.type = 'login';
      }

      const transporter = nodemailer.createTransport(transportOptions);

      // Send email with randomized content
      await transporter.sendMail({
        from: sender.senderName ? `"${sender.senderName}" <${sender.email}>` : sender.email,
        to: recipient.email,
        subject: randomizedSubject,
        text: randomizedBody,
        html: randomizedBody.replace(/\n/g, '<br>'),
      });

      // Log the send
      await prisma.log.create({
        data: {
          senderId: sender.id,
          recipientId: recipient.id,
          sender: sender.email,
          recipient: recipient.email,
          subject: randomizedSubject,
          status: 'SENT',
          notes: 'Automatic warmup email',
        },
      });

      console.log('✅ Email sent successfully');

      // Increment rate limit counter
      await this.incrementRateLimit();

      return true;
    } catch (error) {
      console.error('❌ Error sending warmup email:', error);
      
      // Log the failure
      try {
        await prisma.log.create({
          data: {
            senderId,
            sender: 'unknown',
            recipient: 'unknown',
            subject: 'Failed warmup email',
            status: 'FAILED',
            notes: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (logError) {
        console.error('❌ Error logging failure:', logError);
      }

      return false;
    }
  }

  /**
   * Check inbox and auto-reply to unread messages
   */
  private async checkAndReplyToInbox(mailboxId: number): Promise<void> {
    try {
      const account = await prisma.account.findUnique({
        where: { id: mailboxId },
        select: {
          id: true,
          email: true,
          appPassword: true,
          senderName: true,
          smtpHost: true,
          smtpPort: true,
          imapHost: true,
          imapPort: true,
          warmupReplyRate: true, // Include reply rate
        },
      });

      if (!account) {
        return;
      }

      console.log(`📬 Checking inbox for ${account.email}...`);

      // Connect to IMAP
      const config = {
        imap: {
          user: account.email,
          password: account.appPassword,
          host: account.imapHost,
          port: account.imapPort,
          tls: true,
          tlsOptions: { rejectUnauthorized: false },
          authTimeout: 30000,
        },
      };

      const connection = await imaps.connect(config);
      await connection.openBox('INBOX');

      // Search for unread messages from other mailboxes
      const searchCriteria = ['UNSEEN'];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT'],
        markSeen: false,
      };

      const messages = await connection.search(searchCriteria, fetchOptions);

      if (messages.length === 0) {
        console.log('ℹ️ No unread messages');
        connection.end();
        return;
      }

      console.log(`📨 Found ${messages.length} unread message(s)`);

      // Get all mailbox emails for checking if sender is from our pool
      const allMailboxes = await prisma.account.findMany({
        select: { email: true },
      });
      const mailboxEmails = new Set(allMailboxes.map((m: any) => m.email.toLowerCase()));

      // Get reply templates
      const replyTemplates = await prisma.replyTemplate.findMany();
      if (replyTemplates.length === 0) {
        console.log('⚠️ No reply templates available');
        connection.end();
        return;
      }

      // Process first unread message from our mailbox pool
      for (const message of messages) {
        const header = message.parts.find((p: any) => p.which === 'HEADER');
        if (!header) continue;

        const from = header.body.from?.[0] || '';
        const fromEmail = from.match(/<(.+)>/)?.[1] || from;
        const subject = header.body.subject?.[0] || '';

        // Only reply to emails from our mailbox pool
        if (!mailboxEmails.has(fromEmail.toLowerCase())) {
          continue;
        }

        // Check if we should reply based on warmupReplyRate percentage
        const shouldReply = Math.random() * 100 < account.warmupReplyRate;
        if (!shouldReply) {
          console.log(`⏭️ Skipping reply to ${fromEmail} (reply rate: ${account.warmupReplyRate}%)`);
          await connection.addFlags(message.attributes.uid, '\\Seen');
          continue;
        }

        // Calculate when to send the reply (5-240 minutes for natural behavior)
        const scheduledFor = getScheduledReplyTime();
        const delayMinutes = Math.round((scheduledFor.getTime() - Date.now()) / 1000 / 60);
        console.log(`💬 Scheduling reply to ${fromEmail} in ${delayMinutes} minutes (reply rate: ${account.warmupReplyRate}%)`);
        
        // Get sender mailbox for recipient ID
        const senderMailbox = await prisma.account.findFirst({
          where: { email: fromEmail },
        });

        // Pick random reply template
        const replyTemplate = replyTemplates[Math.floor(Math.random() * replyTemplates.length)];
        const randomizedReply = randomizeBody(replyTemplate.text);

        // Schedule the reply for later
        await prisma.scheduledReply.create({
          data: {
            accountId: account.id,
            recipientEmail: fromEmail,
            recipientId: senderMailbox?.id,
            subject: `Re: ${subject}`,
            body: randomizedReply,
            scheduledFor,
            status: 'pending',
            metadata: {
              originalMessageId: header.body['message-id']?.[0],
              replyRate: account.warmupReplyRate,
            },
          },
        });

        // Mark as seen
        await connection.addFlags(message.attributes.uid, '\\Seen');

        console.log(`✅ Reply scheduled for ${scheduledFor.toLocaleString()}`);
        break; // Only reply to one message per cycle
      }

      connection.end();
    } catch (error) {
      console.error('❌ Error checking inbox:', error);
    }
  }

  /**
   * Check global rate limit
   */
  private async checkGlobalRateLimit(): Promise<boolean> {
    try {
      const now = new Date();
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const timeSlot = currentHour.toISOString();

      // Get or create rate limit log for current hour
      const rateLimitLog = await prisma.rateLimitLog.upsert({
        where: { timeSlot },
        update: {},
        create: { timeSlot, count: 0 },
      });

      // Check if limit exceeded
      if (rateLimitLog.count >= WarmupConfig.GLOBAL_HOURLY_LIMIT) {
        return false; // Rate limit exceeded
      }

      return true; // OK to send
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return true; // On error, allow sending
    }
  }

  /**
   * Increment global rate limit counter
   */
  private async incrementRateLimit(): Promise<void> {
    try {
      const now = new Date();
      const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const timeSlot = currentHour.toISOString();

      await prisma.rateLimitLog.upsert({
        where: { timeSlot },
        update: { count: { increment: 1 } },
        create: { timeSlot, count: 1 },
      });
    } catch (error) {
      console.error('Error incrementing rate limit:', error);
    }
  }

  /**
   * Send a scheduled reply
   */
  private async sendScheduledReply(scheduledReply: any): Promise<void> {
    const account = await prisma.account.findUnique({
      where: { id: scheduledReply.accountId },
    });

    if (!account) {
      throw new Error(`Account ${scheduledReply.accountId} not found`);
    }

    console.log(`📧 Sending scheduled reply from ${account.email} to ${scheduledReply.recipientEmail}`);

    // Detect provider for optional enhancements
    const isOutlook = account.smtpHost.toLowerCase().includes('outlook') || 
                      account.smtpHost.toLowerCase().includes('office365');
    const isYahoo = account.smtpHost.toLowerCase().includes('yahoo');

    // Universal robust SMTP configuration
    const transportOptions: any = {
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpPort === 465,
      auth: {
        user: account.email,
        pass: account.appPassword,
      },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      requireTLS: account.smtpPort === 587,
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      },
    };

    // Provider-specific enhancements
    if (isOutlook || isYahoo) {
      transportOptions.auth.type = 'login';
    }

    const transporter = nodemailer.createTransport(transportOptions);

    await transporter.sendMail({
      from: account.senderName ? `"${account.senderName}" <${account.email}>` : account.email,
      to: scheduledReply.recipientEmail,
      subject: scheduledReply.subject,
      text: scheduledReply.body,
      html: scheduledReply.body.replace(/\n/g, '<br>'),
      inReplyTo: scheduledReply.metadata?.originalMessageId,
      references: scheduledReply.metadata?.originalMessageId,
    });

    // Log the reply
    await prisma.log.create({
      data: {
        senderId: account.id,
        recipientId: scheduledReply.recipientId,
        sender: account.email,
        recipient: scheduledReply.recipientEmail,
        subject: scheduledReply.subject,
        status: 'REPLIED',
        notes: 'Automatic warmup reply (scheduled)',
      },
    });

    // Update warmup log with reply count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await prisma.warmupLog.updateMany({
      where: {
        mailboxId: account.id,
        date: today,
      },
      data: {
        repliedCount: { increment: 1 },
      },
    });

    console.log('✅ Scheduled reply sent');
  }
}

// Singleton instance
export const warmupCron = new WarmupCronService();
