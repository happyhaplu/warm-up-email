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

    // Get warmup logs for user's accounts (preserved historical data)
    const warmupLogs = await prisma.warmupLog.findMany({
      where: {
        mailboxId: { in: accountIds },
      },
      select: { 
        sentCount: true,
        repliedCount: true,
      },
    });

    // Calculate stats from aggregated warmup logs
    const totalSent = warmupLogs.reduce((sum, log) => sum + (log.sentCount || 0), 0);
    const totalReplies = warmupLogs.reduce((sum, log) => sum + (log.repliedCount || 0), 0);
    const replyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0;

    // Get today's activity from Log table if available
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayLogs = await prisma.log.findMany({
      where: {
        senderId: { in: accountIds },
        timestamp: { gte: today, lt: tomorrow },
      },
      select: { status: true },
    });

    const failures = todayLogs.filter((log) => log.status === 'FAILED').length;

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
