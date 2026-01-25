# Universal Email Provider Support Guide

## Overview
This system now supports **ALL email providers** that use SMTP and IMAP protocols with robust, modern configuration settings.

## Supported Email Providers

✅ **Google (Gmail, Google Workspace)**
✅ **Microsoft (Outlook, Hotmail, Live, Office365)**
✅ **Yahoo Mail**
✅ **Zoho Mail**
✅ **ProtonMail (Bridge)**
✅ **iCloud Mail**
✅ **FastMail**
✅ **AOL Mail**
✅ **Custom SMTP/IMAP servers**
✅ **Any provider supporting SMTP/IMAP**

## Universal Features

All email providers benefit from:

- **TLS 1.2 Security**: Modern encryption standards
- **STARTTLS Support**: Automatic for port 587
- **Extended Timeouts**: 15-20 seconds for reliability
- **Smart Authentication**: Automatic provider detection
- **Error Handling**: Clear error messages for troubleshooting

## Quick Start Settings

### Gmail / Google Workspace
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
IMAP Host: imap.gmail.com
IMAP Port: 993
Note: Use App Password (not regular password)
```

### Outlook / Hotmail / Live
```
SMTP Host: smtp-mail.outlook.com (or smtp.office365.com)
SMTP Port: 587
IMAP Host: outlook.office365.com
IMAP Port: 993
Note: Enable SMTP Auth + Use App Password
```

### Yahoo Mail
```
SMTP Host: smtp.mail.yahoo.com
SMTP Port: 587
IMAP Host: imap.mail.yahoo.com
IMAP Port: 993
Note: Use App Password (not regular password)
```

### Zoho Mail
```
SMTP Host: smtp.zoho.com
SMTP Port: 587
IMAP Host: imap.zoho.com
IMAP Port: 993
```

### iCloud Mail
```
SMTP Host: smtp.mail.me.com
SMTP Port: 587
IMAP Host: imap.mail.me.com
IMAP Port: 993
Note: Use App-Specific Password
```

### FastMail
```
SMTP Host: smtp.fastmail.com
SMTP Port: 587
IMAP Host: imap.fastmail.com
IMAP Port: 993
```

### ProtonMail (via Bridge)
```
SMTP Host: 127.0.0.1
SMTP Port: 1025
IMAP Host: 127.0.0.1
IMAP Port: 1143
Note: Requires ProtonMail Bridge installed
```

### AOL Mail
```
SMTP Host: smtp.aol.com
SMTP Port: 587
IMAP Host: imap.aol.com
IMAP Port: 993
Note: Use App Password
```

## Common Port Configurations

### SMTP Ports
- **587**: STARTTLS (Recommended) - Connection starts unencrypted, upgrades to TLS
- **465**: SSL/TLS - Connection encrypted from start
- **25**: Plain (Not recommended for client authentication)

### IMAP Ports
- **993**: SSL/TLS (Standard for all providers)
- **143**: STARTTLS (Less common for client access)

## App Password Requirements

Most modern providers require app-specific passwords instead of your main account password:

### Providers Requiring App Passwords:
- ✅ Gmail / Google Workspace
- ✅ Outlook / Hotmail / Live / Office365
- ✅ Yahoo Mail
- ✅ iCloud Mail
- ✅ AOL Mail

### How to Generate App Passwords:

**Gmail:**
1. Visit: https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Copy the 16-character password

**Outlook/Hotmail/Live:**
1. Visit: https://account.live.com/proofs/manage/additional
2. Select "Create a new app password"
3. Copy the generated password

**Yahoo:**
1. Visit: https://login.yahoo.com/account/security
2. Generate app password
3. Copy the password

**iCloud:**
1. Visit: https://appleid.apple.com/account/manage
2. App-Specific Passwords section
3. Generate password for "Mail"

## Testing Your Configuration

The system automatically tests both SMTP and IMAP when you add a mailbox:

1. **SMTP Test**: Verifies you can send emails
2. **IMAP Test**: Verifies you can receive emails
3. **Both must pass** for the mailbox to be added

### Connection Test Features:
- ✅ Automatic TLS 1.2 negotiation
- ✅ Extended timeouts (15-20 seconds)
- ✅ Provider-specific authentication methods
- ✅ Clear error messages with solutions

## Troubleshooting

### Error: "Connection timeout"
**Solutions:**
- Check firewall allows ports 587 and 993
- Verify SMTP/IMAP hosts are correct
- Ensure internet connection is stable
- Try again (temporary network issues)

### Error: "Invalid login" or "Authentication failed"
**Solutions:**
- Use **app password**, not regular password
- Verify email address is correct
- Check SMTP authentication is enabled
- Regenerate app password if needed

### Error: "IMAP not enabled"
**Solutions:**
- Enable IMAP in your email settings
- Wait 5-10 minutes for changes to take effect
- Check provider documentation for IMAP access

### Error: "SMTP authentication disabled"
**Solutions:**
- Enable SMTP authentication in account settings
- For business accounts: Contact your admin
- Refer to provider-specific documentation

## Provider-Specific Notes

### Microsoft Outlook/Office365
- **SMTP Auth must be enabled** by admin (business accounts)
- Extended timeouts applied automatically
- Explicit LOGIN authentication used

### Yahoo Mail
- Extended timeouts applied automatically
- Explicit LOGIN authentication used
- App passwords required (no regular passwords)

### Gmail
- 2FA required for app passwords
- Less secure apps must be disabled
- Use modern OAuth when possible

### ProtonMail
- Requires ProtonMail Bridge application
- Bridge runs locally and provides SMTP/IMAP
- Use Bridge-generated credentials

## Advanced Configuration

### Custom SMTP/IMAP Servers

For custom or self-hosted email servers:

```
Email:         your-email@yourdomain.com
App Password:  [Your password or app password]
SMTP Host:     smtp.yourdomain.com
SMTP Port:     587 (or 465 for SSL)
IMAP Host:     imap.yourdomain.com
IMAP Port:     993
```

The system will automatically:
- Apply universal security settings
- Use TLS 1.2 or higher
- Set extended timeouts
- Handle authentication properly

### SSL vs STARTTLS

**Port 587 (STARTTLS - Recommended):**
- Connection starts unencrypted
- Upgrades to TLS after STARTTLS command
- System automatically handles this

**Port 465 (SSL):**
- Connection encrypted from start
- Older standard but still widely supported
- System detects and handles automatically

## Security Best Practices

1. **Always use app passwords** (never main passwords)
2. **Enable 2FA** on your email accounts
3. **Revoke unused app passwords** regularly
4. **Use unique passwords** for each application
5. **Monitor login activity** on your accounts

## Import/Export Format

### CSV Format
```csv
email,appPassword,senderName,smtpHost,smtpPort,imapHost,imapPort
user@gmail.com,abcd1234efgh5678,John Doe,smtp.gmail.com,587,imap.gmail.com,993
user@outlook.com,xyz9876543,Jane Smith,smtp-mail.outlook.com,587,outlook.office365.com,993
```

### JSON Format
```json
[
  {
    "email": "user@gmail.com",
    "appPassword": "abcd1234efgh5678",
    "senderName": "John Doe",
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "imapHost": "imap.gmail.com",
    "imapPort": 993
  }
]
```

## Performance Optimization

The system includes built-in optimizations:

- **Connection Pooling**: Reuses SMTP connections
- **Timeout Management**: Prevents hanging connections
- **Retry Logic**: Automatic retries on temporary failures
- **Provider Detection**: Optimizes settings per provider

## Monitoring & Logs

After adding mailboxes, monitor:

1. **Connection Status**: Green = Connected
2. **Send Logs**: Track successful/failed sends
3. **Error Messages**: Detailed troubleshooting info
4. **Deliverability**: Success rate tracking

## Getting Help

If you encounter issues:

1. Check provider's SMTP/IMAP documentation
2. Verify app password is correct
3. Ensure SMTP/IMAP is enabled
4. Review error messages in logs
5. Test credentials with email client (Thunderbird, etc.)

## Resources by Provider

- **Gmail**: https://support.google.com/mail/answer/7126229
- **Outlook**: https://support.microsoft.com/outlook-smtp
- **Yahoo**: https://help.yahoo.com/kb/SLN4075.html
- **iCloud**: https://support.apple.com/en-us/HT202304
- **Zoho**: https://www.zoho.com/mail/help/zoho-smtp.html
- **FastMail**: https://www.fastmail.help/hc/en-us/articles/1500000278382

## What Makes This Universal?

Our implementation includes:

✅ **TLS 1.2+ Support**: Modern encryption for all providers
✅ **STARTTLS Auto-Detection**: Automatic for port 587
✅ **Extended Timeouts**: Works with slow servers
✅ **Multiple Auth Methods**: LOGIN, PLAIN, etc.
✅ **Provider Intelligence**: Auto-detects and optimizes
✅ **Error Recovery**: Graceful handling of failures
✅ **Standards Compliant**: Follows RFC specifications

This means you can add mailboxes from **any provider** that supports standard SMTP and IMAP protocols!
