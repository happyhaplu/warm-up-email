import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse, user: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get mailbox count
    const mailboxCount = await prisma.account.count({
      where: { userId: user.id },
    });

    // Get user's account IDs
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);

    // Get today's start and end
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get this month's start and end
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Count daily emails sent (today)
    const dailyEmailsSent = await prisma.log.count({
      where: {
        senderId: { in: accountIds },
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: ['SENT', 'REPLIED'] },
      },
    });

    // Count monthly emails sent (this month)
    const monthlyEmailsSent = await prisma.log.count({
      where: {
        senderId: { in: accountIds },
        timestamp: {
          gte: monthStart,
          lt: monthEnd,
        },
        status: { in: ['SENT', 'REPLIED'] },
      },
    });

    res.status(200).json({
      mailboxCount,
      dailyEmailsSent,
      monthlyEmailsSent,
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
}

export default requireAuth(handler);
