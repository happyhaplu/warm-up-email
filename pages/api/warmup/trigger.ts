import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin, ApiAuthUser } from '../../../lib/api-auth';
import { warmupCron } from '../../../lib/warmup-cron';

async function handler(req: NextApiRequest, res: NextApiResponse, _user: ApiAuthUser): Promise<void> {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        // Start warmup cron service
        await warmupCron.start();

        res.status(200).json({
          success: true,
          message: 'Warmup cron service started',
          status: warmupCron.getStatus(),
        });
        return;

      case 'DELETE':
        // Stop warmup cron service
        warmupCron.stop();

        res.status(200).json({
          success: true,
          message: 'Warmup cron service stopped',
          status: warmupCron.getStatus(),
        });
        return;

      default:
        res.setHeader('Allow', ['POST', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
        return;
    }
  } catch (error: any) {
    console.error('Warmup API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}

export default requireAdmin(handler);
