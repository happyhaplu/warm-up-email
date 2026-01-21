import nodemailer from 'nodemailer';
import imaps from 'imap-simple';
import prisma from './prisma';

interface WarmupConfig {
  minDelayMinutes?: number;
  maxDelayMinutes?: number;
  autoReply?: boolean;
}

interface WarmupResult {
  sent: number;
  replied: number;
  failed: number;
}

class WarmupServiceV2 {
  private isRunning = false;
  private jobInterval: NodeJS.Timeout | null = null;
  private lastRun: Date | null = null;
  private currentConfig: WarmupConfig = {};

  async startWarmup(config: WarmupConfig = {}) {
    if (this.isRunning) {
      throw new Error('Warmup is already running');
    }

    this.isRunning = true;
    this.currentConfig = config;
    console.log('🚀 Starting warmup service v2...');

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
    return { 
      running: this.isRunning,
      lastRun: this.lastRun?.toISOString() || null,
      config: this.currentConfig,
    };
  }

  // Run a single warmup cycle (for manual triggers)
  async runSingleCycle(config: WarmupConfig = {}): Promise<WarmupResult> {
    console.log('⚡ Running single warmup cycle...');
    return await this.sendWarmupEmail(config);
  }

  private async runWarmupCycle(config: WarmupConfig) {
    while (this.isRunning) {
      try {
        await this.sendWarmupEmail(config);
        this.lastRun = new Date();
        
        const delayMs = (config.minDelayMinutes || 5) * 60 * 1000;
        console.log(`⏳ Waiting ${delayMs / 1000 / 60} minutes before next send...`);
        
        await this.sleep(delayMs);
      } catch (error) {
        console.error('❌ Error in warmup cycle:', error);
        await this.logAction('ERROR', null, null, 'system', 'system', 'Warmup Error', 'FAILED', (error as Error).message);
        
        await this.sleep(60000);
      }
    }
  }

  private async sendWarmupEmail(config: WarmupConfig): Promise<WarmupResult> {
    const result: WarmupResult = { sent: 0, replied: 0, failed: 0 };

    // 1. Randomly select sender and recipient from account pool
    const sender = await this.getRandomAccount();
    const recipient = await this.getRandomAccount();

    // Make sure sender and recipient are different
    if (!sender || !recipient || sender.id === recipient.id) {
      console.log('⚠️ Unable to select distinct sender and recipient');
      return result;
    }

    // 2. Get random SendTemplate
    const sendTemplate = await this.getRandomSendTemplate();
    if (!sendTemplate) {
      console.log('⚠️ No send templates available');
      return result;
    }

    console.log(`📧 Sending from ${sender.email} to ${recipient.email}`);
    console.log(`📝 Template: "${sendTemplate.subject}"`);

    try {
      // 3. Send email via SMTP
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
        subject: sendTemplate.subject,
        text: sendTemplate.body,
        html: `<p>${sendTemplate.body.replace(/\n/g, '<br>')}</p>`,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully`);
      result.sent = 1;

      // Log the send action
      await this.logAction(
        new Date(),
        sender.id,
        recipient.id,
        sender.email,
        recipient.email,
        sendTemplate.subject,
        'SENT',
        'Email sent via SMTP'
      );

      // 4. Wait a bit then check inbox and auto-reply
      if (config.autoReply !== false) {
        await this.sleep(30000); // Wait 30 seconds
        const replied = await this.checkInboxAndReply(recipient, sender, sendTemplate.subject);
        if (replied) result.replied = 1;
      }

    } catch (error) {
      console.error('❌ Error sending email:', error);
      result.failed = 1;
      await this.logAction(
        new Date(),
        sender.id,
        recipient.id,
        sender.email,
        recipient.email,
        sendTemplate.subject,
        'FAILED',
        `Send error: ${(error as Error).message}`
      );
    }

    return result;
  }

  private async checkInboxAndReply(recipient: any, sender: any, originalSubject: string): Promise<boolean> {
    try {
      console.log(`📬 Checking inbox for ${recipient.email}...`);

      const imapConfig = {
        imap: {
          user: recipient.email,
          password: recipient.appPassword,
          host: recipient.imapHost,
          port: recipient.imapPort,
          tls: true,
          tlsOptions: { rejectUnauthorized: false },
          authTimeout: 10000,
        },
      };

      const connection = await imaps.connect(imapConfig);
      await connection.openBox('INBOX');

      const searchCriteria = ['UNSEEN', ['FROM', sender.email]];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT'],
        markSeen: true,
      };

      const messages = await connection.search(searchCriteria, fetchOptions);

      if (messages.length > 0) {
        console.log(`📨 Found ${messages.length} unread message(s) from ${sender.email}`);

        // Get random ReplyTemplate
        const replyTemplate = await this.getRandomReplyTemplate();
        if (!replyTemplate) {
          console.log('⚠️ No reply templates available');
          connection.end();
          return false;
        }

        const replySubject = `Re: ${originalSubject}`;
        const replyBody = replyTemplate.text;

        // Send auto-reply
        const transporter = nodemailer.createTransport({
          host: recipient.smtpHost,
          port: recipient.smtpPort,
          secure: recipient.smtpPort === 465,
          auth: {
            user: recipient.email,
            pass: recipient.appPassword,
          },
        });

        await transporter.sendMail({
          from: recipient.senderName ? `${recipient.senderName} <${recipient.email}>` : recipient.email,
          to: sender.email,
          subject: replySubject,
          text: replyBody,
          html: `<p>${replyBody}</p>`,
        });

        console.log(`✅ Auto-reply sent: "${replyBody}"`);

        await this.logAction(
          new Date(),
          recipient.id,
          sender.id,
          recipient.email,
          sender.email,
          replySubject,
          'REPLIED',
          `Auto-reply: ${replyBody}`
        );

        connection.end();
        return true;
      } else {
        console.log(`ℹ️ No unread messages found from ${sender.email}`);
      }

      connection.end();
      return false;
    } catch (error) {
      console.error('❌ Error checking inbox:', error);
      await this.logAction(
        new Date(),
        recipient.id,
        sender.id,
        recipient.email,
        sender.email,
        'Inbox Check',
        'FAILED',
        `IMAP error: ${(error as Error).message}`
      );
      return false;
    }
  }

  private async getRandomAccount() {
    const accounts = await prisma.account.findMany();
    if (accounts.length === 0) return null;
    return accounts[Math.floor(Math.random() * accounts.length)];
  }

  private async getRandomSendTemplate() {
    const templates = await prisma.sendTemplate.findMany();
    if (templates.length === 0) return null;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private async getRandomReplyTemplate() {
    const templates = await prisma.replyTemplate.findMany();
    if (templates.length === 0) return null;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private async logAction(
    timestamp: Date | string,
    senderId: number | null,
    recipientId: number | null,
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
          senderId,
          recipientId,
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

export const warmupServiceV2 = new WarmupServiceV2();
