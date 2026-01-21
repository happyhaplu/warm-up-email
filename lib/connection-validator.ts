import nodemailer from 'nodemailer';
import imaps from 'imap-simple';

export interface ConnectionTestResult {
  success: boolean;
  smtp: { success: boolean; message: string };
  imap: { success: boolean; message: string };
  error?: string;
}

/**
 * Test SMTP and IMAP connection credentials
 * Returns result with details about both connections
 */
export async function testMailboxConnection(
  email: string,
  appPassword: string,
  smtpHost: string,
  smtpPort: number,
  imapHost: string,
  imapPort: number
): Promise<ConnectionTestResult> {
  const results = {
    smtp: { success: false, message: '' },
    imap: { success: false, message: '' },
  };

  // Test SMTP connection
  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
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
        port: imapPort,
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

  const overallSuccess = results.smtp.success && results.imap.success;
  const errorMessage = overallSuccess ? undefined : 
    `${results.smtp.success ? '' : results.smtp.message + '. '}${results.imap.success ? '' : results.imap.message}`;

  return {
    success: overallSuccess,
    smtp: results.smtp,
    imap: results.imap,
    error: errorMessage,
  };
}
