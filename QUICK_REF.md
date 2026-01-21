# 🚀 Quick Reference - Gmail Warmup Dashboard

## Access the App
```
http://localhost:3000
```

## Routes
| URL | Page |
|-----|------|
| `/login` | Login/Signup |
| `/dashboard` | Analytics Dashboard |
| `/dashboard/mailboxes` | Mailboxes Table |
| `/dashboard/recipients` | Recipients Table |
| `/dashboard/templates` | Templates List |
| `/dashboard/logs` | Activity Logs |

## Commands
```bash
# Start server
npm start

# Development
npm run dev

# Build
npm run build

# Start warmup worker
npm run warmup

# Database
npx prisma studio
npx prisma db push
```

## API Endpoints
```bash
GET  /api/accounts
POST /api/accounts/bulk-import
GET  /api/recipients
POST /api/recipients/bulk-import
GET  /api/templates
POST /api/templates/bulk-import
GET  /api/logs
POST /api/auth/logout
```

## Analytics Calculations
```javascript
// From Logs table
totalSent = logs.filter(l => l.status === 'SUCCESS').length
totalReplies = logs.filter(l => l.status === 'REPLY_SUCCESS').length
replyRate = (totalReplies / totalSent) * 100
failures = logs.filter(l => l.status.includes('FAILED')).length
```

## Environment Variables
```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://dcxnduxjczwzsxtitgjx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-key"
```

## Status
- ✅ Server: http://localhost:3000 (RUNNING)
- ✅ Build: Production ready
- ✅ Database: Supabase PostgreSQL
- ✅ Auth: Demo mode (optional)
- ✅ All features: Implemented

## Documentation
- `README_DASHBOARD.md` - Setup guide
- `FEATURES_COMPLETE.md` - Feature list
- `COMPLETE_READY.md` - Summary
