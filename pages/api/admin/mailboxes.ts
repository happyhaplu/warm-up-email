import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Get all accounts with user information
      const accounts = await prisma.account.findMany({
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const mailboxes = accounts.map((account) => ({
        id: account.id,
        email: account.email,
        senderName: account.senderName,
        smtpHost: account.smtpHost,
        smtpPort: account.smtpPort,
        imapHost: account.imapHost,
        imapPort: account.imapPort,
        userId: account.userId,
        userEmail: account.user?.email,
        createdAt: account.createdAt,
      }));

      res.status(200).json(mailboxes);
    } catch (error) {
      console.error('Error fetching mailboxes:', error);
      res.status(500).json({ error: 'Failed to fetch mailboxes' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Mailbox ID is required' });
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

export default requireAdmin(handler);
