#!/usr/bin/env node

/**
 * Gmail Warm-up Automation Service
 * 
 * This service automates Gmail account warm-up by:
 * 1. Reading accounts, recipients, and templates from SQLite database (Prisma)
 * 2. Sending emails via Gmail SMTP (nodemailer)
 * 3. Checking for replies via IMAP
 * 4. Auto-replying to received emails
 * 5. Logging all actions to SQLite database
 * 6. Running on a cron schedule (hourly by default)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const imaps = require('imap-simple');
const cron = require('node-cron');

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 * * * *'; // Every hour
const EMAIL_DELAY_MIN = parseInt(process.env.EMAIL_DELAY_MIN_SECONDS) || 300; // 5 minutes
const EMAIL_DELAY_MAX = parseInt(process.env.EMAIL_DELAY_MAX_SECONDS) || 600; // 10 minutes
const MAX_EMAILS_PER_HOUR = parseInt(process.env.MAX_EMAILS_PER_HOUR) || 10;

// Gmail SMTP/IMAP settings
const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 587;
const IMAP_HOST = 'imap.gmail.com';
const IMAP_PORT = 993;

// Timing control
let emailsSentThisHour = 0;
let hourlyResetTimer = null;

// Reset counter every hour
function resetHourlyCounter() {
  emailsSentThisHour = 0;
  console.log('📊 Hourly email counter reset');
}

// Random delay between emails
function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Sleep function
function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Auto-reply templates
const AUTO_REPLY_SUBJECTS = [
  'Re: {original_subject}',
  'Thanks for reaching out!',
  'Got your message'
];

const AUTO_REPLY_BODIES = [
  'Thanks for your email! I appreciate you reaching out.',
  'Hello! Thanks for your message. I\'ll get back to you soon.',
  'Hi there! I received your email and wanted to acknowledge it.',
  'Thank you for contacting me. I\'ll review your message shortly.',
  'Received your email - thanks for getting in touch!'
];

// ============================================================================
// DATABASE FUNCTIONS
// ============================================================================

async function getAccounts() {
  try {
    const accounts = await prisma.account.findMany();
    console.log(`✓ Loaded ${accounts.length} accounts`);
    return accounts;
  } catch (error) {
    console.error('✗ Error reading accounts:', error.message);
    return [];
  }
}

async function getRecipients() {
  try {
    const recipients = await prisma.recipient.findMany();
    console.log(`✓ Loaded ${recipients.length} recipients`);
    return recipients.map(r => r.email);
  } catch (error) {
    console.error('✗ Error reading recipients:', error.message);
    return [];
  }
}

async function getTemplates() {
  try {
    const templates = await prisma.template.findMany();
    console.log(`✓ Loaded ${templates.length} templates`);
    return templates;
  } catch (error) {
    console.error('✗ Error reading templates:', error.message);
    return [];
  }
}

// ============================================================================
// LOGGING FUNCTION
// ============================================================================

async function logAction(sender, recipient, subject, status, notes = '') {
  try {
    await prisma.log.create({
      data: {
        sender,
        recipient,
        subject,
        status,
        notes: notes || null
      }
    });
    console.log(`  ✓ Logged: ${status} - ${sender} → ${recipient}`);
  } catch (error) {
    console.error('  ✗ Error logging to database:', error.message);
  }
}

// ============================================================================
// EMAIL FUNCTIONS
// ============================================================================

async function sendEmail(senderEmail, appPassword, recipientEmail, subject, body) {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: {
        user: senderEmail,
        pass: appPassword
      }
    });

    // Send email
    await transporter.sendMail({
      from: senderEmail,
      to: recipientEmail,
      subject: subject,
      text: body
    });

    console.log(`  ✓ Email sent: ${senderEmail} → ${recipientEmail}`);
    return { success: true, notes: 'Email sent successfully' };
  } catch (error) {
    const errorMsg = `Failed to send email: ${error.message}`;
    console.error(`  ✗ ${errorMsg}`);
    return { success: false, notes: errorMsg };
  }
}

async function checkInbox(senderEmail, appPassword, limit = 5) {
  try {
    const config = {
      imap: {
        user: senderEmail,
        password: appPassword,
        host: IMAP_HOST,
        port: IMAP_PORT,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 30000
      }
    };

    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    // Search for unseen emails
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = {
      bodies: ['HEADER'],
      markSeen: false
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    
    const emailsData = messages.slice(-limit).map(item => {
      const header = item.parts.find(part => part.which === 'HEADER');
      const from = header.body.from?.[0] || '';
      const subject = header.body.subject?.[0] || '';

      // Extract email from "Name <email@domain.com>" format
      const emailMatch = from.match(/<(.+?)>/) || from.match(/([^\s]+@[^\s]+)/);
      const fromEmail = emailMatch ? emailMatch[1] : from;

      return {
        from: fromEmail.trim(),
        subject: subject.trim()
      };
    });

    connection.end();

    if (emailsData.length > 0) {
      console.log(`  ✓ Found ${emailsData.length} new email(s) in ${senderEmail}`);
    }

    return emailsData;
  } catch (error) {
    console.error(`  ✗ Error checking inbox for ${senderEmail}:`, error.message);
    return [];
  }
}

async function autoReply(senderEmail, appPassword, originalSender, originalSubject) {
  try {
    // Generate random reply
    const replySubject = randomChoice(AUTO_REPLY_SUBJECTS).replace(
      '{original_subject}',
      originalSubject
    );
    const replyBody = randomChoice(AUTO_REPLY_BODIES);

    // Send the reply
    const result = await sendEmail(
      senderEmail,
      appPassword,
      originalSender,
      replySubject,
      replyBody
    );

    if (result.success) {
      console.log(`  ✓ Auto-reply sent: ${senderEmail} → ${originalSender}`);
    }

    return result;
  } catch (error) {
    const errorMsg = `Failed to auto-reply: ${error.message}`;
    console.error(`  ✗ ${errorMsg}`);
    return { success: false, notes: errorMsg };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}


// ============================================================================
// MAIN WARM-UP CYCLE
// ============================================================================

async function warmupCycle() {
  console.log('\n' + '='.repeat(60));
  console.log(`Starting warm-up cycle at ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  try {
    // Check hourly limit
    if (emailsSentThisHour >= MAX_EMAILS_PER_HOUR) {
      console.log(`⚠️  Hourly limit reached (${MAX_EMAILS_PER_HOUR} emails). Skipping cycle.`);
      return;
    }

    // Reload data from database
    console.log('\n🔄 Loading data from database...');
    const accounts = await getAccounts();
    const recipients = await getRecipients();
    const templates = await getTemplates();

    if (accounts.length === 0) {
      console.log('✗ No accounts available. Skipping cycle.');
      return;
    }

    if (recipients.length === 0) {
      console.log('✗ No recipients available. Skipping cycle.');
      return;
    }

    if (templates.length === 0) {
      console.log('✗ No templates available. Skipping cycle.');
      return;
    }

    // Pick random sender, recipient, and template
    const account = randomChoice(accounts);
    const recipient = randomChoice(recipients);
    const template = randomChoice(templates);

    console.log(`\n📧 Sending email:`);
    console.log(`   From: ${account.email}`);
    console.log(`   To: ${recipient}`);
    console.log(`   Subject: ${template.subject}`);

    // Send email
    const sendResult = await sendEmail(
      account.email,
      account.appPassword,
      recipient,
      template.subject,
      template.body
    );

    // Increment counter
    if (sendResult.success) {
      emailsSentThisHour++;
      console.log(`📊 Emails sent this hour: ${emailsSentThisHour}/${MAX_EMAILS_PER_HOUR}`);
    }

    // Log the send action
    const sendStatus = sendResult.success ? 'SUCCESS' : 'FAILED';
    await logAction(
      account.email,
      recipient,
      template.subject,
      sendStatus,
      sendResult.notes
    );

    // Randomized delay before next action
    const delaySeconds = randomDelay(EMAIL_DELAY_MIN, EMAIL_DELAY_MAX);
    console.log(`⏱️  Waiting ${delaySeconds} seconds (${Math.round(delaySeconds/60)} min) before next action...`);
    await sleep(delaySeconds);

    // Check inbox and auto-reply
    console.log(`\n📬 Checking inbox for ${account.email}...`);
    const newEmails = await checkInbox(account.email, account.appPassword);

    for (const emailData of newEmails) {
      console.log(`\n💬 Replying to email from ${emailData.from}...`);

      const replyResult = await autoReply(
        account.email,
        account.appPassword,
        emailData.from,
        emailData.subject
      );

      // Log the auto-reply action
      const replyStatus = replyResult.success ? 'REPLY_SUCCESS' : 'REPLY_FAILED';
      await logAction(
        account.email,
        emailData.from,
        `Re: ${emailData.subject}`,
        replyStatus,
        replyResult.notes
      );

      // Small delay between replies
      if (newEmails.indexOf(emailData) < newEmails.length - 1) {
        const replyDelay = randomDelay(30, 120);
        console.log(`⏱️  Waiting ${replyDelay}s before next reply...`);
        await sleep(replyDelay);
      }
    }

    console.log(`\n✓ Warm-up cycle completed`);
  } catch (error) {
    console.error('✗ Error in warm-up cycle:', error.message);
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('Gmail Warm-up Automation (PostgreSQL + Prisma + Supabase)');
  console.log('='.repeat(60));
  console.log(`⏱️  Email delay: ${EMAIL_DELAY_MIN}-${EMAIL_DELAY_MAX} seconds`);
  console.log(`📊 Max emails per hour: ${MAX_EMAILS_PER_HOUR}`);

  // Test database connection
  try {
    await prisma.$connect();
    console.log('✓ Connected to Supabase PostgreSQL database');
  } catch (error) {
    console.error('✗ Failed to connect to database:', error.message);
    console.error('  Check your DATABASE_URL in .env file');
    process.exit(1);
  }

  // Start hourly counter reset (every hour)
  hourlyResetTimer = setInterval(resetHourlyCounter, 3600000);
  console.log('✓ Hourly counter reset timer started');

  // Initial test cycle
  console.log('\n🚀 Running initial warm-up cycle...');
  await warmupCycle();

  // Schedule cron job
  console.log(`\n⏰ Scheduling cron job: ${CRON_SCHEDULE}`);
  console.log('   Press Ctrl+C to stop\n');

  cron.schedule(CRON_SCHEDULE, async () => {
    await warmupCycle();
  });

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\n\n✓ Warm-up automation stopped by user');
    if (hourlyResetTimer) clearInterval(hourlyResetTimer);
    await prisma.$disconnect();
    process.exit(0);
  });
}

// ============================================================================
// START THE SERVICE
// ============================================================================

if (require.main === module) {
  main().catch(async (error) => {
    console.error('Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
}

module.exports = {
  sendEmail,
  autoReply,
  checkInbox,
  logAction,
  warmupCycle
};
