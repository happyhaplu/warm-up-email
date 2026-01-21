# Gmail Warm-up Automation - Full Stack Application

A complete full-stack web application for automating Gmail account warm-up. Built with Next.js, SQLite (Prisma), TailwindCSS, and Node.js.

## 🌟 Features

### Frontend (Next.js + TailwindCSS)
- ✨ **Modern UI** - Clean, responsive interface built with TailwindCSS
- 📊 **Dashboard** - Overview and quick actions
- 👤 **Accounts Management** - Add/edit/delete Gmail sender accounts
- 📮 **Recipients Management** - Manage recipient email addresses
- 📝 **Templates Management** - Create and manage email templates
- 📈 **Activity Logs** - View all email activity with pagination

### Backend (Next.js API + SQLite)
- 🗄️ **SQLite Database** - Lightweight local database with Prisma ORM
- 🔌 **RESTful API** - Complete CRUD endpoints for all resources
- 📧 **Email Automation** - Send emails via Gmail SMTP (nodemailer)
- 📬 **IMAP Integration** - Check inbox and auto-reply to emails
- ⏰ **Cron Scheduling** - Automated hourly warm-up cycles
- 📝 **Comprehensive Logging** - All actions logged to database

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Gmail accounts with 2-Step Verification enabled
- App passwords generated for each Gmail account

### Installation

```bash
# Navigate to the project
cd /home/harekrishna/Projects/email-warmup

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Initialize database
npm run db:push

# Start development server
npm run dev

# In a separate terminal, start the warmup service
npm run warmup
```

Visit `http://localhost:3000` to access the application.

## 📋 Complete Setup Guide

### 1. Gmail App Passwords

For each Gmail account:

1. **Enable 2-Step Verification**:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable "2-Step Verification"

2. **Generate App Password**:
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other (Custom name)"
   - Name it "Warmup Automation"
   - Click "Generate"
   - Copy the 16-character password

### 2. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Create database and tables
npm run db:push

# Optional: Open Prisma Studio to view data
npm run db:studio
```

### 3. Add Data via Web Interface

1. Start dev server: `npm run dev`
2. Open `http://localhost:3000`
3. Add accounts, recipients, and templates

### 4. Start Warmup Service

```bash
npm run warmup
```

## 📁 Project Structure

```
email-warmup/
├── components/
│   └── Layout.tsx          # Navigation layout
├── lib/
│   └── prisma.ts           # Prisma client
├── pages/
│   ├── api/                # API routes
│   │   ├── accounts.ts
│   │   ├── recipients.ts
│   │   ├── templates.ts
│   │   ├── logs.ts
│   │   └── warmup/
│   ├── _app.tsx
│   ├── index.tsx           # Dashboard
│   ├── accounts.tsx        # Accounts page
│   ├── recipients.tsx      # Recipients page
│   ├── templates.tsx       # Templates page
│   └── logs.tsx            # Logs page
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── dev.db              # SQLite database
├── services/
│   └── warmup.js           # Automation worker
├── styles/
│   └── globals.css         # Tailwind styles
└── package.json
```

## 🔌 API Endpoints

### Accounts
- `GET /api/accounts` - List accounts
- `POST /api/accounts` - Create account
- `PUT /api/accounts` - Update account
- `DELETE /api/accounts?id={id}` - Delete account

### Recipients
- `GET /api/recipients` - List recipients
- `POST /api/recipients` - Create recipient
- `PUT /api/recipients` - Update recipient
- `DELETE /api/recipients?id={id}` - Delete recipient

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `PUT /api/templates` - Update template
- `DELETE /api/templates?id={id}` - Delete template

### Logs
- `GET /api/logs?page={page}&limit={limit}` - Get logs
- `DELETE /api/logs` - Clear all logs

### Warmup
- `POST /api/warmup/trigger` - Manual trigger
- `GET /api/warmup/status` - Service status

## 🗄️ Database Schema

```prisma
model Account {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  appPassword String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Recipient {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  createdAt DateTime @default(now())
}

model Template {
  id        Int      @id @default(autoincrement())
  subject   String
  body      String
  createdAt DateTime @default(now())
}

model Log {
  id        Int      @id @default(autoincrement())
  timestamp DateTime @default(now())
  sender    String
  recipient String
  subject   String
  status    String
  notes     String?
}
```

## ⚙️ Configuration

### Environment Variables

```bash
DATABASE_URL="file:./dev.db"
CRON_SCHEDULE=0 * * * *  # Every hour
```

### Cron Examples

```bash
# Every 30 minutes
CRON_SCHEDULE=*/30 * * * *

# Every 2 hours
CRON_SCHEDULE=0 */2 * * *

# Weekdays at 10 AM
CRON_SCHEDULE=0 10 * * 1-5
```

## 🔍 How It Works

1. **Warm-up Cycle**:
   - Load accounts, recipients, templates from database
   - Select random sender, recipient, template
   - Send email via Gmail SMTP
   - Log action to database
   - Check inbox for new emails
   - Auto-reply to new emails
   - Log auto-reply actions

2. **Scheduling**:
   - Runs hourly via node-cron
   - Configurable schedule
   - Manual trigger available

## 🐛 Troubleshooting

### Database Issues
```bash
rm prisma/dev.db
npm run db:push
```

### Authentication Errors
- Verify app password (16 chars)
- Ensure 2FA is enabled
- Regenerate app password

### IMAP Issues
- Enable IMAP in Gmail settings
- Check firewall (port 993)

### Dependencies
```bash
rm -rf node_modules package-lock.json
npm install
npm run db:generate
```

## 🚀 Production

### Using PM2

```bash
npm install -g pm2
pm2 start npm --name "warmup-web" -- start
pm2 start services/warmup.js --name "warmup-worker"
pm2 save
pm2 startup
```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --production
RUN npx prisma generate
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "npm run db:push && npm start & node services/warmup.js"]
```

## 📝 Development Scripts

```bash
npm run dev          # Next.js dev server
npm run warmup:dev   # Warmup with auto-reload
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to DB
npm run db:studio    # Open Prisma Studio
npm run build        # Build for production
npm start            # Production server
```

## 🔒 Security

- Never commit `.env` or database files
- Use app passwords only
- Keep dependencies updated
- Add authentication for production
- Backup database regularly

## ⚠️ Disclaimer

Use responsibly. Comply with Gmail TOS, CAN-SPAM Act, GDPR, and get recipient consent.

## 📄 License

MIT - For educational purposes.
