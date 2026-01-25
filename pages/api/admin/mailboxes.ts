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

      // Build update data with validation
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
    // Admin bulk update endpoint
    try {
      const { 
        mailboxIds, 
        warmupEnabled,
        warmupStartCount,
        warmupIncreaseBy,
        warmupMaxDaily,
        warmupReplyRate,
      } = req.body;

      if (!mailboxIds || !Array.isArray(mailboxIds) || mailboxIds.length === 0) {
        return res.status(400).json({ error: 'Mailbox IDs array is required' });
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

      // Bulk update
      const result = await prisma.account.updateMany({
        where: {
          id: { in: mailboxIds.map((id: any) => parseInt(id)) },
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

export default requireAdmin(handler);
