import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin, ApiAuthUser } from '../../../lib/api-auth';
import { warmupServiceV2 } from '../../../lib/warmup-service-v2';

async function handler(req: NextApiRequest, res: NextApiResponse, _user: ApiAuthUser): Promise<void> {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        // Start warmup
        const { minDelayMinutes, maxDelayMinutes, autoReply } = req.body;
        
        // Start in background (don't await)
        warmupServiceV2.startWarmup({
          minDelayMinutes: minDelayMinutes || 5,
          maxDelayMinutes: maxDelayMinutes || 5,
          autoReply: autoReply !== false,
        }).catch(err => console.error('Warmup error:', err));

        res.status(200).json({
          success: true,
          message: 'Warmup service started',
          status: warmupServiceV2.getStatus(),
        });
        return;

      case 'DELETE':
        // Stop warmup
        await warmupServiceV2.stopWarmup();

        res.status(200).json({
          success: true,
          message: 'Warmup service stopped',
          status: warmupServiceV2.getStatus(),
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
