# Outlook/Office365 Support - Implementation Summary

## Problem
Microsoft Outlook and Office365 mailboxes were failing to connect with errors:
- SMTP: "SmtpClientAuthentication is disabled for the Mailbox"
- IMAP: "AUTHENTICATE failed"

## Root Cause
Microsoft's mail servers require specific SMTP/IMAP configuration:
1. STARTTLS must be explicitly enabled for port 587
2. TLS 1.2 minimum version required
3. Explicit LOGIN authentication method needed
4. Longer connection timeouts for reliability

## Solution Implemented

### Files Modified

1. **lib/connection-validator.ts** - Connection testing
   - Added Outlook/Office365 detection
   - Configured STARTTLS for port 587
   - Set TLS 1.2 as minimum version
   - Explicit LOGIN auth type
   - Extended timeouts (15-20 seconds)

2. **lib/warmup-cron.ts** - Automated warmup service
   - Updated sendEmail function with Outlook settings
   - Updated reply function with Outlook settings

3. **lib/warmup-service-v2.ts** - Warmup service v2
   - Updated send email transport configuration
   - Updated auto-reply transport configuration

4. **lib/warmup-service.ts** - Original warmup service
   - Updated send email transport configuration
   - Updated auto-reply transport configuration

### Files Created

5. **lib/smtp-config.ts** - Reusable SMTP/IMAP configuration helper
   - `createSMTPTransportOptions()` function
   - `createIMAPConfig()` function
   - Automatic provider detection

6. **OUTLOOK_SETUP_GUIDE.md** - Comprehensive user guide
   - Step-by-step setup instructions
   - How to enable SMTP authentication
   - How to generate app passwords
   - Troubleshooting common errors
   - Correct configuration examples

## Technical Changes

### SMTP Configuration (Before)
```javascript
{
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: { user: email, pass: appPassword },
  connectionTimeout: 10000
}
```

### SMTP Configuration (After - for Outlook)
```javascript
{
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: email,
    pass: appPassword,
    type: 'login'  // Explicit auth method
  },
  requireTLS: true,  // Force STARTTLS
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'  // Microsoft requirement
  },
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 15000
}
```

### IMAP Configuration (Before)
```javascript
{
  imap: {
    user: email,
    password: appPassword,
    host: imapHost,
    port: imapPort,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
    authTimeout: 10000,
    connTimeout: 10000
  }
}
```

### IMAP Configuration (After - for Outlook)
```javascript
{
  imap: {
    user: email,
    password: appPassword,
    host: imapHost,
    port: imapPort,
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'  // Microsoft requirement
    },
    authTimeout: 20000,  // Extended for Outlook
    connTimeout: 20000
  }
}
```

## Detection Logic

The system automatically detects Outlook/Office365 by checking if the hostname contains:
- 'outlook' (e.g., smtp-mail.outlook.com, outlook.office365.com)
- 'office365' (e.g., smtp.office365.com)

## Correct Settings for Testing

### Outlook.com / Hotmail.com / Live.com
```
SMTP Host: smtp-mail.outlook.com
SMTP Port: 587
IMAP Host: outlook.office365.com
IMAP Port: 993
```

### Office365 / Microsoft 365 Business
```
SMTP Host: smtp.office365.com
SMTP Port: 587
IMAP Host: outlook.office365.com
IMAP Port: 993
```

## Testing Credentials Provided
```
Email: aadarsh.outcraftlyai1@outlook.com
App Password: sjsreixhqufxzarf
Sender Name: Aadarsh Singh
SMTP Host: smtp-mail.outlook.com
SMTP Port: 587
IMAP Host: outlook.office365.com
IMAP Port: 993
```

## Important User Requirements

### Before Using Outlook Mailboxes:

1. **Enable SMTP Authentication**
   - Personal accounts: Already enabled, just need app password
   - Business accounts: Admin must enable via Microsoft 365 Admin Center

2. **Generate App Password**
   - Visit: https://account.live.com/proofs/manage/additional
   - Create new app password
   - Use this instead of regular password

3. **Enable IMAP**
   - Visit: https://outlook.live.com/mail/options/mail/accounts
   - Enable IMAP access
   - Save changes

## Backward Compatibility

All changes are backward compatible:
- Gmail and other providers continue to work as before
- Outlook-specific settings only apply when Outlook/Office365 is detected
- No changes to database schema or API interfaces

## Next Steps for Users

1. Read OUTLOOK_SETUP_GUIDE.md
2. Enable SMTP authentication (if not already enabled)
3. Generate app password
4. Use the correct SMTP/IMAP hosts and ports
5. Test connection - should now succeed
6. Enable warmup as normal

## Error Messages Resolved

✅ "SmtpClientAuthentication is disabled for the Mailbox"
   - Now shows clear instructions if this occurs
   - System properly configured when SMTP auth is enabled

✅ "AUTHENTICATE failed"
   - Fixed with proper TLS configuration
   - Extended timeouts for reliability

✅ "Invalid login: 535 5.7.139"
   - Fixed with explicit LOGIN auth type
   - Proper STARTTLS negotiation
