import nodemailer from 'nodemailer';
import imaps from 'imap-simple';
import prisma from './prisma';

interface WarmupConfig {
  minDelayMinutes?: number;
  maxDelayMinutes?: number;
  autoReply?: boolean;
}

const AUTO_REPLY_TEMPLATES = [
  'Thanks!',
  'Got it!',
  'Looks good!',
  'Appreciate it!',
  'Perfect, thank you!',
  'Received, thanks!',
  'Thank you for the update.',
  'Noted, thanks!',
  'Great, thank you!',
  'Thanks for sharing!',
];

class WarmupService {
  private isRunning = false;
  private jobInterval: NodeJS.Timeout | null = null;

  async startWarmup(config: WarmupConfig = {}) {
    if (this.isRunning) {
      throw new Error('Warmup is already running');
    }

    this.isRunning = true;
    console.log('🚀 Starting warmup service...');

    // Start the warmup loop
    await this.runWarmupCycle(config);
  }

  async stopWarmup() {
    if (!this.isRunning) {
      throw new Error('Warmup is not running');
    }

    this.isRunning = false;
    if (this.jobInterval) {
      clearTimeout(this.jobInterval);
      this.jobInterval = null;
    }
    console.log('⏸️ Warmup service stopped');
  }

  getStatus() {
    return { running: this.isRunning };
  }

  private async runWarmupCycle(config: WarmupConfig) {
    while (this.isRunning) {
      try {
        await this.sendWarmupEmail(config);
        
        // Wait 5 minutes before next send
        const delayMs = (config.minDelayMinutes || 5) * 60 * 1000;
        console.log(`⏳ Waiting ${delayMs / 1000 / 60} minutes before next send...`);
        
        await this.sleep(delayMs);
      } catch (error) {
        console.error('❌ Error in warmup cycle:', error);
        await this.logAction('ERROR', 'system', 'system', 'Warmup Error', 'FAILED', (error as Error).message);
        
        // Wait a bit before retrying
        await this.sleep(60000); // 1 minute
      }
    }
  }

  private async sendWarmupEmail(config: WarmupConfig) {
    // 1. Randomly select sender, recipient, and template
    const sender = await this.getRandomAccount();
    const recipient = await this.getRandomRecipient();
    const template = await this.getRandomTemplate();

    if (!sender || !recipient || !template) {
      console.log('⚠️ Missing data: sender, recipient, or template not found');
      return;
    }

    console.log(`📧 Sending from ${sender.email} to ${recipient.email}`);

    try {
      // 2. Send email via SMTP
      const transporter = nodemailer.createTransport({
        host: sender.smtpHost,
        port: sender.smtpPort,
        secure: sender.smtpPort === 465,
        auth: {
          user: sender.email,
          pass: sender.appPassword,
        },
      });

      const mailOptions = {
        from: sender.senderName ? `${sender.senderName} <${sender.email}>` : sender.email,
        to: recipient.email,
        subject: template.subject,
        text: template.body,
        html: `<p>${template.body.replace(/\n/g, '<br>')}</p>`,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully`);

      // Log the send action
      await this.logAction(
        new Date(),
        sender.email,
        recipient.email,
        template.subject,
        'SENT',
        'Email sent via SMTP'
      );

      // 3. Check inbox and auto-reply if enabled
      if (config.autoReply !== false) {
        await this.checkInboxAndReply(sender, recipient, template.subject);
      }

    } catch (error) {
      console.error('❌ Error sending email:', error);
      await this.logAction(
        new Date(),
        sender.email,
        recipient.email,
        template.subject,
        'FAILED',
        `Send error: ${(error as Error).message}`
      );
    }
  }

  private async checkInboxAndReply(sender: any, recipient: any, originalSubject: string) {
    try {
      console.log(`📬 Checking inbox for ${sender.email}...`);

      const imapConfig = {
        imap: {
          user: sender.email,
          password: sender.appPassword,
          host: sender.imapHost,
          port: sender.imapPort,
          tls: true,
          tlsOptions: { rejectUnauthorized: false },
          authTimeout: 10000,
        },
      };

      const connection = await imaps.connect(imapConfig);
      await connection.openBox('INBOX');

      // Search for recent emails from the recipient
      const searchCriteria = ['UNSEEN', ['FROM', recipient.email]];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT'],
        markSeen: true,
      };

      const messages = await connection.search(searchCriteria, fetchOptions);

      if (messages.length > 0) {
        console.log(`📨 Found ${messages.length} unread message(s) from ${recipient.email}`);

        // Auto-reply to the first message
        const message = messages[0];
        const replySubject = `Re: ${originalSubject}`;
        const replyBody = this.getRandomReply();

        // Send auto-reply
        const transporter = nodemailer.createTransport({
          host: sender.smtpHost,
          port: sender.smtpPort,
          secure: sender.smtpPort === 465,
          auth: {
            user: sender.email,
            pass: sender.appPassword,
          },
        });

        await transporter.sendMail({
          from: sender.senderName ? `${sender.senderName} <${sender.email}>` : sender.email,
          to: recipient.email,
          subject: replySubject,
          text: replyBody,
          html: `<p>${replyBody}</p>`,
        });

        console.log(`✅ Auto-reply sent: "${replyBody}"`);

        await this.logAction(
          new Date(),
          sender.email,
          recipient.email,
          replySubject,
          'REPLIED',
          `Auto-reply: ${replyBody}`
        );
      } else {
        console.log(`ℹ️ No unread messages found from ${recipient.email}`);
      }

      connection.end();
    } catch (error) {
      console.error('❌ Error checking inbox:', error);
      // Don't throw - just log the error
      await this.logAction(
        new Date(),
        sender.email,
        recipient.email,
        'Inbox Check',
        'FAILED',
        `IMAP error: ${(error as Error).message}`
      );
    }
  }

  private async getRandomAccount() {
    const accounts = await prisma.account.findMany();
    if (accounts.length === 0) return null;
    return accounts[Math.floor(Math.random() * accounts.length)];
  }

  private async getRandomRecipient() {
    const recipients = await prisma.recipient.findMany();
    if (recipients.length === 0) return null;
    return recipients[Math.floor(Math.random() * recipients.length)];
  }

  private async getRandomTemplate() {
    const templates = await prisma.template.findMany();
    if (templates.length === 0) return null;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private getRandomReply(): string {
    return AUTO_REPLY_TEMPLATES[Math.floor(Math.random() * AUTO_REPLY_TEMPLATES.length)];
  }

  private async logAction(
    timestamp: Date | string,
    sender: string,
    recipient: string,
    subject: string,
    status: string,
    notes: string
  ) {
    try {
      await prisma.log.create({
        data: {
          timestamp: typeof timestamp === 'string' ? new Date() : timestamp,
          sender,
          recipient,
          subject,
          status,
          notes,
        },
      });
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const warmupService = new WarmupService();
