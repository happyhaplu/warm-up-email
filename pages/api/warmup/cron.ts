import { NextApiRequest, NextApiResponse } from 'next';
import { warmupCron } from '../../../lib/warmup-cron';
import { requireAdmin } from '../../../lib/api-auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Get cron status
    const status = warmupCron.getStatus();
    return res.status(200).json(status);
  }

  if (req.method === 'POST') {
    const { action } = req.body;

    if (action === 'start') {
      try {
        await warmupCron.start();
        return res.status(200).json({ 
          success: true, 
          message: 'Warmup cron service started',
          status: warmupCron.getStatus()
        });
      } catch (error) {
        return res.status(400).json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to start cron service' 
        });
      }
    }

    if (action === 'stop') {
      warmupCron.stop();
      return res.status(200).json({ 
        success: true, 
        message: 'Warmup cron service stopped',
        status: warmupCron.getStatus()
      });
    }

    return res.status(400).json({ error: 'Invalid action. Use "start" or "stop"' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default requireAdmin(handler);
