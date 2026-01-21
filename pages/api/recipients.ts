import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { requireAdmin, AuthenticatedRequest } from '../../lib/api-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        // Get all recipients
        const recipients = await prisma.recipient.findMany({
          orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(recipients);

      case 'POST':
        // Create new recipient
        const { email } = req.body;
        
        if (!email) {
          return res.status(400).json({ error: 'Email is required' });
        }

        const newRecipient = await prisma.recipient.create({
          data: { email }
        });
        return res.status(201).json(newRecipient);

      case 'PUT':
        // Update recipient
        const { id, email: updatedEmail } = req.body;
        
        if (!id || !updatedEmail) {
          return res.status(400).json({ error: 'ID and email are required' });
        }

        const updatedRecipient = await prisma.recipient.update({
          where: { id: parseInt(id) },
          data: { email: updatedEmail }
        });
        return res.status(200).json(updatedRecipient);

      case 'DELETE':
        // Delete recipient
        const deleteId = parseInt(req.query.id as string);
        
        if (!deleteId) {
          return res.status(400).json({ error: 'Recipient ID is required' });
        }

        await prisma.recipient.delete({
          where: { id: deleteId }
        });
        return res.status(200).json({ message: 'Recipient deleted successfully' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}

// Export admin-protected handler
export default requireAdmin(handler);
