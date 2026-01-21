import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        // Get logs with pagination
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
          prisma.log.findMany({
            orderBy: { timestamp: 'desc' },
            skip,
            take: limit
          }),
          prisma.log.count()
        ]);

        return res.status(200).json({
          logs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        });

      case 'DELETE':
        // Clear all logs (optional)
        await prisma.log.deleteMany({});
        return res.status(200).json({ message: 'All logs cleared successfully' });

      default:
        res.setHeader('Allow', ['GET', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}
