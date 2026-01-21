import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin, ApiAuthUser } from '../../../lib/api-auth';
import { warmupServiceV2 } from '../../../lib/warmup-service-v2';

/**
 * API Route: /api/warmup/send
 * 
 * Run a single warmup cycle
 * 
 * Method: POST
 * Body: {
 *   autoReply?: boolean  // default true
 * }
 */
async function handler(req: NextApiRequest, res: NextApiResponse, _user: ApiAuthUser): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { autoReply = true } = req.body;

    const result = await warmupServiceV2.runSingleCycle({ autoReply });

    res.status(200).json({
      success: true,
      sent: result.sent,
      replied: result.replied,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      error: (error as Error).message || 'Failed to run warmup cycle',
    });
  }
}

export default requireAdmin(handler);
