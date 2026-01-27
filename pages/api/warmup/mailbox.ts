/**
 * Mailbox Performance API
 * Get detailed performance metrics for individual mailboxes
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { warmupEngine } from '@/lib/warmup-engine';
import { requireAuth, type ApiAuthUser } from '@/lib/api-auth';
import prisma from '@/lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse, user: ApiAuthUser) {
  try {
    const { method } = req;

    switch (method) {
      case 'GET':
        return await getMailboxPerformance(req, res, user);
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in mailbox performance API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);

/**
 * GET /api/warmup/mailbox?id=123
 * GET /api/warmup/mailbox (all mailboxes for current user)
 */
async function getMailboxPerformance(req: NextApiRequest, res: NextApiResponse, user: ApiAuthUser) {
  const { id: mailboxIdParam } = req.query;

  const metrics = warmupEngine.getMetrics();

  // Get specific mailbox or all user's mailboxes
  if (mailboxIdParam) {
    const mailboxId = parseInt(mailboxIdParam as string);
    
    // Verify access
    if (user.role !== 'admin') {
      const mailbox = await prisma.account.findFirst({
        where: {
          id: mailboxId,
          userId: user.id,
        },
      });
      
      if (!mailbox) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const mailboxMetrics = await metrics.getMailboxMetrics(mailboxId);
    const quotaStatus = (await metrics.getQuotaStatus()).find((q: any) => q.mailboxId === mailboxId);

    res.status(200).json({
      success: true,
      data: {
        metrics: mailboxMetrics[0] || null,
        quota: quotaStatus || null,
      },
      timestamp: new Date().toISOString(),
    });
  } else {
    // Get all mailboxes for user
    const userMailboxIds = user.role === 'admin' 
      ? null // Admin sees all
      : (await prisma.account.findMany({
          where: { userId: user.id },
          select: { id: true },
        })).map((m: any) => m.id);

    const allMetrics = await metrics.getMailboxMetrics();
    const allQuotas = await metrics.getQuotaStatus();

    const filteredMetrics = userMailboxIds 
      ? allMetrics.filter((m: any) => userMailboxIds.includes(m.mailboxId))
      : allMetrics;

    const filteredQuotas = userMailboxIds
      ? allQuotas.filter((q: any) => userMailboxIds.includes(q.mailboxId))
      : allQuotas;

    res.status(200).json({
      success: true,
      data: {
        metrics: filteredMetrics,
        quotas: filteredQuotas,
        summary: {
          total: filteredMetrics.length,
          avgFillRate: filteredMetrics.reduce((sum: number, m: any) => sum + m.quotaFillRate, 0) / Math.max(filteredMetrics.length, 1),
        },
      },
      timestamp: new Date().toISOString(),
    });
  }
}
