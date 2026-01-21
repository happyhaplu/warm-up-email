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

    let templates: Array<{ subject: string; body: string }> = [];

    if (format === 'csv') {
      const parsed = Papa.parse<{ subject: string; body: string }>(data, { header: true });
      templates = parsed.data.filter((row) => row.subject && row.body);
    } else if (format === 'json') {
      templates = JSON.parse(data);
    } else {
      return res.status(400).json({ error: 'Invalid format. Use csv or json' });
    }

    if (templates.length === 0) {
      return res.status(400).json({ error: 'No valid templates found in data' });
    }

    // Bulk insert
    const results = await Promise.allSettled(
      templates.map((template) =>
        prisma.template.create({
          data: template,
        })
      )
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return res.status(200).json({
      success: true,
      message: `Imported ${successful} templates successfully`,
      stats: {
        total: templates.length,
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
