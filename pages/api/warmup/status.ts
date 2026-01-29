import type { NextApiRequest, NextApiResponse } from 'next';
import { warmupCron } from '../../../lib/warmup-cron-v3';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const status = warmupCron.getStatus();
    
    return res.status(200).json({
      success: true,
      ...status,
    });
  } catch (error: any) {
    console.error('Status API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
