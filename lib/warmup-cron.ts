import nodemailer from 'nodemailer';
import imaps from 'imap-simple';
import prisma from './prisma';

interface DailyQuotaInfo {
  mailboxId: number;
  email: string;
  dailyQuota: number;
  sentToday: number;
  remaining: number;
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
        console.log('📭 No mailboxes configured');
        return;
      }

      // Filter mailboxes that still have quota remaining
      const mailboxesWithQuota = quotaInfo.filter(m => m.remaining > 0);

      if (mailboxesWithQuota.length === 0) {
        console.log('✅ All mailboxes have reached their daily quota');
        return;
      }

      console.log(`📊 ${mailboxesWithQuota.length} mailbox(es) have quota remaining`);

      // Send from one mailbox per cycle (to spread out the sending)
      const mailbox = mailboxesWithQuota[0]; // Could randomize this
      await this.sendWarmupEmail(mailbox.mailboxId);

      // Check for replies
      await this.checkAndReplyToInbox(mailbox.mailboxId);

      this.lastSendTime = new Date();
    } catch (error) {
      console.error('❌ Error in warmup cycle:', error);
    }
  }

  /**
   * Get quota information for all mailboxes
   */
  private async getMailboxQuotaInfo(): Promise<DailyQuotaInfo[]> {
    const accounts = await prisma.account.findMany({
      where: {
        email: { not: undefined },
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        appPassword: true,
        senderName: true,
        smtpHost: true,
        smtpPort: true,
        imapHost: true,
        imapPort: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const quotaInfo: DailyQuotaInfo[] = [];

    for (const account of accounts) {
      // Count emails sent today from this mailbox
      const sentToday = await prisma.log.count({
        where: {
          senderId: account.id,
          timestamp: {
            gte: today,
          },
          status: 'sent',
        },
      });

      const dailyQuota = 10; // Default daily warmup quota
      const remaining = Math.max(0, dailyQuota - sentToday);

      quotaInfo.push({
        mailboxId: account.id,
        email: account.email!,
        dailyQuota: dailyQuota,
        sentToday,
        remaining,
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

      console.log(`📧 Sending from ${sender.email} to ${recipient.email}`);
      console.log(`📝 Template: "${template.subject}"`);

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

      // Send email
      await transporter.sendMail({
        from: sender.senderName ? `"${sender.senderName}" <${sender.email}>` : sender.email,
        to: recipient.email,
        subject: template.subject,
        text: template.body,
        html: template.body.replace(/\n/g, '<br>'),
      });

      // Log the send
      await prisma.log.create({
        data: {
          senderId: sender.id,
          recipientId: recipient.id,
          sender: sender.email,
          recipient: recipient.email,
          subject: template.subject,
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

        console.log(`💬 Replying to message from ${fromEmail}`);

        // Pick random reply template
        const replyTemplate = replyTemplates[Math.floor(Math.random() * replyTemplates.length)];

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
          text: replyTemplate.text,
          html: replyTemplate.text.replace(/\n/g, '<br>'),
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
            notes: 'Automatic warmup reply',
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
