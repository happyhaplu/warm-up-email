/**
 * Quota Status API
 * Get per-mailbox quota information
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { warmupEngine } from '@/lib/warmup-engine';
import { requireAuth, type ApiAuthUser } from '@/lib/api-auth';

async function handler(req: NextApiRequest, res: NextApiResponse, user: ApiAuthUser) {
  try {
    const { method } = req;

    switch (method) {
      case 'GET':
        return await getQuotaStatus(req, res, user);
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in quota status API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);

/**
 * GET /api/warmup/quota?status=all|behind|complete
 * Get quota status for all mailboxes
 */
async function getQuotaStatus(req: NextApiRequest, res: NextApiResponse, user: ApiAuthUser) {
  const { status: statusFilter } = req.query;
  
  const metrics = warmupEngine.getMetrics();
  let quotaStatuses = await metrics.getQuotaStatus();

  // Filter by status if requested
  if (statusFilter && statusFilter !== 'all') {
    quotaStatuses = quotaStatuses.filter((q: any) => q.status === statusFilter);
  }

  res.status(200).json({
    success: true,
    data: {
      total: quotaStatuses.length,
      quotas: quotaStatuses,
    },
    timestamp: new Date().toISOString(),
  });
}
