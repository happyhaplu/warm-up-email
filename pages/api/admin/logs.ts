import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    if (method === 'GET') {
      // Get all logs with optional filtering
      const logs = await prisma.log.findMany({
        orderBy: { timestamp: 'desc' },
        take: 1000, // Increased limit for global logs
      });

      res.status(200).json(logs);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling logs:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}

export default requireAdmin(handler);
