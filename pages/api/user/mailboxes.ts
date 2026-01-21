import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';
import { testMailboxConnection } from '../../../lib/connection-validator';

async function handler(req: NextApiRequest, res: NextApiResponse, user: any) {
  if (req.method === 'GET') {
    try {
      const accounts = await prisma.account.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });

      const mailboxes = accounts.map((account) => ({
        id: account.id,
        email: account.email,
        senderName: account.senderName,
        smtpHost: account.smtpHost,
        smtpPort: account.smtpPort,
        imapHost: account.imapHost,
        imapPort: account.imapPort,
        status: 'connected',
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
      });

      if (!userExists) {
        console.error(`User ${user.id} (${user.email}) not found in database`);
        return res.status(400).json({ 
          error: 'User account not properly initialized. Please log out and log in again.' 
        });
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
      const { id, dailyWarmupQuota } = req.body;

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

      // Validate quota if provided
      if (dailyWarmupQuota !== undefined) {
        const quota = parseInt(dailyWarmupQuota);
        if (quota < 2 || quota > 5) {
          return res.status(400).json({ error: 'Daily warmup quota must be between 2 and 5' });
        }
      }

      // Update mailbox
      const updated = await prisma.account.update({
        where: { id: parseInt(id) },
        data: {
          ...(dailyWarmupQuota !== undefined && { dailyWarmupQuota: parseInt(dailyWarmupQuota) }),
        },
      });

      res.status(200).json(updated);
    } catch (error) {
      console.error('Error updating mailbox:', error);
      res.status(500).json({ error: 'Failed to update mailbox' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler);
