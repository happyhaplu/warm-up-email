# Microsoft Outlook/Office365 Mailbox Setup Guide

## Overview
This guide helps you successfully add Microsoft Outlook and Office365 mailboxes to the email warmup system.

## Prerequisites

### 1. Enable SMTP Authentication in Outlook/Office365

The error "SmtpClientAuthentication is disabled for the Mailbox" means SMTP authentication is turned off for your account. You need to enable it:

#### For Personal Microsoft Accounts (outlook.com, hotmail.com, live.com):
1. Go to https://account.microsoft.com/security
2. Sign in with your Microsoft account
3. Navigate to "Advanced security options"
4. Find "App passwords" section
5. Generate a new app password for "Mail"
6. **Use this app password instead of your regular password**

#### For Office365/Microsoft 365 Business Accounts:
**Important:** Your organization's admin must enable SMTP AUTH. Users cannot enable this themselves.

##### If you are the admin:
1. Go to Microsoft 365 Admin Center (https://admin.microsoft.com)
2. Navigate to **Settings > Org settings > Modern authentication**
3. Ensure "Authenticated SMTP" is enabled
4. **OR** use Exchange Online PowerShell:
   ```powershell
   Set-TransportConfig -SmtpClientAuthenticationDisabled $false
   ```
5. To enable for specific mailbox:
   ```powershell
   Set-CASMailbox -Identity user@domain.com -SmtpClientAuthenticationDisabled $false
   ```

##### If you are NOT the admin:
- Contact your IT administrator
- Request them to enable SMTP authentication for your mailbox
- Share this documentation link: https://aka.ms/smtp_auth_disabled

### 2. Generate App Password

Even after enabling SMTP, you should use an app-specific password:

#### For outlook.com/hotmail.com/live.com:
1. Visit https://account.live.com/proofs/manage/additional
2. Select "Create a new app password"
3. Copy the generated password
4. Use this password when adding your mailbox

#### For Office365/Microsoft 365:
1. Visit https://mysignins.microsoft.com/security-info
2. Select "Add sign-in method"
3. Choose "App password"
4. Name it (e.g., "Email Warmup")
5. Copy the generated password

### 3. Enable IMAP Access

1. Go to Outlook settings (https://outlook.live.com/mail/options/mail/accounts)
2. Navigate to "Sync email" or "POP and IMAP"
3. Ensure IMAP is enabled
4. Save changes

## Correct Mailbox Settings

### For outlook.com / hotmail.com / live.com

```
Email:           your-email@outlook.com
App Password:    [16-character app password from step 2]
Sender Name:     Your Name
SMTP Host:       smtp-mail.outlook.com
SMTP Port:       587
IMAP Host:       outlook.office365.com
IMAP Port:       993
```

### For Office365 / Microsoft 365

```
Email:           your-email@yourdomain.com
App Password:    [App-specific password]
Sender Name:     Your Name
SMTP Host:       smtp.office365.com
SMTP Port:       587
IMAP Host:       outlook.office365.com
IMAP Port:       993
```

## Testing Your Configuration

After adding your mailbox with the correct settings, the system will automatically:
1. Test SMTP connection with TLS 1.2
2. Test IMAP connection with proper authentication
3. Verify both connections are successful

If the test fails, you'll see specific error messages indicating which part failed.

## Common Errors and Solutions

### Error: "SmtpClientAuthentication is disabled"
**Solution:** Follow step 1 above to enable SMTP authentication.

### Error: "Invalid login: 535 5.7.139"
**Solutions:**
- Verify you're using an **app password**, not your regular password
- Ensure SMTP authentication is enabled (step 1)
- Check that the email address is correct

### Error: "AUTHENTICATE failed" (IMAP)
**Solutions:**
- Verify IMAP is enabled in Outlook settings
- Use the same app password for both SMTP and IMAP
- Check the IMAP host is `outlook.office365.com`

### Error: "Connection timeout"
**Solutions:**
- Check your firewall allows outbound connections on ports 587 and 993
- Verify your network isn't blocking Microsoft's mail servers
- Try again - Microsoft servers occasionally have temporary issues

## What We Fixed

The system now includes special handling for Outlook/Office365:

1. **STARTTLS Support**: Forces STARTTLS for port 587 (Outlook requirement)
2. **TLS 1.2**: Uses minimum TLS version 1.2 (Microsoft requirement)
3. **Explicit Auth**: Uses LOGIN authentication method explicitly
4. **Extended Timeouts**: Allows more time for Outlook servers to respond
5. **Proper Ciphers**: Configured compatible cipher suites

## Verification Steps

After adding your Outlook mailbox:

1. Check the mailbox appears in your dashboard
2. Look for "Connection successful" status
3. Enable warmup if desired
4. Monitor the logs for successful sends

## Still Having Issues?

1. **Double-check app password**: Generate a fresh one
2. **Verify SMTP is enabled**: Ask your admin if using Office365
3. **Check organization policies**: Some orgs block SMTP entirely
4. **Test with another email provider**: Verify the system works with Gmail first

## Example: Working Configuration

```csv
email,appPassword,senderName,smtpHost,smtpPort,imapHost,imapPort
aadarsh.outcraftlyai1@outlook.com,sjsreixhqufxzarf,Aadarsh Singh,smtp-mail.outlook.com,587,outlook.office365.com,993
```

## Security Notes

- App passwords are more secure than using your main password
- They can be revoked individually without changing your main password
- Each app password should be used for one application only
- Store app passwords securely (password manager recommended)

## Resources

- Microsoft SMTP Documentation: https://support.microsoft.com/smtp
- SMTP Auth Disabled Info: https://aka.ms/smtp_auth_disabled
- Modern Auth Settings: https://aka.ms/modern-auth
- App Passwords Guide: https://support.microsoft.com/account/app-passwords
