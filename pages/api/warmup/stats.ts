import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';
import { getDailyLimit, getDaysSinceStart, getWarmupScheduleInfo } from '../../../lib/warmup-utils';

async function handler(req: NextApiRequest, res: NextApiResponse, user: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all mailboxes for this user (or all if admin)
    const where = user.role === 'admin' ? {} : { userId: user.id };
    const accounts = await prisma.account.findMany({
      where,
      select: {
        id: true,
        email: true,
        dailyWarmupQuota: true,
        senderName: true,
        warmupStartDate: true,
        warmupEnabled: true,
        warmupMaxDaily: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get stats for each mailbox
    const stats = await Promise.all(
      accounts.map(async (account: any) => {
        // Calculate warmup progress
        let dayNumber = 0;
        let dailyLimit = account.dailyWarmupQuota;
        let warmupPhase = 'Not Started';
        
        if (account.warmupStartDate) {
          dayNumber = getDaysSinceStart(account.warmupStartDate);
          dailyLimit = getDailyLimit(dayNumber, account.warmupMaxDaily);
          const scheduleInfo = getWarmupScheduleInfo(dayNumber, account.warmupMaxDaily);
          warmupPhase = scheduleInfo.phase;
        }

        // Get warmup log for today (primary source)
        const warmupLog = await prisma.warmupLog.findUnique({
          where: {
            mailboxId_date: {
              mailboxId: account.id,
              date: today,
            },
          },
        });

        const sentToday = warmupLog?.sentCount || 0;
        const repliesToday = warmupLog?.repliedCount || 0;

        // Get total sent from all warmup logs
        const allWarmupLogs = await prisma.warmupLog.findMany({
          where: { mailboxId: account.id },
          select: { sentCount: true, updatedAt: true },
        });

        const totalSent = allWarmupLogs.reduce((sum, log) => sum + (log.sentCount || 0), 0);
        const lastSent = allWarmupLogs.length > 0 
          ? allWarmupLogs.reduce((latest, log) => 
              log.updatedAt > latest ? log.updatedAt : latest, 
              allWarmupLogs[0].updatedAt
            )
          : null;

        return {
          mailboxId: account.id,
          email: account.email,
          senderName: account.senderName,
          dailyQuota: dailyLimit,
          warmupEnabled: account.warmupEnabled,
          warmupStartDate: account.warmupStartDate,
          warmupDayNumber: dayNumber,
          warmupPhase,
          sentToday,
          repliesToday,
          remaining: Math.max(0, dailyLimit - sentToday),
          totalSent,
          lastSentAt: lastSent || null,
          percentComplete: dailyLimit > 0 ? Math.round((sentToday / dailyLimit) * 100) : 0,
          warmupLog: warmupLog ? {
            dayNumber: warmupLog.dayNumber,
            sentCount: warmupLog.sentCount,
            repliedCount: warmupLog.repliedCount,
            dailyLimit: warmupLog.dailyLimit,
          } : null,
        };
      })
    );

    return res.status(200).json({
      stats,
      summary: {
        totalMailboxes: stats.length,
        totalSentToday: stats.reduce((sum: number, s: any) => sum + s.sentToday, 0),
        totalRemaining: stats.reduce((sum: number, s: any) => sum + s.remaining, 0),
        mailboxesComplete: stats.filter((s: any) => s.remaining === 0).length,
      },
    });
  } catch (error) {
    console.error('Error fetching warmup stats:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch warmup statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
