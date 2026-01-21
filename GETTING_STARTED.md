# 🚀 GETTING STARTED

Welcome to Gmail Warmup Automation! This guide will get you up and running in under 10 minutes.

## 📋 Prerequisites

Before you begin, make sure you have:
- ✅ Node.js 18+ installed ([Download](https://nodejs.org/))
- ✅ A Gmail account with 2-Step Verification enabled
- ✅ Terminal/Command Line access

## ⚡ Quick Installation (Automated)

The fastest way to get started:

```bash
# Navigate to project directory
cd /home/harekrishna/Projects/email-warmup

# Run automated setup
./setup.sh

# Start the application (2 terminals)
npm run dev          # Terminal 1
npm run warmup       # Terminal 2

# Open browser
# http://localhost:3000
```

That's it! Skip to **"Using the Application"** section below.

## 🔧 Manual Installation

If you prefer manual setup:

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

### Step 3: Initialize Database
```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Create database
npm run db:seed        # Add sample templates
```

### Step 4: Verify Installation
```bash
./test-install.sh      # Check everything is set up
```

### Step 5: Start Services

**Terminal 1 - Next.js Web Server:**
```bash
npm run dev
```

**Terminal 2 - Warmup Worker:**
```bash
npm run warmup
```

## 📧 Gmail Setup (Required)

### Enable 2-Step Verification

1. Go to: https://myaccount.google.com/security
2. Click "2-Step Verification"
3. Follow the setup process

### Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" from the dropdown
3. Select "Other (Custom name)"
4. Enter: "Warmup Automation"
5. Click "Generate"
6. **Copy the 16-character password** (format: xxxx xxxx xxxx xxxx)
7. Save it somewhere safe (you'll need it in the next step)

## 🌐 Using the Application

### Access the Web Interface

Open your browser to: **http://localhost:3000**

You should see the dashboard with navigation.

### Step-by-Step Setup

#### 1. Add Gmail Accounts

1. Click **"Accounts"** in the navigation
2. Fill in the form:
   - **Email**: Your Gmail address (e.g., sender@gmail.com)
   - **App Password**: The 16-char password from Gmail setup
3. Click **"Add Account"**
4. Repeat for additional accounts

#### 2. Add Recipients

1. Click **"Recipients"** in the navigation
2. Enter recipient email addresses
3. Click **"Add Recipient"**
4. Add multiple recipients (one at a time or bulk)

#### 3. Create Email Templates

1. Click **"Templates"** in the navigation
2. Fill in:
   - **Subject**: Email subject line
   - **Body**: Email message content
3. Click **"Add Template"**
4. Create multiple templates for variety

**Note:** Sample templates were already added during setup!

#### 4. Test the System

1. Return to **Dashboard** (click "Dashboard" or home icon)
2. Click **"Trigger Warm-up Now"** button
3. Watch the warmup service terminal for output
4. Click **"Logs"** to see results

## 📊 Monitoring

### View Logs

- Go to **Logs** page: http://localhost:3000/logs
- See all email activity in real-time
- Filter by status (SUCCESS, FAILED, etc.)
- Use pagination for large volumes

### Console Output

In the terminal running `npm run warmup`, you'll see:

```
✓ Connected to database
✓ Loaded 2 accounts
✓ Loaded 5 recipients
✓ Loaded 3 templates

📧 Sending email:
   From: sender@gmail.com
   To: recipient@gmail.com
   Subject: Quick question

  ✓ Email sent: sender@gmail.com → recipient@gmail.com
  ✓ Logged: SUCCESS

📬 Checking inbox for sender@gmail.com...
  ✓ Found 1 new email(s)

💬 Replying to email from someone@example.com...
  ✓ Auto-reply sent
  ✓ Logged: REPLY_SUCCESS

✓ Warm-up cycle completed
```

## ⚙️ Configuration

### Adjust Cron Schedule

Edit `.env` file:

```bash
# Run every hour (default)
CRON_SCHEDULE=0 * * * *

# Run every 30 minutes
CRON_SCHEDULE=*/30 * * * *

# Run every 2 hours
CRON_SCHEDULE=0 */2 * * *

# Run every weekday at 10 AM
CRON_SCHEDULE=0 10 * * 1-5
```

After changing, restart the warmup service (Ctrl+C, then `npm run warmup`)

### Customize Auto-Replies

Edit `services/warmup.js` and modify:

```javascript
const AUTO_REPLY_SUBJECTS = [
  'Re: {original_subject}',
  'Thanks for your message!',
  // Add more...
];

const AUTO_REPLY_BODIES = [
  'Thanks for your email!',
  'Got your message, will respond soon!',
  // Add more...
];
```

## 🛠️ Useful Commands

### Development
```bash
npm run dev              # Start Next.js dev server
npm run warmup:dev       # Start warmup with auto-reload
```

### Database
```bash
npm run db:studio        # Open Prisma Studio (visual DB editor)
npm run db:push          # Push schema changes
npm run db:seed          # Re-seed sample data
```

### Testing
```bash
./test-install.sh        # Verify installation
curl http://localhost:3000/api/warmup/status  # Check API
```

### Production
```bash
npm run build            # Build for production
npm start                # Start production server
node services/warmup.js  # Start warmup worker
```

## 🔍 Troubleshooting

### "Port 3000 already in use"

```bash
# Use different port
PORT=3001 npm run dev

# Or kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### "Database does not exist"

```bash
npm run db:push
```

### "Prisma Client not generated"

```bash
npm run db:generate
```

### "Authentication failed" (Email)

- Double-check app password (no spaces)
- Ensure 2FA is enabled on Gmail
- Regenerate app password if needed
- Verify email address is correct

### "IMAP connection failed"

1. Enable IMAP in Gmail:
   - Settings → See all settings
   - Forwarding and POP/IMAP
   - Enable IMAP
2. Check firewall allows port 993

### Dependencies Issues

```bash
rm -rf node_modules package-lock.json
npm install
npm run db:generate
```

## 📚 Additional Resources

### Documentation
- **README.md** - Full documentation
- **QUICKSTART.md** - This guide
- **PROJECT_OVERVIEW.md** - Architecture details
- **DELIVERY_SUMMARY.md** - Complete feature list

### Tools
- **Prisma Studio**: `npm run db:studio`
- **Browser DevTools**: F12 in browser
- **API Testing**: Postman or curl

### Example API Calls

```bash
# Get all accounts
curl http://localhost:3000/api/accounts

# Get all logs
curl http://localhost:3000/api/logs?page=1&limit=10

# Trigger warmup
curl -X POST http://localhost:3000/api/warmup/trigger

# Check status
curl http://localhost:3000/api/warmup/status
```

## 🚀 Next Steps

1. **Add more accounts** - Scale to multiple Gmail accounts
2. **Create more templates** - Vary your email content
3. **Monitor logs** - Check success rates
4. **Adjust schedule** - Fine-tune timing
5. **Deploy to production** - See deployment guides in README

## 💡 Pro Tips

### Best Practices

1. **Start slow** - Begin with hourly cycles
2. **Use variety** - Multiple templates prevent patterns
3. **Monitor Gmail** - Watch for spam folder placement
4. **Check logs daily** - Identify and fix issues quickly
5. **Backup database** - Copy `prisma/dev.db` regularly

### Scaling Up

1. Add accounts gradually (1-2 per day)
2. Increase frequency slowly
3. Monitor deliverability rates
4. Use multiple recipient domains
5. Vary sending times

### Production Deployment

For production use:

1. Use PM2 for process management
2. Set up log rotation
3. Use HTTPS (reverse proxy)
4. Add authentication to web interface
5. Monitor with external tools

See README.md for detailed production deployment guides.

## ❓ Need Help?

1. Check the **Logs** page for errors
2. Review console output from warmup service
3. Run `./test-install.sh` to verify setup
4. Open Prisma Studio to inspect database
5. Check documentation files

## 🎉 You're All Set!

You now have a fully functional Gmail warm-up automation system!

The service will:
- ✅ Send emails automatically (hourly)
- ✅ Check for replies
- ✅ Auto-respond to emails
- ✅ Log all activity
- ✅ Provide web interface for management

**Happy warming! 📧🚀**
