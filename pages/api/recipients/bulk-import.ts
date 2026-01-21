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

    let recipients: Array<{ email: string }> = [];

    if (format === 'csv') {
      const parsed = Papa.parse<{ email: string }>(data, { header: true });
      recipients = parsed.data.filter((row) => row.email);
    } else if (format === 'json') {
      recipients = JSON.parse(data);
    } else {
      return res.status(400).json({ error: 'Invalid format. Use csv or json' });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No valid recipients found in data' });
    }

    // Bulk insert with upsert
    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        prisma.recipient.upsert({
          where: { email: recipient.email },
          update: {},
          create: recipient,
        })
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return res.status(200).json({
      success: true,
      message: `Imported ${successful} recipients successfully`,
      stats: {
        total: recipients.length,
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
