import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get total counts
    const [
      totalAccounts,
      totalUsers,
      sendTemplates,
      replyTemplates,
      logs,
      logsToday,
    ] = await Promise.all([
      prisma.account.count(),
      prisma.user.count(),
      prisma.sendTemplate.count(),
      prisma.replyTemplate.count(),
      prisma.log.findMany({
        select: {
          status: true,
        },
      }),
      prisma.log.count({
        where: {
          timestamp: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      }),
    ]);

    // Calculate stats from logs
    const totalSent = logs.filter((log) => log.status === 'SENT' || log.status === 'REPLIED').length;
    const totalReplies = logs.filter((log) => log.status === 'REPLIED').length;
    const failures = logs.filter((log) => log.status === 'FAILED').length;
    const replyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0;

    const stats = {
      totalAccounts,
      totalMailboxes: totalAccounts, // Alias for backwards compat
      totalUsers,
      sendTemplates,
      replyTemplates,
      totalSent,
      totalReplies,
      replyRate,
      failures,
      logsToday,
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

export default requireAdmin(handler);
