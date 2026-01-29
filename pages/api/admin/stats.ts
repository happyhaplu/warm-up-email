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
    ] = await Promise.all([
      prisma.account.count(),
      prisma.user.count(),
      prisma.sendTemplate.count(),
      prisma.replyTemplate.count(),
    ]);

    // Get stats from WarmupLogs (aggregated historical data)
    const allWarmupLogs = await prisma.warmupLog.findMany({
      select: {
        sentCount: true,
        repliedCount: true,
      },
    });

    const totalSent = allWarmupLogs.reduce((sum, log) => sum + (log.sentCount || 0), 0);
    const totalReplies = allWarmupLogs.reduce((sum, log) => sum + (log.repliedCount || 0), 0);
    const replyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0;

    // Get today's activity from real-time logs
    const todayLogs = await prisma.log.findMany({
      where: {
        timestamp: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: { status: true },
    });

    const logsToday = todayLogs.length;
    const failures = todayLogs.filter((log) => log.status === 'FAILED').length;

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
