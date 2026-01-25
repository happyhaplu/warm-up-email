/**
 * SMTP Configuration Helper
 * Provides universal robust SMTP/IMAP transport options for all email providers
 * with optional provider-specific enhancements
 */

export interface SMTPTransportOptions {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
    type?: string;
  };
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
  requireTLS?: boolean;
  tls?: {
    ciphers?: string;
    rejectUnauthorized?: boolean;
    minVersion?: string;
  };
}

/**
 * Creates robust SMTP transport options for ALL email providers
 * Includes universal best practices with optional provider-specific enhancements
 */
export function createSMTPTransportOptions(
  email: string,
  appPassword: string,
  smtpHost: string,
  smtpPort: number
): SMTPTransportOptions {
  // Detect providers for optional enhancements
  const isOutlook = smtpHost.toLowerCase().includes('outlook') || 
                    smtpHost.toLowerCase().includes('office365');
  const isYahoo = smtpHost.toLowerCase().includes('yahoo');
  const isZoho = smtpHost.toLowerCase().includes('zoho');

  // Universal robust configuration for ALL providers
  const transportOptions: SMTPTransportOptions = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // SSL for 465, STARTTLS for 587
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
    // Modern TLS configuration (works with all modern providers)
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
  };

  // Provider-specific enhancements
  if (isOutlook || isYahoo) {
    // Outlook and Yahoo require explicit LOGIN authentication
    transportOptions.auth.type = 'login';
  }

  return transportOptions;
}

/**
 * Creates robust IMAP configuration for ALL email providers
 * Includes universal best practices with optional provider-specific enhancements
 */
export function createIMAPConfig(
  email: string,
  appPassword: string,
  imapHost: string,
  imapPort: number
): any {
  // Detect providers for optional enhancements
  const isOutlook = imapHost.toLowerCase().includes('outlook') || 
                    imapHost.toLowerCase().includes('office365');
  const isYahoo = imapHost.toLowerCase().includes('yahoo');

  // Universal robust configuration for ALL providers
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

  return config;
}
