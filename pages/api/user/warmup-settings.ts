import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse, user: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { mailboxId, warmupStartCount, warmupIncreaseBy, warmupMaxDaily, warmupReplyRate } = req.body;

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

    // Validate values
    if (warmupStartCount < 1 || warmupStartCount > 10) {
      return res.status(400).json({ error: 'Start count must be between 1 and 10' });
    }

    if (warmupIncreaseBy < 1 || warmupIncreaseBy > 5) {
      return res.status(400).json({ error: 'Increase by must be between 1 and 5' });
    }

    if (warmupMaxDaily < 5 || warmupMaxDaily > 20) {
      return res.status(400).json({ error: 'Max daily must be between 5 and 20' });
    }

    if (warmupReplyRate < 25 || warmupReplyRate > 45) {
      return res.status(400).json({ error: 'Reply rate must be between 25 and 45' });
    }

    // Update settings
    await prisma.account.update({
      where: { id: mailboxId },
      data: {
        warmupStartCount,
        warmupIncreaseBy,
        warmupMaxDaily,
        warmupReplyRate,
      },
    });

    return res.status(200).json({ 
      message: 'Warmup settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating warmup settings:', error);
    return res.status(500).json({ 
      error: 'Failed to update warmup settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
