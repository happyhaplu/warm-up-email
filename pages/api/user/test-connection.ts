import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '../../../lib/api-auth';
import nodemailer from 'nodemailer';
import imaps from 'imap-simple';

/**
 * API Route: /api/user/test-connection
 * Test SMTP and IMAP connection before saving mailbox
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, appPassword, smtpHost, smtpPort, imapHost, imapPort } = req.body;

    if (!email || !appPassword || !smtpHost || !imapHost) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    const results = {
      smtp: { success: false, message: '' },
      imap: { success: false, message: '' },
    };

    // Test SMTP connection
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort) || 587,
        secure: smtpPort === 465,
        auth: {
          user: email,
          pass: appPassword,
        },
        connectionTimeout: 10000,
      });

      await transporter.verify();
      results.smtp = { success: true, message: 'SMTP connection successful' };
    } catch (smtpError: any) {
      results.smtp = { 
        success: false, 
        message: `SMTP failed: ${smtpError.message}` 
      };
    }

    // Test IMAP connection
    try {
      const config = {
        imap: {
          user: email,
          password: appPassword,
          host: imapHost,
          port: parseInt(imapPort) || 993,
          tls: true,
          tlsOptions: { rejectUnauthorized: false },
          authTimeout: 10000,
          connTimeout: 10000,
        },
      };

      const connection = await imaps.connect(config);
      await connection.openBox('INBOX');
      connection.end();
      results.imap = { success: true, message: 'IMAP connection successful' };
    } catch (imapError: any) {
      results.imap = { 
        success: false, 
        message: `IMAP failed: ${imapError.message}` 
      };
    }

    // Determine overall success
    const overallSuccess = results.smtp.success && results.imap.success;

    return res.status(200).json({
      success: overallSuccess,
      message: overallSuccess 
        ? 'Both SMTP and IMAP connections successful!' 
        : 'Connection test failed',
      details: results,
      error: overallSuccess ? undefined : 
        `${results.smtp.success ? '' : results.smtp.message + '. '}${results.imap.success ? '' : results.imap.message}`,
    });
  } catch (error: any) {
    console.error('Connection test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Connection test failed',
    });
  }
}

export default requireAuth(handler);
