# Outlook/Office365 Migration Guide for Existing Mailboxes

## Overview
If you previously tried to add Outlook/Office365 mailboxes and they failed, you can now add them successfully with the updated system.

## What Changed?

The system now includes proper support for Microsoft Outlook and Office365 mail servers:
- ✅ STARTTLS authentication for port 587
- ✅ TLS 1.2 protocol support
- ✅ Explicit LOGIN authentication method
- ✅ Extended connection timeouts
- ✅ Automatic Outlook/Office365 detection

## Before You Re-Add Your Mailboxes

### 1. Ensure SMTP Authentication is Enabled

**For Personal Accounts (outlook.com, hotmail.com, live.com):**
- SMTP is typically enabled by default
- You just need an app-specific password

**For Business Accounts (Office365/Microsoft 365):**
- Your admin must enable SMTP authentication
- Contact your IT department if you're not the admin
- See: https://aka.ms/smtp_auth_disabled

### 2. Generate a Fresh App Password

Don't use your regular email password. Create an app-specific password:

1. Visit: https://account.live.com/proofs/manage/additional (personal)
   OR https://mysignins.microsoft.com/security-info (business)
2. Create a new app password
3. Name it "Email Warmup" or similar
4. Copy the generated password (you won't see it again!)
5. Use this password when adding your mailbox

### 3. Verify IMAP is Enabled

1. Go to: https://outlook.live.com/mail/options/mail/accounts
2. Look for "POP and IMAP" or "Sync email" settings
3. Ensure IMAP is turned ON
4. Save if you made changes

## Re-Adding Your Mailbox

### Step 1: Remove Old Failed Mailboxes (Optional)
If you have failed Outlook mailboxes in the system, you can remove them first.

### Step 2: Add Mailbox with Correct Settings

Use these exact settings:

#### For outlook.com / hotmail.com / live.com:
```
Email:          your-email@outlook.com
App Password:   [your-app-password-from-step-2]
Sender Name:    Your Name
SMTP Host:      smtp-mail.outlook.com
SMTP Port:      587
IMAP Host:      outlook.office365.com
IMAP Port:      993
```

#### For Office365 / Microsoft 365:
```
Email:          your-email@company.com
App Password:   [your-app-password-from-step-2]
Sender Name:    Your Name
SMTP Host:      smtp.office365.com
SMTP Port:      587
IMAP Host:      outlook.office365.com
IMAP Port:      993
```

### Step 3: Test Connection

The system will automatically test both SMTP and IMAP connections. You should see:
- ✅ SMTP connection successful
- ✅ IMAP connection successful

If either fails, check the error message and refer to OUTLOOK_SETUP_GUIDE.md.

### Step 4: Enable Warmup

Once the mailbox is successfully added:
1. Navigate to your mailboxes page
2. Find your Outlook mailbox
3. Enable warmup
4. Set your daily quota (start with 2-5 emails per day)

## Bulk Import Format

If you're adding multiple Outlook mailboxes via CSV:

```csv
email,appPassword,senderName,smtpHost,smtpPort,imapHost,imapPort
user1@outlook.com,app-password-1,John Doe,smtp-mail.outlook.com,587,outlook.office365.com,993
user2@outlook.com,app-password-2,Jane Smith,smtp-mail.outlook.com,587,outlook.office365.com,993
sales@company.com,app-password-3,Sales Team,smtp.office365.com,587,outlook.office365.com,993
```

**Important:** 
- Use app passwords, not regular passwords
- Don't include headers if your import tool adds them automatically
- All ports should be numbers (587 and 993)

## Testing Your Setup

We've included a test script to verify your Outlook configuration:

```bash
# Edit the script with your credentials first
node scripts/test-outlook-connection.js
```

This will test both SMTP and IMAP connections and show detailed results.

## Common Migration Issues

### "Still getting SMTP authentication disabled error"
**Solution:** SMTP auth is not actually enabled yet. Wait 15-30 minutes after enabling it, or contact your admin.

### "Invalid login error (535)"
**Solution:** You're not using an app password. Generate one and use it instead of your regular password.

### "Connection timeout"
**Solution:** 
- Check firewall allows ports 587 and 993
- Try again in a few minutes
- Contact your network admin if persistent

### "Works for Gmail but not Outlook"
**Solution:** This is expected if SMTP auth isn't enabled or you're not using an app password. Outlook has stricter requirements than Gmail.

## Verification Checklist

Before contacting support, verify:

- [ ] SMTP authentication is enabled for your mailbox
- [ ] You're using an APP PASSWORD, not your regular password
- [ ] IMAP is enabled in Outlook settings
- [ ] SMTP host is correct (smtp-mail.outlook.com or smtp.office365.com)
- [ ] SMTP port is 587 (not 465 or 25)
- [ ] IMAP host is outlook.office365.com
- [ ] IMAP port is 993
- [ ] App password was copied correctly (no spaces or extra characters)

## Success Indicators

Your Outlook mailbox is working correctly when:

1. ✅ Mailbox shows as "Connected" in dashboard
2. ✅ No error messages in connection test
3. ✅ Can enable warmup without errors
4. ✅ Warmup emails appear in logs as "SENT"
5. ✅ Emails actually arrive in recipient inboxes

## Getting Help

If you're still having issues:

1. **Read the detailed guide:** OUTLOOK_SETUP_GUIDE.md
2. **Check error messages:** They often tell you exactly what's wrong
3. **Test with Gmail first:** Verify the system works with a Gmail account
4. **Contact your admin:** For business accounts, IT support may need to help

## Security Reminder

- **App passwords are safer** than using your main password
- Each app password can be revoked individually
- Microsoft can see which services use which app passwords
- Store app passwords in a password manager
- Never share your app passwords

## Technical Details

The system now automatically detects Outlook/Office365 servers and:
- Forces STARTTLS on port 587
- Uses TLS 1.2 minimum
- Sets explicit LOGIN authentication
- Increases timeouts to 15-20 seconds
- Configures compatible cipher suites

This happens automatically - no manual configuration needed!
