/**
 * API Endpoint: Manually Trigger Auto-Scaler
 * POST /api/auto-scaler/trigger
 * 
 * Manually triggers a scaling check (admin only)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { autoScaler } from '../../../lib/auto-scaler';
// TODO: Import correct auth function from api-auth module
// import { verifyAuth } from '../../../lib/api-auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication
  // TODO: Implement proper authentication check
  // const authResult = await verifyAuth(req);
  // if (!authResult.authenticated || authResult.user?.role !== 'admin') {
  //   return res.status(403).json({ error: 'Admin access required' });
  // }

  try {
    console.log('[API] Manual scaling check triggered by admin');
    const decision = await autoScaler.checkAndScale();

    return res.status(200).json({
      success: true,
      decision,
      message: `Scaling check complete: ${decision.action}`,
    });
  } catch (error) {
    console.error('Error triggering auto-scaler:', error);
    return res.status(500).json({
      error: 'Failed to trigger auto-scaler',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
