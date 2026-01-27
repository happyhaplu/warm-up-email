/**
 * Warmup Metrics & Quota Management API
 * Real-time monitoring and control endpoints
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { warmupEngine } from '@/lib/warmup-engine';
import { warmupCron } from '@/lib/warmup-cron-v3';
import { requireAuth, type ApiAuthUser } from '@/lib/api-auth';

async function handler(req: NextApiRequest, res: NextApiResponse, user: ApiAuthUser) {
  try {
    const { method } = req;

    switch (method) {
      case 'GET':
        return await getMetrics(req, res, user);
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in warmup metrics API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);

/**
 * GET /api/warmup/metrics
 * Get comprehensive warmup system metrics
 */
async function getMetrics(req: NextApiRequest, res: NextApiResponse, user: ApiAuthUser) {
  const { format } = req.query;

  // Support Prometheus format for monitoring systems
  if (format === 'prometheus') {
    const metrics = warmupEngine.getMetrics();
    const prometheusFormat = await metrics.exportPrometheusMetrics();
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(prometheusFormat);
  }

  // Default: JSON format
  const detailedStatus = await warmupCron.getDetailedStatus();
  
  res.status(200).json({
    success: true,
    data: detailedStatus,
    timestamp: new Date().toISOString(),
  });
}
