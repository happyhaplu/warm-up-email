import { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const templates = await prisma.sendTemplate.findMany({
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json(templates);
    } catch (error) {
      console.error('Error fetching send templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  } else if (req.method === 'POST') {
    try {
      const { subject, body } = req.body;

      if (!subject || !body) {
        return res.status(400).json({ error: 'Subject and body are required' });
      }

      const template = await prisma.sendTemplate.create({
        data: { subject, body },
      });

      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating send template:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const { subject, body } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Template ID is required' });
      }

      if (!subject || !body) {
        return res.status(400).json({ error: 'Subject and body are required' });
      }

      const template = await prisma.sendTemplate.update({
        where: { id: parseInt(id as string) },
        data: { subject, body },
      });

      res.status(200).json(template);
    } catch (error) {
      console.error('Error updating send template:', error);
      res.status(500).json({ error: 'Failed to update template' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Template ID is required' });
      }

      await prisma.sendTemplate.delete({
        where: { id: parseInt(id as string) },
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting send template:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAdmin(handler);
