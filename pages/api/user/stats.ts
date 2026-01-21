import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    // Get user's account IDs
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const accountIds = accounts.map((a) => a.id);

    // Get logs for user's accounts
    const logs = await prisma.log.findMany({
      where: {
        OR: [
          { senderId: { in: accountIds } },
          { recipientId: { in: accountIds } },
        ],
      },
      select: { status: true },
    });

    // Calculate stats
    const totalSent = logs.filter((log) => log.status === 'SENT' || log.status === 'REPLIED').length;
    const totalReplies = logs.filter((log) => log.status === 'REPLIED').length;
    const failures = logs.filter((log) => log.status === 'FAILED').length;
    const replyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0;

    res.status(200).json({
      totalSent,
      totalReplies,
      replyRate,
      failures,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

export default requireAuth(handler);
