/**
 * API Endpoint: Get Auto-Scaler Status
 * GET /api/auto-scaler/status
 * 
 * Returns current auto-scaling status and metrics
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { autoScaler } from '../../../lib/auto-scaler';
import { AutoScalerConfig } from '../../../lib/auto-scaler-config';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const status = await autoScaler.getStatus();

    return res.status(200).json({
      ...status,
      config: {
        enabled: AutoScalerConfig.ENABLED,
        checkIntervalMs: AutoScalerConfig.CHECK_INTERVAL_MS,
        mailboxesPerWorker: AutoScalerConfig.MAILBOXES_PER_WORKER,
        minWorkers: AutoScalerConfig.MIN_WORKERS,
        maxWorkers: AutoScalerConfig.MAX_WORKERS,
        scaleUpThreshold: AutoScalerConfig.SCALE_UP_THRESHOLD,
        scaleDownThreshold: AutoScalerConfig.SCALE_DOWN_THRESHOLD,
        platform: AutoScalerConfig.PLATFORM,
      },
    });
  } catch (error) {
    console.error('Error getting auto-scaler status:', error);
    return res.status(500).json({
      error: 'Failed to get auto-scaler status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
