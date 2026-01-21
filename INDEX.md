# 📚 Documentation Index

Complete documentation for the Gmail Warmup Automation project.

## 🚀 Start Here

**New to the project?** Start with these:

1. **[GETTING_STARTED.md](GETTING_STARTED.md)** ⭐
   - Complete beginner's guide
   - Installation instructions
   - Gmail setup tutorial
   - First-time usage walkthrough

2. **[QUICKSTART.md](QUICKSTART.md)** ⚡
   - 5-minute quick start
   - Essential commands only
   - Get running fast

## 📖 Main Documentation

### For Users

- **[README.md](README.md)** 📘
  - Full project documentation
  - Features overview
  - API reference
  - Configuration guide
  - Troubleshooting
  - Production deployment

- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** 🏗️
  - Architecture overview
  - Technology stack
  - File structure
  - Database schema
  - Feature breakdown

### For Developers

- **[DELIVERY_SUMMARY.md](DELIVERY_SUMMARY.md)** ✅
  - Complete feature list
  - All files created
  - Implementation details
  - Quality checklist
  - Deployment options

## 🛠️ Setup & Installation

### Automated Setup

```bash
./setup.sh              # Run automated setup script
./test-install.sh       # Verify installation
```

### Manual Setup

See [GETTING_STARTED.md](GETTING_STARTED.md) for step-by-step instructions.

## 📂 Code Documentation

### Frontend (React/Next.js)

**Pages:**
- `pages/index.tsx` - Dashboard
- `pages/accounts.tsx` - Accounts management
- `pages/recipients.tsx` - Recipients management
- `pages/templates.tsx` - Templates management
- `pages/logs.tsx` - Activity logs

**Components:**
- `components/Layout.tsx` - Navigation layout

### Backend (API Routes)

**CRUD Endpoints:**
- `pages/api/accounts.ts` - Account operations
- `pages/api/recipients.ts` - Recipient operations
- `pages/api/templates.ts` - Template operations
- `pages/api/logs.ts` - Log retrieval

**Warmup Endpoints:**
- `pages/api/warmup/trigger.ts` - Manual trigger
- `pages/api/warmup/send.ts` - Send single email
- `pages/api/warmup/status.ts` - Status check

### Services

- `services/warmup.js` - Email automation worker
- `lib/prisma.ts` - Database client
- `prisma/seed.js` - Database seeder

### Configuration

- `prisma/schema.prisma` - Database schema
- `.env.example` - Environment template
- `tailwind.config.js` - Tailwind configuration
- `next.config.js` - Next.js configuration
- `tsconfig.json` - TypeScript configuration

## 🎯 Quick Reference

### Common Tasks

| Task | Command |
|------|---------|
| Install | `npm install` |
| Setup DB | `npm run db:push` |
| Start Web | `npm run dev` |
| Start Worker | `npm run warmup` |
| View DB | `npm run db:studio` |
| Test API | `curl http://localhost:3000/api/warmup/status` |

### File Locations

| Resource | Path |
|----------|------|
| Database | `prisma/dev.db` |
| Environment | `.env` |
| Logs (DB) | View via `/logs` page |
| Worker Service | `services/warmup.js` |
| Frontend Pages | `pages/*.tsx` |
| API Routes | `pages/api/*.ts` |

## 📊 Feature Documentation

### Email Features
- **Sending** - Via Gmail SMTP (nodemailer)
- **Receiving** - Via IMAP (imap-simple)
- **Auto-Reply** - Automated responses
- **Scheduling** - Cron-based (node-cron)

### Database Features
- **ORM** - Prisma with SQLite
- **Tables** - Accounts, Recipients, Templates, Logs
- **Operations** - Full CRUD via API
- **Management** - Prisma Studio GUI

### UI Features
- **Framework** - Next.js + React
- **Styling** - TailwindCSS
- **Forms** - Validation & error handling
- **Tables** - Pagination & actions
- **Navigation** - Responsive layout

## 🐛 Troubleshooting

### Quick Fixes

| Issue | Solution |
|-------|----------|
| Port in use | `PORT=3001 npm run dev` |
| DB missing | `npm run db:push` |
| Prisma error | `npm run db:generate` |
| Auth failed | Check app password |
| IMAP error | Enable IMAP in Gmail |
| Module error | `rm -rf node_modules && npm install` |

### Detailed Guides

See [GETTING_STARTED.md](GETTING_STARTED.md#troubleshooting) for detailed troubleshooting.

## 🚀 Deployment

### Development
```bash
npm run dev              # Next.js dev server
npm run warmup:dev       # Worker with auto-reload
```

### Production
```bash
npm run build            # Build Next.js
npm start                # Production server
node services/warmup.js  # Production worker
```

### Process Managers

**PM2 (Recommended):**
```bash
pm2 start npm --name warmup-web -- start
pm2 start services/warmup.js --name warmup-worker
```

**Docker:**
```bash
docker build -t gmail-warmup .
docker run -d -p 3000:3000 gmail-warmup
```

See [README.md](README.md#production) for detailed deployment guides.

## 📝 Examples

### API Examples

**Get Accounts:**
```bash
curl http://localhost:3000/api/accounts
```

**Create Account:**
```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"email":"sender@gmail.com","appPassword":"xxxx xxxx xxxx xxxx"}'
```

**Trigger Warmup:**
```bash
curl -X POST http://localhost:3000/api/warmup/trigger
```

### Database Examples

**View in Prisma Studio:**
```bash
npm run db:studio
```

**Query with Prisma:**
```javascript
const accounts = await prisma.account.findMany();
const logs = await prisma.log.findMany({
  where: { status: 'SUCCESS' }
});
```

## 🔐 Security

### Best Practices
- ✅ Use app passwords (not real passwords)
- ✅ Keep `.env` file secure
- ✅ Don't commit `.env` or database
- ✅ Use HTTPS in production
- ✅ Add authentication for web interface
- ✅ Regular backups of database

### Environment Variables

```bash
DATABASE_URL="file:./dev.db"    # Database location
CRON_SCHEDULE="0 * * * *"       # Cron schedule
```

## 📧 Gmail Setup

### Required Steps

1. **Enable 2FA**: https://myaccount.google.com/security
2. **Generate App Password**: https://myaccount.google.com/apppasswords
3. **Enable IMAP**: Gmail Settings → Forwarding and POP/IMAP

See [GETTING_STARTED.md](GETTING_STARTED.md#gmail-setup-required) for detailed instructions.

## 🎓 Learning Resources

### External Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [TailwindCSS](https://tailwindcss.com/docs)
- [Nodemailer](https://nodemailer.com/about/)
- [Gmail API](https://developers.google.com/gmail)

### Project Internals
- Database schema: `prisma/schema.prisma`
- API routes: `pages/api/`
- Frontend: `pages/` and `components/`
- Worker: `services/warmup.js`

## ✅ Checklists

### Initial Setup Checklist
- [ ] Node.js 18+ installed
- [ ] Project files downloaded
- [ ] Dependencies installed (`npm install`)
- [ ] Database initialized (`npm run db:push`)
- [ ] Environment configured (`.env`)
- [ ] Gmail 2FA enabled
- [ ] App passwords generated

### First Run Checklist
- [ ] Web server running (`npm run dev`)
- [ ] Worker running (`npm run warmup`)
- [ ] Browser open (http://localhost:3000)
- [ ] Account added via UI
- [ ] Recipient added via UI
- [ ] Template added via UI
- [ ] Test warmup triggered
- [ ] Logs verified

### Production Checklist
- [ ] Build successful (`npm run build`)
- [ ] Environment configured for production
- [ ] Database backed up
- [ ] SSL/HTTPS configured
- [ ] Process manager setup (PM2)
- [ ] Monitoring enabled
- [ ] Logs rotation configured

## 📞 Support

### Self-Help Resources
1. Read [GETTING_STARTED.md](GETTING_STARTED.md)
2. Check [README.md](README.md) troubleshooting section
3. Run `./test-install.sh` to verify setup
4. View logs in `/logs` page
5. Check console output from warmup service

### Common Questions

**Q: How do I change the schedule?**
A: Edit `CRON_SCHEDULE` in `.env` file

**Q: Where are emails logged?**
A: Database (`prisma/dev.db`) - view via `/logs` page

**Q: Can I use multiple Gmail accounts?**
A: Yes! Add as many as you want via `/accounts` page

**Q: How do I backup my data?**
A: Copy `prisma/dev.db` file

## 🎯 Document Purpose

| Document | When to Use |
|----------|-------------|
| GETTING_STARTED.md | First time setup |
| QUICKSTART.md | Speed run installation |
| README.md | Reference & deep dive |
| PROJECT_OVERVIEW.md | Understand architecture |
| DELIVERY_SUMMARY.md | See what's included |
| This file (INDEX.md) | Find any documentation |

## 📦 All Files

### Documentation (7 files)
- README.md
- QUICKSTART.md
- GETTING_STARTED.md
- PROJECT_OVERVIEW.md
- DELIVERY_SUMMARY.md
- INDEX.md (this file)
- .env.example

### Scripts (2 files)
- setup.sh
- test-install.sh

### Source Code (21+ files)
- Frontend: 7 React components/pages
- Backend: 7 API routes
- Services: 2 services
- Config: 6 configuration files

**Total: 30+ files ready to use!**

---

**👉 Start with [GETTING_STARTED.md](GETTING_STARTED.md) if you're new!**

**👉 Jump to [QUICKSTART.md](QUICKSTART.md) for fast installation!**
