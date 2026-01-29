import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';

/**
 * Cleanup old logs (older than 30 days)
 * This keeps the database clean while preserving recent data for monthly reports
 * Note: Logs are needed for quota tracking and deliverability reports
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    if (method === 'POST') {
      // Calculate date 30 days ago (not 3 days - we need data for monthly reports)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      // Delete logs older than 30 days
      const result = await prisma.log.deleteMany({
        where: {
          timestamp: {
            lt: thirtyDaysAgo
          }
        }
      });

      console.log(`✅ Cleaned up ${result.count} logs older than 30 days`);

      res.status(200).json({
        success: true,
        message: `Successfully deleted ${result.count} log(s) older than 30 days`,
        deleted: result.count,
        cutoffDate: thirtyDaysAgo.toISOString()
      });
    } else if (method === 'GET') {
      // Get count of logs that would be deleted
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const count = await prisma.log.count({
        where: {
          timestamp: {
            lt: thirtyDaysAgo
          }
        }
      });

      const total = await prisma.log.count();

      res.status(200).json({
        oldLogs: count,
        totalLogs: total,
        cutoffDate: thirtyDaysAgo.toISOString(),
        willDelete: count
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    res.status(500).json({ error: 'Failed to cleanup logs' });
  }
}

export default requireAdmin(handler);
