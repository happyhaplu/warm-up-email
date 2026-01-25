import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    if (req.method === 'GET') {
      // Get user's account IDs
      const accounts = await prisma.account.findMany({
        where: { userId: user.id },
        select: { id: true, email: true },
      });

      const accountIds = accounts.map((a) => a.id);

      // Get limit from query param, default to 1000, max 10000 to ensure all logs are fetched
      const limit = Math.min(parseInt(req.query.limit as string) || 1000, 10000);

      // Get logs for user's accounts
      const logs = await prisma.log.findMany({
        where: {
          OR: [
            { senderId: { in: accountIds } },
            { recipientId: { in: accountIds } },
          ],
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      res.status(200).json(logs);
    } else if (req.method === 'DELETE') {
      // Delete selected logs
      const { logIds } = req.body;

      if (!Array.isArray(logIds) || logIds.length === 0) {
        return res.status(400).json({ error: 'Invalid log IDs' });
      }

      // Get user's account IDs to verify ownership
      const accounts = await prisma.account.findMany({
        where: { userId: user.id },
        select: { id: true },
      });

      const accountIds = accounts.map((a) => a.id);

      // Delete only logs that belong to user's accounts
      const result = await prisma.log.deleteMany({
        where: {
          id: { in: logIds },
          OR: [
            { senderId: { in: accountIds } },
            { recipientId: { in: accountIds } },
          ],
        },
      });

      res.status(200).json({ 
        success: true, 
        deleted: result.count,
        message: `Successfully deleted ${result.count} log(s)` 
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling user logs:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}

export default requireAuth(handler);
