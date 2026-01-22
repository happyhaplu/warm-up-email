import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse, user: any) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { mailboxId, action, warmupMaxDaily } = req.body;

    if (!mailboxId) {
      return res.status(400).json({ error: 'mailboxId is required' });
    }

    // Verify ownership for non-admin users
    if (user.role !== 'admin') {
      const mailbox = await prisma.account.findFirst({
        where: { id: mailboxId, userId: user.id },
      });

      if (!mailbox) {
        return res.status(404).json({ error: 'Mailbox not found or access denied' });
      }
    }

    switch (action) {
      case 'start':
        // Start warmup for this mailbox
        await prisma.account.update({
          where: { id: mailboxId },
          data: {
            warmupEnabled: true,
            warmupStartDate: new Date(),
            warmupMaxDaily: warmupMaxDaily || 20,
          },
        });
        return res.status(200).json({ 
          message: 'Warmup started successfully',
          warmupStartDate: new Date(),
        });

      case 'stop':
        // Stop warmup for this mailbox
        await prisma.account.update({
          where: { id: mailboxId },
          data: {
            warmupEnabled: false,
          },
        });
        return res.status(200).json({ message: 'Warmup stopped successfully' });

      case 'reset':
        // Reset warmup progress
        await prisma.account.update({
          where: { id: mailboxId },
          data: {
            warmupStartDate: new Date(),
            warmupEnabled: true,
          },
        });
        return res.status(200).json({ 
          message: 'Warmup reset successfully',
          warmupStartDate: new Date(),
        });

      case 'updateMax':
        // Update max daily limit (10-20)
        const maxDaily = parseInt(warmupMaxDaily);
        if (isNaN(maxDaily) || maxDaily < 10 || maxDaily > 20) {
          return res.status(400).json({ error: 'warmupMaxDaily must be between 10 and 20' });
        }

        await prisma.account.update({
          where: { id: mailboxId },
          data: { warmupMaxDaily: maxDaily },
        });
        return res.status(200).json({ 
          message: 'Max daily limit updated successfully',
          warmupMaxDaily: maxDaily,
        });

      default:
        return res.status(400).json({ 
          error: 'Invalid action. Use: start, stop, reset, or updateMax' 
        });
    }
  } catch (error) {
    console.error('Error managing warmup:', error);
    return res.status(500).json({ 
      error: 'Failed to manage warmup',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
