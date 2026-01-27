/**
 * Warmup Control API
 * Start, stop, and trigger warmup operations
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { warmupCron } from '@/lib/warmup-cron-v3';
import { requireAdmin, type ApiAuthUser } from '@/lib/api-auth';

async function handler(req: NextApiRequest, res: NextApiResponse, user: ApiAuthUser) {
  try {
    const { method } = req;

    switch (method) {
      case 'POST':
        return await controlWarmup(req, res, user);
      case 'GET':
        return await getStatus(req, res, user);
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error in warmup control API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAdmin(handler);

/**
 * GET /api/warmup/control
 * Get current warmup service status
 */
async function getStatus(req: NextApiRequest, res: NextApiResponse, user: ApiAuthUser) {
  const status = warmupCron.getStatus();
  
  res.status(200).json({
    success: true,
    data: status,
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/warmup/control
 * Control warmup service (start, stop, trigger)
 * Body: { action: 'start' | 'stop' | 'trigger' }
 */
async function controlWarmup(req: NextApiRequest, res: NextApiResponse, user: ApiAuthUser) {
  const { action } = req.body;

  if (!action || !['start', 'stop', 'trigger'].includes(action)) {
    return res.status(400).json({ 
      error: 'Invalid action. Must be: start, stop, or trigger' 
    });
  }

  try {
    switch (action) {
      case 'start':
        await warmupCron.start();
        res.status(200).json({ 
          success: true, 
          message: 'Warmup service started',
          data: warmupCron.getStatus(),
        });
        break;

      case 'stop':
        warmupCron.stop();
        res.status(200).json({ 
          success: true, 
          message: 'Warmup service stopped',
          data: warmupCron.getStatus(),
        });
        break;

      case 'trigger':
        // Trigger manual run (async, don't wait)
        warmupCron.triggerManualRun().catch(err => {
          console.error('Error in manual warmup run:', err);
        });
        res.status(200).json({ 
          success: true, 
          message: 'Manual warmup cycle triggered',
        });
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      success: false,
      error: message,
    });
  }
}
