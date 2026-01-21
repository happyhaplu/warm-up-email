# Gmail Warmup Automation - Complete Guide

## 🎉 Implementation Complete!

The warmup automation system has been successfully implemented with all requested features:

### ✅ Core Features Implemented

1. **Email Sending via SMTP (nodemailer)**
   - Randomly selects sender account from database
   - Randomly selects recipient from database
   - Randomly selects email template from database
   - Sends emails via Gmail SMTP using app passwords

2. **IMAP Inbox Checking**
   - Connects to Gmail via IMAP
   - Checks for unread messages
   - Searches for specific warmup-related emails
   - Auto-marks messages as read after processing

3. **Auto-Reply System**
   - 10 natural-looking reply templates
   - Random selection for variety
   - Automatically replies to received warmup emails
   - Logs all reply activities

4. **5-Minute Delays**
   - Configurable delay between sends (default: 5 minutes)
   - Sleep function prevents continuous sending
   - Maintains natural sending patterns

5. **Logging to Supabase**
   - Logs every email sent
   - Logs every reply received
   - Logs all errors and failures
   - Timestamps and status tracking

6. **Dashboard Controls**
   - Start/Stop warmup buttons
   - Real-time status indicator (running/stopped)
   - Analytics cards (Total Sent, Replies, Failed, Reply Rate)
   - Recent activity table with live updates
   - Status polling every 5 seconds

---

## 🚀 Quick Start Guide

### Step 1: Set Up Your Accounts

1. **Add Mailboxes (Sender Accounts)**
   - Navigate to: `/dashboard/mailboxes`
   - Add Gmail accounts with:
     - Email address
     - Sender name
     - SMTP host: `smtp.gmail.com`
     - SMTP port: `587`
     - IMAP host: `imap.gmail.com`
     - IMAP port: `993`
     - App password (generate from Google Account settings)
   - Or bulk import via CSV/Excel

2. **Add Recipients**
   - Navigate to: `/dashboard/recipients`
   - Add recipient emails and names
   - Or bulk import via CSV/Excel

3. **Add Email Templates**
   - Navigate to: `/dashboard/templates`
   - Create email templates with:
     - Template name
     - Subject line
     - Email body (HTML supported)
   - Or bulk import via CSV/Excel

### Step 2: Start Warmup Automation

1. **Go to Dashboard**
   - Navigate to: `/dashboard`

2. **Click "▶️ Start Warmup"**
   - Service starts immediately
   - Green pulsing indicator shows "Running" status
   - Analytics cards update in real-time

3. **Monitor Activity**
   - Watch the "Recent Activity" table
   - See emails sent, replies received, and failures
   - Analytics cards show:
     - Total Sent
     - Total Replies
     - Total Failed
     - Reply Rate %

### Step 3: Stop Warmup (When Needed)

1. **Click "⏸️ Stop Warmup"**
   - Service stops gracefully
   - Status changes to "Stopped"
   - All logs are preserved

---

## 📊 How It Works

### Warmup Cycle Flow

```
1. Service starts
2. Select random account (sender)
3. Select random recipient
4. Select random template
5. Send email via SMTP
6. Log email as "SENT"
7. Wait 5 minutes
8. Check IMAP inbox for new emails
9. If email found, send auto-reply
10. Log reply as "REPLIED"
11. Repeat from step 2
```

### Auto-Reply Templates

The system includes 10 natural-looking auto-reply templates:
- "Thanks for reaching out!"
- "Got it, thanks!"
- "Received! Will check this out."
- "Thanks! Looks good."
- "Appreciate it!"
- "Perfect, thank you!"
- "All set, thanks!"
- "Thank you for the update!"
- "Noted, thanks!"
- "Great, got it!"

These are randomly selected to make replies appear more natural.

---

## 🔧 Technical Architecture

### File Structure

```
/lib/warmup-service.ts          # Core warmup automation engine
/pages/api/warmup/trigger.ts    # API: Start/Stop warmup
/pages/api/warmup/status.ts     # API: Get warmup status
/pages/api/logs.ts              # API: Fetch activity logs
/pages/dashboard.tsx            # Dashboard UI with controls
```

### Database Schema (Prisma)

**Account Table**
- id, email, senderName
- smtpHost, smtpPort (for sending)
- imapHost, imapPort (for checking)
- appPassword (Gmail app password)
- createdAt, updatedAt

**Recipient Table**
- id, email, name
- createdAt, updatedAt

**Template Table**
- id, name, subject, body
- createdAt, updatedAt

**Log Table**
- id, timestamp
- sender, recipient, subject
- status (SENT, REPLIED, FAILED)
- notes (error details, etc.)

### API Endpoints

**POST /api/warmup/trigger**
- Starts warmup service
- Body: `{ minDelayMinutes: 5, autoReply: true }`
- Response: `{ success: true, message: "Warmup started" }`

**DELETE /api/warmup/trigger**
- Stops warmup service
- Response: `{ success: true, message: "Warmup stopped" }`

**GET /api/warmup/status**
- Gets current warmup status
- Response: `{ success: true, status: { running: true/false } }`

**GET /api/logs**
- Fetches all activity logs
- Response: Array of log entries

---

## ⚙️ Configuration

### Warmup Settings (in code)

Located in: `/pages/dashboard.tsx` (handleStartWarmup function)

```javascript
{
  minDelayMinutes: 5,      // Wait 5 minutes between sends
  autoReply: true          // Enable auto-reply feature
}
```

You can modify these values to:
- Change delay between emails (e.g., 10 minutes)
- Disable auto-reply (set to false)
- Add more configuration options

### Gmail App Password Setup

1. Go to Google Account: https://myaccount.google.com/
2. Navigate to Security > 2-Step Verification
3. Scroll to "App passwords"
4. Create new app password for "Mail"
5. Copy the 16-character password
6. Use this in the "App Password" field when adding mailboxes

**Important:** Regular Gmail password won't work - you MUST use an app password!

---

## 🧪 Testing the System

### Manual Testing Steps

1. **Add Test Data**
   - Add at least 1 mailbox (your Gmail account)
   - Add at least 1 recipient (can be same or different email)
   - Add at least 1 template (simple subject + body)

2. **Start Warmup**
   - Click "Start Warmup" on dashboard
   - Check status indicator turns green and shows "Running"

3. **Monitor Logs**
   - Watch "Recent Activity" table
   - Should see new entry within 5 minutes
   - Status should be "SENT" or "SUCCESS"

4. **Check Gmail**
   - Log into recipient Gmail account
   - Check inbox for warmup email
   - Email should arrive within a few minutes

5. **Verify Auto-Reply**
   - If auto-reply enabled, check sender inbox
   - Should receive auto-reply within next cycle
   - Log should show "REPLIED" status

6. **Stop Warmup**
   - Click "Stop Warmup"
   - Status should change to "Stopped"
   - No more emails should be sent

### Troubleshooting

**Issue:** "Authentication failed" error
- **Solution:** Check that you're using a Gmail app password (not regular password)
- **Solution:** Verify 2-Step Verification is enabled on Gmail account

**Issue:** "SMTP connection timeout"
- **Solution:** Check SMTP host is `smtp.gmail.com` and port is `587`
- **Solution:** Verify firewall isn't blocking SMTP connections

**Issue:** "IMAP connection failed"
- **Solution:** Enable IMAP in Gmail settings (Settings > Forwarding and POP/IMAP)
- **Solution:** Check IMAP host is `imap.gmail.com` and port is `993`

**Issue:** No emails being sent
- **Solution:** Check that you have at least 1 account, 1 recipient, and 1 template
- **Solution:** Check browser console for errors (F12)
- **Solution:** Check server logs in terminal

**Issue:** "Cannot read properties of null"
- **Solution:** Database may be empty - add data via dashboard pages
- **Solution:** Check Supabase connection in `.env` file

---

## 📈 Analytics Explained

### Dashboard Metrics

**Total Sent**
- Count of all successfully sent emails
- Status: `SENT` or `SUCCESS` in logs

**Total Replies**
- Count of all auto-replies sent
- Status: `REPLIED` or `REPLY_SUCCESS` in logs

**Total Failed**
- Count of all failed send attempts
- Status: `FAILED` in logs

**Reply Rate**
- Percentage: (Total Replies / Total Sent) × 100
- Indicates warmup effectiveness
- Higher is better (shows good deliverability)

---

## 🔒 Security Best Practices

1. **Never commit `.env` file**
   - Contains sensitive Supabase credentials
   - Already in `.gitignore`

2. **Use Gmail App Passwords**
   - Never store regular Gmail passwords
   - Revoke app passwords when done

3. **Rotate App Passwords Regularly**
   - Create new app passwords every few months
   - Update in mailboxes page

4. **Limit Recipient List**
   - Only send to consenting email addresses
   - Comply with anti-spam laws (CAN-SPAM, GDPR)

5. **Monitor Logs**
   - Check for unusual failure rates
   - Watch for authentication errors

---

## 🎯 Next Steps & Enhancements

### Potential Improvements

1. **Cron Scheduling**
   - Currently: Manual start/stop
   - Enhancement: Schedule warmup for specific hours/days
   - Use `node-cron` (already installed)

2. **Variable Delays**
   - Currently: Fixed 5-minute delay
   - Enhancement: Random delays (3-7 minutes) for more natural patterns

3. **Rate Limiting**
   - Currently: No limits
   - Enhancement: Max emails per hour/day per account
   - Prevents Gmail rate limit issues

4. **Advanced Analytics**
   - Currently: Basic counts
   - Enhancement: Charts, graphs, trends over time
   - Daily/weekly/monthly reports

5. **Email Warmup Stages**
   - Currently: Constant sending
   - Enhancement: Gradually increase volume
   - Week 1: 5 emails/day, Week 2: 10/day, etc.

6. **Multi-Account Rotation**
   - Currently: Random selection
   - Enhancement: Round-robin to ensure equal usage
   - Track sends per account

7. **Webhook Notifications**
   - Currently: Manual checking
   - Enhancement: Slack/Discord alerts for errors
   - Email notifications for milestones

---

## 📝 Code Examples

### Starting Warmup via API (curl)

```bash
curl -X POST http://localhost:3000/api/warmup/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "minDelayMinutes": 5,
    "autoReply": true
  }'
```

### Stopping Warmup via API (curl)

```bash
curl -X DELETE http://localhost:3000/api/warmup/trigger
```

### Checking Status via API (curl)

```bash
curl http://localhost:3000/api/warmup/status
```

### Fetching Logs via API (curl)

```bash
curl http://localhost:3000/api/logs
```

---

## 🐛 Known Limitations

1. **Single Instance**
   - Warmup service runs in-memory
   - Restarting server stops warmup
   - **Workaround:** Use PM2 or similar for persistence

2. **No Queue System**
   - Currently synchronous
   - **Workaround:** Implement BullMQ for production

3. **Basic Error Handling**
   - Continues on errors
   - **Workaround:** Implement retry logic with exponential backoff

4. **No Email Validation**
   - Assumes all emails are valid
   - **Workaround:** Add email validation before sending

---

## 📚 Dependencies Used

- **nodemailer** (v6.9.17): SMTP email sending
- **imap-simple** (v5.1.0): IMAP inbox checking
- **node-cron** (v3.0.3): Cron scheduling (installed, not yet used)
- **@types/nodemailer**: TypeScript types
- **@types/node-cron**: TypeScript types
- **@types/imap-simple**: TypeScript types

---

## ✅ Build & Deploy

### Build Success
```
✓ Compiled successfully
✓ 28 routes generated
✓ 0 errors, 0 warnings
```

### Running in Production

1. **Build**
   ```bash
   npm run build
   ```

2. **Start**
   ```bash
   npm start
   ```

3. **Access**
   - Navigate to: `http://localhost:3000`
   - Login with Supabase credentials
   - Go to `/dashboard`
   - Start warmup!

---

## 🙏 Support

For issues or questions:
1. Check logs in browser console (F12)
2. Check server terminal output
3. Review troubleshooting section above
4. Check Supabase logs
5. Verify Gmail app password setup

---

## 🎉 Congratulations!

Your Gmail warmup automation system is now ready to use! 

**What you can do:**
- ✅ Automatically send warmup emails
- ✅ Check inbox via IMAP
- ✅ Send auto-replies
- ✅ Track all activity
- ✅ Monitor analytics
- ✅ Start/stop on demand

**Next Actions:**
1. Add your Gmail accounts to mailboxes
2. Add recipient emails
3. Create email templates
4. Click "Start Warmup" on dashboard
5. Watch the magic happen! 🚀

---

*Built with Next.js, Supabase, Prisma, nodemailer, and imap-simple*
*Last Updated: 2024*
