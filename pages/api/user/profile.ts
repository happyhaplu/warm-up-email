import { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse, user: any) {
  if (req.method === 'GET') {
    try {
      const profile = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          plan: {
            select: {
              id: true,
              displayName: true,
              description: true,
              mailboxLimit: true,
              dailyEmailLimit: true,
              monthlyEmailLimit: true,
              features: true,
            },
          },
        },
      });

      if (!profile) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { name } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { name: name.trim() },
        include: {
          plan: {
            select: {
              id: true,
              displayName: true,
              description: true,
              mailboxLimit: true,
              dailyEmailLimit: true,
              monthlyEmailLimit: true,
              features: true,
            },
          },
        },
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler);
