# Quick Start Guide

## Setup in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
```

### 3. Initialize Database
```bash
npm run db:push
```

### 4. Start Application
```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start warmup service
npm run warmup
```

### 5. Open Browser
Go to: http://localhost:3000

### 6. Add Your Data

1. **Accounts** (`/accounts`):
   - Click "Add New Account"
   - Enter Gmail address
   - Enter app password (get from: https://myaccount.google.com/apppasswords)
   - Click "Add Account"

2. **Recipients** (`/recipients`):
   - Click "Add New Recipient"
   - Enter recipient email
   - Click "Add Recipient"

3. **Templates** (`/templates`):
   - Click "Add New Template"
   - Enter subject and body
   - Click "Add Template"

4. **Trigger** (`/` dashboard):
   - Click "Trigger Warm-up Now" to test
   - Check Logs tab to see results

## Gmail App Password Setup

1. Go to: https://myaccount.google.com/security
2. Enable "2-Step Verification"
3. Go to: https://myaccount.google.com/apppasswords
4. Select "Mail" → "Other (Custom name)"
5. Name it: "Warmup Script"
6. Copy the 16-character password
7. Use in the Accounts form

## That's It!

Your warm-up automation is now running. The system will:
- Send emails every hour (configurable)
- Check for replies
- Auto-respond
- Log everything

## Next Steps

- View logs at: http://localhost:3000/logs
- Adjust cron schedule in `.env`: `CRON_SCHEDULE=*/30 * * * *` (every 30 min)
- Monitor console output from `npm run warmup`

## Production Deployment

```bash
# Build for production
npm run build

# Start production servers
npm start                    # Terminal 1
node services/warmup.js      # Terminal 2
```

Or use PM2:
```bash
npm install -g pm2
pm2 start npm --name "warmup-web" -- start
pm2 start services/warmup.js --name "warmup-worker"
```
