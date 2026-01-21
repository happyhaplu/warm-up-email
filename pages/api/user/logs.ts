import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    // Get user's account IDs
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      select: { id: true, email: true },
    });

    const accountIds = accounts.map((a) => a.id);

    // Get logs for user's accounts
    const logs = await prisma.log.findMany({
      where: {
        OR: [
          { senderId: { in: accountIds } },
          { recipientId: { in: accountIds } },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching user logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
}

export default requireAuth(handler);
