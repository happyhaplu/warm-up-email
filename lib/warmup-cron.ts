import nodemailer from 'nodemailer';
import imaps from 'imap-simple';
import prisma from './prisma';
import {
  getDailyLimit,
  getDaysSinceStart,
  getRandomSendOffset,
  getRandomReplyDelay,
  getRandomSendDelay,
  randomizeSubject,
  randomizeBody,
  canSendToday,
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
   * Main cycle - check all mailboxes and send if needed
   */
  private async runCycle() {
    try {
      console.log('🔄 Running warmup cycle...');

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

      // Send from multiple mailboxes with random delays between sends
      for (const mailbox of shuffled) {
        if (!canSendToday(mailbox.sentToday, mailbox.dailyQuota)) {
          continue;
        }

        // Add random delay between sends (2-10 minutes)
        if (mailbox !== shuffled[0]) {
          const delay = getRandomSendDelay();
          console.log(`⏳ Waiting ${Math.round(delay / 1000 / 60)} minutes before next send...`);
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
      select: {
        id: true,
        email: true,
        warmupStartDate: true,
        warmupMaxDaily: true,
        createdAt: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const quotaInfo: DailyQuotaInfo[] = [];

    for (const account of accounts) {
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
      
      // Get daily limit based on ramp-up schedule
      const dailyQuota = getDailyLimit(dayNumber, account.warmupMaxDaily);

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

      const remaining = Math.max(0, dailyQuota - sentToday);

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

      // Get all other mailboxes as potential recipients
      const recipients = await prisma.account.findMany({
        where: {
          id: { not: senderId },
        },
      });

      if (recipients.length === 0) {
        console.error('❌ No recipient mailboxes available');
        return false;
      }

      // Pick a random recipient
      const recipient = recipients[Math.floor(Math.random() * recipients.length)];

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

      // Create SMTP transporter
      const transporter = nodemailer.createTransport({
        host: sender.smtpHost,
        port: sender.smtpPort,
        secure: sender.smtpPort === 465,
        auth: {
          user: sender.email,
          pass: sender.appPassword,
        },
      });

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
          status: 'sent',
          notes: 'Automatic warmup email',
        },
      });

      console.log('✅ Email sent successfully');
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
            status: 'failed',
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
          authTimeout: 10000,
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

        // Add random delay before replying (5-240 minutes for natural behavior)
        const replyDelay = getRandomReplyDelay();
        const delayMinutes = Math.round(replyDelay / 1000 / 60);
        console.log(`💬 Will reply to ${fromEmail} in ${delayMinutes} minutes`);
        
        // Store reply task for later (in production, use a job queue)
        // For now, we'll reply immediately but log the intended delay
        console.log(`📝 Composing reply to message from ${fromEmail}`);

        // Pick random reply template
        const replyTemplate = replyTemplates[Math.floor(Math.random() * replyTemplates.length)];

        // Randomize reply content slightly
        const randomizedReply = randomizeBody(replyTemplate.text);

        // Send reply
        const transporter = nodemailer.createTransport({
          host: account.smtpHost,
          port: account.smtpPort,
          secure: account.smtpPort === 465,
          auth: {
            user: account.email,
            pass: account.appPassword,
          },
        });

        await transporter.sendMail({
          from: account.senderName ? `"${account.senderName}" <${account.email}>` : account.email,
          to: fromEmail,
          subject: `Re: ${subject}`,
          text: randomizedReply,
          html: randomizedReply.replace(/\n/g, '<br>'),
          inReplyTo: header.body['message-id']?.[0],
          references: header.body['message-id']?.[0],
        });

        // Mark as seen
        await connection.addFlags(message.attributes.uid, '\\Seen');

        // Log the reply
        const senderMailbox = await prisma.account.findFirst({
          where: { email: fromEmail },
        });

        await prisma.log.create({
          data: {
            senderId: account.id,
            recipientId: senderMailbox?.id,
            sender: account.email,
            recipient: fromEmail,
            subject: `Re: ${subject}`,
            status: 'replied',
            notes: `Automatic warmup reply (intended delay: ${delayMinutes}m)`,
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

        console.log('✅ Auto-reply sent');
        break; // Only reply to one message per cycle
      }

      connection.end();
    } catch (error) {
      console.error('❌ Error checking inbox:', error);
    }
  }
}

// Singleton instance
export const warmupCron = new WarmupCronService();
