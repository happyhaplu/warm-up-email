import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';
import { validateWarmupSettings } from '../../../lib/warmup-config';

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

    // Validate values using centralized config
    const validation = validateWarmupSettings({
      warmupStartCount,
      warmupIncreaseBy,
      warmupMaxDaily,
      warmupReplyRate,
    });

    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid warmup settings', 
        details: validation.errors 
      });
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
