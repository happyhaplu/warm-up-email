import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { requireAdmin, AuthenticatedRequest } from '../../lib/api-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        // Get all templates
        const templates = await prisma.template.findMany({
          orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(templates);

      case 'POST':
        // Create new template
        const { subject, body } = req.body;
        
        if (!subject || !body) {
          return res.status(400).json({ error: 'Subject and body are required' });
        }

        const newTemplate = await prisma.template.create({
          data: { subject, body }
        });
        return res.status(201).json(newTemplate);

      case 'PUT':
        // Update template
        const { id, subject: updatedSubject, body: updatedBody } = req.body;
        
        if (!id) {
          return res.status(400).json({ error: 'Template ID is required' });
        }

        const updatedTemplate = await prisma.template.update({
          where: { id: parseInt(id) },
          data: {
            ...(updatedSubject && { subject: updatedSubject }),
            ...(updatedBody && { body: updatedBody })
          }
        });
        return res.status(200).json(updatedTemplate);

      case 'DELETE':
        // Delete template
        const deleteId = parseInt(req.query.id as string);
        
        if (!deleteId) {
          return res.status(400).json({ error: 'Template ID is required' });
        }

        await prisma.template.delete({
          where: { id: deleteId }
        });
        return res.status(200).json({ message: 'Template deleted successfully' });

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
