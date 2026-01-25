import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';
import { testMailboxConnection } from '../../../lib/connection-validator';
import { checkPlanLimits } from '../../../lib/warmup-utils';

async function handler(req: NextApiRequest, res: NextApiResponse, user: any) {
  if (req.method === 'GET') {
    try {
      const accounts = await prisma.account.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      // Get logs statistics for each account
      const mailboxes = await Promise.all(accounts.map(async (account) => {
        const logs = await prisma.log.findMany({
          where: { senderId: account.id },
          select: { status: true },
        });

        const totalSent = logs.filter(log => log.status === 'SENT' || log.status === 'REPLIED').length;
        const totalFailed = logs.filter(log => log.status === 'FAILED').length;
        const totalReplied = logs.filter(log => log.status === 'REPLIED').length;
        
        // Calculate deliverability: (successful / total) * 100
        const totalAttempts = totalSent + totalFailed;
        const deliverability = totalAttempts > 0 
          ? Math.round((totalSent / totalAttempts) * 100) 
          : 0;

        // Calculate reply rate
        const replyRate = totalSent > 0 
          ? Math.round((totalReplied / totalSent) * 100)
          : 0;

        return {
          id: account.id,
          email: account.email,
          senderName: account.senderName,
          smtpHost: account.smtpHost,
          smtpPort: account.smtpPort,
          imapHost: account.imapHost,
          imapPort: account.imapPort,
          warmupEnabled: account.warmupEnabled,
          warmupStartDate: account.warmupStartDate,
          warmupMaxDaily: account.warmupMaxDaily,
          dailyWarmupQuota: account.dailyWarmupQuota,
          warmupStartCount: account.warmupStartCount,
          warmupIncreaseBy: account.warmupIncreaseBy,
          warmupReplyRate: account.warmupReplyRate,
          status: 'connected',
          deliverability,
          replyRate,
          totalSent,
          totalFailed,
          emailsSent: totalSent,
          totalReceived: 0, // TODO: Get from logs
          totalReplied: totalReplied,
          inbox: 0, // TODO: Calculate from logs
          spam: 0, // TODO: Calculate from logs
          others: 0, // TODO: Calculate from logs
          undelivered: totalFailed,
        };
      }));

      res.status(200).json(mailboxes);
    } catch (error) {
      console.error('Error fetching mailboxes:', error);
      res.status(500).json({ error: 'Failed to fetch mailboxes' });
    }
  } else if (req.method === 'POST') {
    try {
      const { email, senderName, appPassword, smtpHost, smtpPort, imapHost, imapPort, dailyWarmupQuota = 2 } = req.body;

      // Validation
      if (!email || !appPassword || !smtpHost || !imapHost) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Port validation
      const parsedSmtpPort = parseInt(smtpPort) || 587;
      const parsedImapPort = parseInt(imapPort) || 993;

      if (parsedSmtpPort < 1 || parsedSmtpPort > 65535) {
        return res.status(400).json({ error: 'Invalid SMTP port' });
      }

      if (parsedImapPort < 1 || parsedImapPort > 65535) {
        return res.status(400).json({ error: 'Invalid IMAP port' });
      }

      // Verify user exists in database first
      const userExists = await prisma.user.findUnique({
        where: { id: user.id },
        include: { plan: true },
      });

      if (!userExists) {
        console.error(`User ${user.id} (${user.email}) not found in database`);
        return res.status(400).json({ 
          error: 'User account not properly initialized. Please log out and log in again.' 
        });
      }

      // Check plan limits before adding new mailbox
      if (userExists.plan) {
        const mailboxCount = await prisma.account.count({
          where: { userId: user.id },
        });

        const limitCheck = checkPlanLimits(
          { mailboxCount, dailyEmailsSent: 0, monthlyEmailsSent: 0 },
          {
            mailboxLimit: userExists.plan.mailboxLimit || 999,
            dailyEmailLimit: userExists.plan.dailyEmailLimit || 9999,
            monthlyEmailLimit: userExists.plan.monthlyEmailLimit || 99999,
          }
        );

        if (limitCheck.mailboxLimitExceeded) {
          return res.status(403).json({ 
            error: limitCheck.message || 'Mailbox limit reached for your plan',
            limit: userExists.plan.mailboxLimit,
            current: mailboxCount,
          });
        }
      }

      // Check if email already exists
      const existing = await prisma.account.findUnique({
        where: { email },
      });

      if (existing && existing.userId !== user.id) {
        return res.status(400).json({ error: 'Email already registered to another user' });
      }

      // Test connection before saving
      console.log(`Testing connection for ${email}...`);
      const connectionTest = await testMailboxConnection(
        email,
        appPassword,
        smtpHost,
        parsedSmtpPort,
        imapHost,
        parsedImapPort
      );

      if (!connectionTest.success) {
        console.log(`Connection test failed for ${email}:`, connectionTest.error);
        return res.status(400).json({ 
          error: 'Connection validation failed: ' + connectionTest.error,
          details: {
            smtp: connectionTest.smtp,
            imap: connectionTest.imap
          }
        });
      }

      console.log(`Connection test successful for ${email}`);

      // Create or update account
      const account = await prisma.account.upsert({
        where: { email },
        update: {
          userId: user.id,
          senderName: senderName || null,
          appPassword,
          smtpHost,
          smtpPort: parsedSmtpPort,
          imapHost,
          imapPort: parsedImapPort,
          dailyWarmupQuota: dailyWarmupQuota || 2,
        },
        create: {
          userId: user.id,
          email,
          senderName: senderName || null,
          appPassword,
          smtpHost,
          smtpPort: parsedSmtpPort,
          imapHost,
          imapPort: parsedImapPort,
          dailyWarmupQuota: dailyWarmupQuota || 2,
        },
      });

      res.status(201).json(account);
    } catch (error: any) {
      console.error('Error creating mailbox:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      if (error.code === 'P2003') {
        return res.status(400).json({ 
          error: 'User account error. Please log out and log in again to refresh your session.' 
        });
      }
      res.status(500).json({ error: 'Failed to create mailbox' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Mailbox ID is required' });
      }

      // Verify ownership
      const account = await prisma.account.findUnique({
        where: { id: parseInt(id as string) },
      });

      if (!account) {
        return res.status(404).json({ error: 'Mailbox not found' });
      }

      if (account.userId !== user.id) {
        return res.status(403).json({ error: 'Not authorized to delete this mailbox' });
      }

      await prisma.account.delete({
        where: { id: parseInt(id as string) },
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting mailbox:', error);
      res.status(500).json({ error: 'Failed to delete mailbox' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { 
        id, 
        warmupEnabled,
        warmupStartCount,
        warmupIncreaseBy,
        warmupMaxDaily,
        warmupReplyRate,
        dailyWarmupQuota 
      } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Mailbox ID is required' });
      }

      // Verify ownership
      const account = await prisma.account.findUnique({
        where: { id: parseInt(id) },
      });

      if (!account) {
        return res.status(404).json({ error: 'Mailbox not found' });
      }

      if (account.userId !== user.id) {
        return res.status(403).json({ error: 'Not authorized to update this mailbox' });
      }

      // Build update data with validation
      const updateData: any = {};

      if (warmupEnabled !== undefined) {
        updateData.warmupEnabled = Boolean(warmupEnabled);
        // Set start date when enabling warmup
        if (warmupEnabled && !account.warmupStartDate) {
          updateData.warmupStartDate = new Date();
        }
      }

      if (warmupStartCount !== undefined) {
        const start = parseInt(warmupStartCount);
        if (start < 1 || start > 100) {
          return res.status(400).json({ error: 'Start count must be between 1 and 100' });
        }
        updateData.warmupStartCount = start;
      }

      if (warmupIncreaseBy !== undefined) {
        const increase = parseInt(warmupIncreaseBy);
        if (increase < 0 || increase > 50) {
          return res.status(400).json({ error: 'Increase must be between 0 and 50' });
        }
        updateData.warmupIncreaseBy = increase;
      }

      if (warmupMaxDaily !== undefined) {
        const max = parseInt(warmupMaxDaily);
        // 0 or -1 means unlimited
        if (max !== 0 && max !== -1 && (max < 1 || max > 1000)) {
          return res.status(400).json({ error: 'Max daily must be between 1-1000, or 0/-1 for unlimited' });
        }
        updateData.warmupMaxDaily = max;
      }

      if (warmupReplyRate !== undefined) {
        const rate = parseInt(warmupReplyRate);
        if (rate < 0 || rate > 100) {
          return res.status(400).json({ error: 'Reply rate must be between 0 and 100' });
        }
        updateData.warmupReplyRate = rate;
      }

      if (dailyWarmupQuota !== undefined) {
        const quota = parseInt(dailyWarmupQuota);
        if (quota < 1 || quota > 1000) {
          return res.status(400).json({ error: 'Daily quota must be between 1 and 1000' });
        }
        updateData.dailyWarmupQuota = quota;
      }

      // Update mailbox
      const updated = await prisma.account.update({
        where: { id: parseInt(id) },
        data: updateData,
      });

      res.status(200).json(updated);
    } catch (error) {
      console.error('Error updating mailbox:', error);
      res.status(500).json({ error: 'Failed to update mailbox' });
    }
  } else if (req.method === 'PATCH') {
    // Bulk update endpoint
    try {
      const { 
        mailboxIds, 
        warmupEnabled,
        warmupStartCount,
        warmupIncreaseBy,
        warmupMaxDaily,
        warmupReplyRate,
        dailyWarmupQuota,
      } = req.body;

      if (!mailboxIds || !Array.isArray(mailboxIds) || mailboxIds.length === 0) {
        return res.status(400).json({ error: 'Mailbox IDs array is required' });
      }

      // Verify ownership of all mailboxes
      const accounts = await prisma.account.findMany({
        where: {
          id: { in: mailboxIds.map((id: any) => parseInt(id)) },
          userId: user.id,
        },
      });

      if (accounts.length !== mailboxIds.length) {
        return res.status(403).json({ error: 'Not authorized to update some mailboxes' });
      }

      // Build update data
      const updateData: any = {};

      if (warmupEnabled !== undefined) {
        updateData.warmupEnabled = Boolean(warmupEnabled);
      }

      if (warmupStartCount !== undefined) {
        const start = parseInt(warmupStartCount);
        if (start < 1 || start > 100) {
          return res.status(400).json({ error: 'Start count must be between 1 and 100' });
        }
        updateData.warmupStartCount = start;
      }

      if (warmupIncreaseBy !== undefined) {
        const increase = parseInt(warmupIncreaseBy);
        if (increase < 0 || increase > 50) {
          return res.status(400).json({ error: 'Increase must be between 0 and 50' });
        }
        updateData.warmupIncreaseBy = increase;
      }

      if (warmupMaxDaily !== undefined) {
        const max = parseInt(warmupMaxDaily);
        if (max !== 0 && max !== -1 && (max < 1 || max > 1000)) {
          return res.status(400).json({ error: 'Max daily must be between 1-1000, or 0/-1 for unlimited' });
        }
        updateData.warmupMaxDaily = max;
      }

      if (warmupReplyRate !== undefined) {
        const rate = parseInt(warmupReplyRate);
        if (rate < 0 || rate > 100) {
          return res.status(400).json({ error: 'Reply rate must be between 0 and 100' });
        }
        updateData.warmupReplyRate = rate;
      }

      if (dailyWarmupQuota !== undefined) {
        const quota = parseInt(dailyWarmupQuota);
        if (quota < 0 || quota > 1000) {
          return res.status(400).json({ error: 'Daily quota must be between 0 and 1000' });
        }
        updateData.dailyWarmupQuota = quota;
      }

      // Bulk update
      const result = await prisma.account.updateMany({
        where: {
          id: { in: mailboxIds.map((id: any) => parseInt(id)) },
          userId: user.id,
        },
        data: updateData,
      });

      res.status(200).json({ 
        success: true, 
        updated: result.count,
        settings: updateData 
      });
    } catch (error) {
      console.error('Error bulk updating mailboxes:', error);
      res.status(500).json({ error: 'Failed to bulk update mailboxes' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler);
