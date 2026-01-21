import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import Papa from 'papaparse';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, format } = req.body;

    if (!data || !format) {
      return res.status(400).json({ error: 'Data and format are required' });
    }

    let accounts: Array<{ 
      email: string; 
      appPassword: string;
      senderName?: string;
      smtpHost?: string;
      smtpPort?: number;
      imapHost?: string;
      imapPort?: number;
    }> = [];

    if (format === 'csv') {
      const parsed = Papa.parse<{ 
        email: string; 
        appPassword: string;
        senderName?: string;
        smtpHost?: string;
        smtpPort?: string;
        imapHost?: string;
        imapPort?: string;
      }>(data, { header: true });
      accounts = parsed.data
        .filter((row) => row.email && row.appPassword)
        .map(row => ({
          email: row.email,
          appPassword: row.appPassword,
          senderName: row.senderName,
          smtpHost: row.smtpHost || 'smtp.gmail.com',
          smtpPort: row.smtpPort ? parseInt(row.smtpPort) : 587,
          imapHost: row.imapHost || 'imap.gmail.com',
          imapPort: row.imapPort ? parseInt(row.imapPort) : 993,
        }));
    } else if (format === 'json') {
      const parsed = JSON.parse(data);
      accounts = parsed.map((acc: any) => ({
        email: acc.email,
        appPassword: acc.appPassword,
        senderName: acc.senderName,
        smtpHost: acc.smtpHost || 'smtp.gmail.com',
        smtpPort: acc.smtpPort || 587,
        imapHost: acc.imapHost || 'imap.gmail.com',
        imapPort: acc.imapPort || 993,
      }));
    } else {
      return res.status(400).json({ error: 'Invalid format. Use csv or json' });
    }

    if (accounts.length === 0) {
      return res.status(400).json({ error: 'No valid accounts found in data' });
    }

    // Bulk insert with upsert
    const results = await Promise.allSettled(
      accounts.map((account) =>
        prisma.account.upsert({
          where: { email: account.email },
          update: { 
            appPassword: account.appPassword,
            senderName: account.senderName,
            smtpHost: account.smtpHost,
            smtpPort: account.smtpPort,
            imapHost: account.imapHost,
            imapPort: account.imapPort,
          },
          create: {
            email: account.email,
            appPassword: account.appPassword,
            senderName: account.senderName,
            smtpHost: account.smtpHost || 'smtp.gmail.com',
            smtpPort: account.smtpPort || 587,
            imapHost: account.imapHost || 'imap.gmail.com',
            imapPort: account.imapPort || 993,
          },
        })
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return res.status(200).json({
      success: true,
      message: `Imported ${successful} accounts successfully`,
      stats: {
        total: accounts.length,
        successful,
        failed,
      },
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Bulk import failed',
    });
  }
}
