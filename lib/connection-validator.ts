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
    // Detect provider for optional enhancements
    const isOutlook = smtpHost.toLowerCase().includes('outlook') || 
                      smtpHost.toLowerCase().includes('office365');
    const isYahoo = smtpHost.toLowerCase().includes('yahoo');
    const isZoho = smtpHost.toLowerCase().includes('zoho');
    
    // Universal robust SMTP configuration for ALL providers
    const transportOptions: any = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465 (SSL), false for 587 (STARTTLS)
      auth: {
        user: email,
        pass: appPassword,
      },
      // Extended timeouts for reliability across all providers
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      // Force STARTTLS for port 587 (universal best practice)
      requireTLS: smtpPort === 587,
      // Modern TLS configuration for all providers
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2' // Modern security standard
      },
    };

    // Provider-specific enhancements
    if (isOutlook || isYahoo) {
      // Outlook and Yahoo require explicit LOGIN authentication
      transportOptions.auth.type = 'login';
    }

    const transporter = nodemailer.createTransport(transportOptions);

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
    // Detect provider for optional enhancements
    const isOutlook = imapHost.toLowerCase().includes('outlook') || 
                      imapHost.toLowerCase().includes('office365');
    const isYahoo = imapHost.toLowerCase().includes('yahoo');
    
    // Universal robust IMAP configuration for ALL providers
    const config: any = {
      imap: {
        user: email,
        password: appPassword,
        host: imapHost,
        port: imapPort,
        tls: true,
        tlsOptions: { 
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2' // Modern security standard
        },
        // Extended timeouts for reliability across all providers
        authTimeout: 15000,
        connTimeout: 15000,
      },
    };

    // Provider-specific enhancements for slower servers
    if (isOutlook || isYahoo) {
      config.imap.authTimeout = 20000;
      config.imap.connTimeout = 20000;
    }

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
