import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAdmin } from '../../../lib/api-auth';
import prisma from '../../../lib/prisma';
import Papa from 'papaparse';
import { testMailboxConnection } from '../../../lib/connection-validator';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

interface MailboxRow {
  email: string;
  appPassword: string;
  senderName?: string;
  smtpHost?: string;
  smtpPort?: string | number;
  imapHost?: string;
  imapPort?: string | number;
}

/**
 * Admin bulk import - adds mailboxes to the pool (without user assignment)
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, format } = req.body;

    if (!data || !format) {
      return res.status(400).json({ error: 'Data and format are required' });
    }

    let accounts: MailboxRow[] = [];
    const errors: string[] = [];

    // Parse CSV data
    if (format === 'csv') {
      const parsed = Papa.parse<Record<string, string>>(data, { 
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        return res.status(400).json({ 
          error: 'CSV parsing failed: ' + parsed.errors[0].message 
        });
      }

      accounts = parsed.data
        .filter((row) => row.email && row.appPassword)
        .map(row => ({
          email: row.email?.trim(),
          appPassword: row.appPassword?.trim(),
          senderName: row.senderName?.trim(),
          smtpHost: row.smtpHost?.trim() || 'smtp.gmail.com',
          smtpPort: row.smtpPort ? parseInt(row.smtpPort) : 587,
          imapHost: row.imapHost?.trim() || 'imap.gmail.com',
          imapPort: row.imapPort ? parseInt(row.imapPort) : 993,
        }));
    } else if (format === 'json') {
      try {
        const parsed = JSON.parse(data);
        accounts = parsed.map((acc: any) => ({
          email: acc.email?.trim(),
          appPassword: acc.appPassword?.trim(),
          senderName: acc.senderName?.trim(),
          smtpHost: acc.smtpHost?.trim() || 'smtp.gmail.com',
          smtpPort: acc.smtpPort || 587,
          imapHost: acc.imapHost?.trim() || 'imap.gmail.com',
          imapPort: acc.imapPort || 993,
        }));
      } catch (parseError) {
        return res.status(400).json({ error: 'Invalid JSON format' });
      }
    } else {
      return res.status(400).json({ error: 'Invalid format. Use csv or json' });
    }

    if (accounts.length === 0) {
      return res.status(400).json({ error: 'No valid accounts found in data' });
    }

    // Validate and import accounts
    const results: { email: string; success: boolean; error?: string }[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const account of accounts) {
      // Validate email format
      if (!emailRegex.test(account.email)) {
        results.push({ email: account.email, success: false, error: 'Invalid email format' });
        errors.push(`${account.email}: Invalid email format`);
        continue;
      }

      // Validate app password
      if (!account.appPassword || account.appPassword.length < 8) {
        results.push({ email: account.email, success: false, error: 'App password too short' });
        errors.push(`${account.email}: App password must be at least 8 characters`);
        continue;
      }

      // Validate ports
      const smtpPort = typeof account.smtpPort === 'string' 
        ? parseInt(account.smtpPort) 
        : account.smtpPort || 587;
      const imapPort = typeof account.imapPort === 'string' 
        ? parseInt(account.imapPort) 
        : account.imapPort || 993;

      if (smtpPort < 1 || smtpPort > 65535 || imapPort < 1 || imapPort > 65535) {
        results.push({ email: account.email, success: false, error: 'Invalid port number' });
        errors.push(`${account.email}: Invalid port number`);
        continue;
      }

      // Test connection before saving
      try {
        console.log(`Testing connection for ${account.email}...`);
        const connectionTest = await testMailboxConnection(
          account.email,
          account.appPassword,
          account.smtpHost || 'smtp.gmail.com',
          smtpPort,
          account.imapHost || 'imap.gmail.com',
          imapPort
        );

        if (!connectionTest.success) {
          results.push({ 
            email: account.email, 
            success: false, 
            error: `Connection test failed: ${connectionTest.error}` 
          });
          errors.push(`${account.email}: ${connectionTest.error}`);
          continue;
        }

        console.log(`Connection test successful for ${account.email}`);
      } catch (testError: any) {
        results.push({ 
          email: account.email, 
          success: false, 
          error: `Connection test error: ${testError.message}` 
        });
        errors.push(`${account.email}: Connection test error - ${testError.message}`);
        continue;
      }

      try {
        // Upsert the account (admin pool - no userId)
        await prisma.account.upsert({
          where: { email: account.email },
          update: {
            appPassword: account.appPassword,
            senderName: account.senderName || null,
            smtpHost: account.smtpHost || 'smtp.gmail.com',
            smtpPort: smtpPort,
            imapHost: account.imapHost || 'imap.gmail.com',
            imapPort: imapPort,
            // Don't change userId if exists - preserve user ownership
          },
          create: {
            email: account.email,
            appPassword: account.appPassword,
            senderName: account.senderName || null,
            smtpHost: account.smtpHost || 'smtp.gmail.com',
            smtpPort: smtpPort,
            imapHost: account.imapHost || 'imap.gmail.com',
            imapPort: imapPort,
            // No userId - goes into admin pool
          },
        });

        results.push({ email: account.email, success: true });
      } catch (dbError: any) {
        results.push({ email: account.email, success: false, error: dbError.message });
        errors.push(`${account.email}: ${dbError.message}`);
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return res.status(200).json({
      success: true,
      message: `Imported ${successful} accounts to pool`,
      stats: {
        total: accounts.length,
        successful,
        failed,
      },
      results,
      errors,
    });
  } catch (error: any) {
    console.error('Admin bulk import error:', error);
    return res.status(500).json({
      error: error.message || 'Bulk import failed',
    });
  }
}

export default requireAdmin(handler);
