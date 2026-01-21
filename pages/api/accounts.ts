import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        // Get all accounts
        const accounts = await prisma.account.findMany({
          orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(accounts);

      case 'POST':
        // Create new account
        const { 
          email, 
          appPassword, 
          senderName,
          smtpHost = 'smtp.gmail.com',
          smtpPort = 587,
          imapHost = 'imap.gmail.com',
          imapPort = 993,
          dailyWarmupQuota = 2
        } = req.body;
        
        if (!email || !appPassword) {
          return res.status(400).json({ error: 'Email and app password are required' });
        }

        const newAccount = await prisma.account.create({
          data: { 
            email, 
            appPassword,
            senderName,
            smtpHost,
            smtpPort,
            imapHost,
            imapPort,
            dailyWarmupQuota
          }
        });
        return res.status(201).json(newAccount);

      case 'PUT':
        // Update account
        const { id, email: updatedEmail, appPassword: updatedPassword, dailyWarmupQuota: updatedQuota } = req.body;
        
        if (!id) {
          return res.status(400).json({ error: 'Account ID is required' });
        }

        // Validate quota if provided
        if (updatedQuota !== undefined) {
          const quota = parseInt(updatedQuota);
          if (quota < 2 || quota > 5) {
            return res.status(400).json({ error: 'Daily warmup quota must be between 2 and 5' });
          }
        }

        const updatedAccount = await prisma.account.update({
          where: { id: parseInt(id) },
          data: {
            ...(updatedEmail && { email: updatedEmail }),
            ...(updatedPassword && { appPassword: updatedPassword }),
            ...(updatedQuota !== undefined && { dailyWarmupQuota: parseInt(updatedQuota) })
          }
        });
        return res.status(200).json(updatedAccount);

      case 'DELETE':
        // Delete account
        const deleteId = parseInt(req.query.id as string);
        
        if (!deleteId) {
          return res.status(400).json({ error: 'Account ID is required' });
        }

        await prisma.account.delete({
          where: { id: deleteId }
        });
        return res.status(200).json({ message: 'Account deleted successfully' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
}
