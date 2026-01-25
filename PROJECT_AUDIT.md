# 📋 PROJECT AUDIT: Gmail Warm-up Tool (Next.js + Supabase)

## Executive Summary

This is a comprehensive email warmup automation platform built with Next.js, Prisma (PostgreSQL/Supabase), and includes both user and admin interfaces. The system automatically sends emails between mailboxes in a controlled manner to improve email deliverability.

---

## 🔑 1. WARM-UP SENDING IMPLEMENTATION

### Core Module: `/lib/warmup-cron.ts`

**Main Class:** `WarmupCronService`

**Sending Flow:**
```
runCycle() → getMailboxQuotaInfo() → sendWarmupEmail()
```

### How Emails Are Sent:

1. **Mailbox Selection:**
   - Fetches all mailboxes where `warmupEnabled = true`
   - Filters mailboxes with remaining daily quota (`remaining > 0`)
   - Randomizes mailbox order to avoid patterns: `shuffled.sort(() => Math.random() - 0.5)`

2. **Recipient Pool:**
   - Recipients are **ALL other mailboxes in the system** (peer-to-peer warmup)
   - Random selection: `recipients[Math.floor(Math.random() * recipients.length)]`
   - No dedicated recipient pool - all mailboxes act as both senders and recipients

3. **Daily Quota Calculation:**
   - **Function:** `getDailyLimit()` in `/lib/warmup-utils.ts`
   - **Formula:** `startCount + (daysSinceStart - 1) × increaseBy`
   - **Parameters:**
     - `warmupStartCount`: Default = 3 (configurable per mailbox)
     - `warmupIncreaseBy`: Default = 3 (configurable per mailbox)
     - `warmupMaxDaily`: Default = 20 (cap, configurable)
   - **Example:**
     - Day 1: 3 emails
     - Day 2: 6 emails (3 + 1×3)
     - Day 3: 9 emails (3 + 2×3)
     - Day 7: 21 emails → capped at 20

4. **Randomized Send Delays:**
   - **Function:** `getRandomSendDelay()` in `/lib/warmup-utils.ts`
   - **Range:** 3-15 minutes between sends
   - **Implementation:**
     ```typescript
     const minMinutes = 3;
     const maxMinutes = 15;
     const delay = Math.random() * (max - min) + min;
     await new Promise(resolve => setTimeout(resolve, delay));
     ```
   - First mailbox sends immediately, subsequent sends wait 3-15 minutes

5. **SMTP Sending:**
   - **Library:** `nodemailer`
   - **Configuration:** Lines 317-332 in `warmup-cron.ts`
     - Universal SMTP settings for Gmail, Outlook, Yahoo
     - Port 587 (TLS) or 465 (SSL)
     - Provider-specific auth type adjustments
   - **Email Construction:**
     - Randomized subject (adds emojis, Re:, punctuation)
     - Randomized body (random greetings/closings)
     - HTML and text versions

6. **Check Interval:**
   - **Constant:** `CHECK_INTERVAL_MS = 5 * 60 * 1000` (5 minutes)
   - Cron runs every 5 minutes checking all mailboxes

---

## 🔑 2. WARM-UP REPLYING IMPLEMENTATION

### Reply Function: `checkAndReplyToInbox()` in `/lib/warmup-cron.ts`

**Reply Flow:**
```
checkAndReplyToInbox() → IMAP fetch → Reply rate check → Send reply
```

### How Replies Are Generated:

1. **IMAP Connection:**
   - **Library:** `imap-simple`
   - Connects to each mailbox's IMAP server
   - Opens INBOX folder
   - Searches for UNSEEN (unread) messages

2. **Reply Rate Enforcement:**
   - **Field:** `warmupReplyRate` (default: 35%)
   - **Logic:** Lines 456-461
     ```typescript
     const shouldReply = Math.random() * 100 < account.warmupReplyRate;
     if (!shouldReply) {
       console.log(`⏭️ Skipping reply (reply rate: ${warmupReplyRate}%)`);
       markAsRead();
       continue;
     }
     ```
   - Example: 35% means approximately 1 in 3 emails gets a reply

3. **Sender Validation:**
   - Only replies to emails from **mailboxes in the warmup pool**
   - Checks sender email against `mailboxEmails` Set
   - External emails are ignored

4. **Reply Template Selection:**
   - **Source:** `ReplyTemplate` table in database
   - Random selection from available reply templates
   - **Randomization:** `randomizeBody()` adds random greetings/closings

5. **Reply Delay:**
   - **Function:** `getRandomReplyDelay()` in `/lib/warmup-utils.ts`
   - **Range:** 5-240 minutes (5 mins to 4 hours)
   - **Note:** Currently logged but not implemented (immediate reply)
   - Line 464: `console.log('Will reply in ${delayMinutes} minutes')`
   - **TODO:** Actual delayed reply needs job queue implementation

6. **Reply Sending:**
   - Same SMTP configuration as sending
   - Includes proper email threading headers:
     - `inReplyTo`: Original message ID
     - `references`: Original message ID
   - Subject: `Re: ${originalSubject}`

7. **Logging:**
   - Creates log entry with `status: 'replied'`
   - Updates `WarmupLog.repliedCount`
   - Marks email as read (`\Seen` flag)

---

## 🔑 3. MAILBOX POOL MANAGEMENT

### Database Model: `Account` in `/prisma/schema.prisma`

**Key Fields:**
- `userId`: Owner of the mailbox
- `email`, `appPassword`: SMTP/IMAP credentials
- `smtpHost`, `smtpPort`, `imapHost`, `imapPort`
- `warmupEnabled`: Enable/disable warmup for this mailbox
- `warmupStartDate`: When warmup began (auto-set on first run)
- `warmupMaxDaily`: Maximum emails per day (default: 20)
- `warmupStartCount`: Starting count (default: 3)
- `warmupIncreaseBy`: Daily increase (default: 3)
- `warmupReplyRate`: Reply percentage (default: 35%)

### Selection Logic:

1. **Sender Selection:**
   - All mailboxes with `warmupEnabled = true`
   - Filters by remaining quota
   - **Randomization:** `shuffled.sort(() => Math.random() - 0.5)`
   - Line 118 in `warmup-cron.ts`

2. **Recipient Selection:**
   - **Pool:** All accounts except sender (`id: { not: senderId }`)
   - **Random pairing:** `Math.floor(Math.random() * recipients.length)`
   - Line 282 in `warmup-cron.ts`
   - **No weighted selection** - all recipients equally likely

3. **Bulk Edit Settings:**
   - **Admin:** `/pages/admin/mailboxes.tsx`
   - **User:** `/pages/user/dashboard.tsx`
   - **Modal:** `showBulkWarmupModal` state
   - **API:** `/pages/api/admin/mailboxes.ts` (bulk update endpoint)
   - Can update all 5 warmup settings for multiple mailboxes at once:
     - `warmupEnabled`
     - `warmupStartCount`
     - `warmupIncreaseBy`
     - `warmupMaxDaily`
     - `warmupReplyRate`

---

## 🔑 4. LOGGING IMPLEMENTATION

### Database Models:

1. **`Log` Table** - Individual send/reply events
   ```prisma
   model Log {
     id: Int
     timestamp: DateTime
     senderId: Int (foreign key to Account)
     recipientId: Int (foreign key to Account)
     sender: String (email)
     recipient: String (email)
     subject: String
     status: String ("sent", "replied", "failed")
     notes: String (error messages, etc.)
   }
   ```

2. **`WarmupLog` Table** - Daily aggregate stats
   ```prisma
   model WarmupLog {
     mailboxId: Int
     date: DateTime (date only)
     dayNumber: Int (days since warmup start)
     sentCount: Int (emails sent today)
     repliedCount: Int (replies sent today)
     dailyLimit: Int (what the limit was)
   }
   ```

### Logging Points:

1. **Successful Send:** Line 340 in `warmup-cron.ts`
   ```typescript
   await prisma.log.create({
     data: {
       senderId, recipientId,
       sender, recipient, subject,
       status: 'sent',
       notes: 'Automatic warmup email'
     }
   });
   ```

2. **Failed Send:** Line 353
   ```typescript
   await prisma.log.create({
     status: 'failed',
     notes: error.message
   });
   ```

3. **Reply Sent:** Line 534
   ```typescript
   await prisma.log.create({
     status: 'replied',
     notes: 'Automatic warmup reply (intended delay: Nm)'
   });
   ```

4. **Daily Stats Update:** Line 218
   ```typescript
   await prisma.warmupLog.upsert({
     where: { mailboxId_date },
     update: { sentCount, dailyLimit, dayNumber },
     create: { ... }
   });
   ```

### Log Access:

1. **User Logs:**
   - **Page:** `/pages/user/logs.tsx`
   - **API:** `/pages/api/user/logs.ts`
   - **Filter:** Only shows logs where user owns sender or recipient mailbox
   - **Query:**
     ```typescript
     where: {
       OR: [
         { senderAccount: { userId: user.id } },
         { recipientAccount: { userId: user.id } }
       ]
     }
     ```

2. **Admin Logs:**
   - **Page:** `/pages/admin/logs.tsx`
   - **API:** `/pages/api/admin/logs.ts`
   - **Access:** All logs system-wide
   - **Filters:** Date range, status, sender/recipient search

---

## 🔑 5. FEATURES IMPLEMENTED

### ✅ User Side Features:

1. **Mailbox Management** (`/pages/user/dashboard.tsx`)
   - ✅ Connect Gmail mailboxes (SMTP + IMAP credentials)
   - ✅ Bulk CSV import of mailboxes
   - ✅ Test SMTP/IMAP connection before saving
   - ✅ Enable/disable warmup per mailbox
   - ✅ Individual warmup settings per mailbox
   - ✅ Bulk edit warmup settings (multiple mailboxes)
   - ✅ Delete mailboxes (single or bulk)
   - ✅ View mailbox statistics

2. **Dashboard Stats** (`/pages/api/user/stats.ts`)
   - ✅ Total emails sent
   - ✅ Total replies received
   - ✅ Reply rate percentage
   - ✅ Failed sends count

3. **Logs** (`/pages/user/logs.tsx`)
   - ✅ Personal activity logs (filtered by ownership)
   - ✅ Pagination (10/20/50/100 per page)
   - ✅ Status filtering (sent/replied/failed)
   - ✅ Date range filtering
   - ✅ Search by sender/recipient

4. **Warmup Settings** (`/pages/api/user/warmup-settings.ts`)
   - ✅ Per-mailbox configuration:
     - Start count (1-10, default: 3)
     - Daily increase (1-5, default: 3)
     - Max daily (5-20, default: 20)
     - Reply rate (25-45%, default: 35%)
   - ✅ Validation on API level

### ✅ Admin Side Features:

1. **Mailbox Pool** (`/pages/admin/mailboxes.tsx`)
   - ✅ View all mailboxes system-wide
   - ✅ Filter by user ownership
   - ✅ Bulk warmup settings editor
   - ✅ Bulk delete mailboxes
   - ✅ Enable/disable warmup globally
   - ✅ View warmup statistics per mailbox

2. **Templates** (`/pages/admin/templates.tsx`)
   - ✅ **Send Templates** (initial emails)
     - Subject + Body fields
     - CRUD operations
     - Randomization applied automatically
   - ✅ **Reply Templates** (auto-replies)
     - Text-only field
     - CRUD operations
     - Randomization applied automatically

3. **User Management** (`/pages/admin/users.tsx`)
   - ✅ View all users
   - ✅ Edit user details (name, email, role)
   - ✅ Assign subscription plans
   - ✅ Suspend/activate users
   - ✅ Delete users (cascade delete mailboxes)
   - ✅ View usage vs plan limits
   - ✅ Audit logging of all admin actions

4. **Plan Management** (`/pages/admin/plans.tsx`)
   - ✅ Create/edit/delete subscription plans
   - ✅ Set limits: mailbox count, daily emails, monthly emails
   - ✅ Pricing and features
   - ✅ Active/inactive status
   - ✅ View user count per plan

5. **Global Logs** (`/pages/admin/logs.tsx`)
   - ✅ All system activity
   - ✅ Advanced filtering
   - ✅ Export capability
   - ✅ Real-time status

6. **Warmup Control** (`/pages/admin/warmup.tsx`)
   - ✅ Start/stop cron service
   - ✅ View service status
   - ✅ System statistics
   - ✅ Last run timestamp

### ✅ Warmup Engine Features:

1. **Quota Enforcement:**
   - ✅ Gradual ramp-up (start + increase × days)
   - ✅ Daily cap (`warmupMaxDaily`)
   - ✅ Per-mailbox customization
   - ✅ Automatic quota tracking in `WarmupLog`

2. **Randomized Intervals:**
   - ✅ Send delay: 3-15 minutes between emails
   - ✅ Reply delay: 5-240 minutes (logged, not yet enforced)
   - ✅ Randomized mailbox order per cycle

3. **Auto-Reply Logic:**
   - ✅ Reply rate enforcement (e.g., 35%)
   - ✅ Only replies to pool mailboxes
   - ✅ Proper email threading (In-Reply-To, References)
   - ✅ Template-based replies with randomization

4. **Content Randomization:**
   - ✅ Subject variations (emojis, Re:, punctuation)
   - ✅ Body variations (greetings, closings)
   - ✅ Functions: `randomizeSubject()`, `randomizeBody()`

5. **Logging & Tracking:**
   - ✅ All sends logged with sender/recipient/subject
   - ✅ All replies logged with status
   - ✅ Failed sends logged with error messages
   - ✅ Daily aggregates in `WarmupLog`

6. **Auto-Initialization:**
   - ✅ Warmup service starts automatically on app launch
   - ✅ Module: `/lib/warmup-auto-init.ts`
   - ✅ Triggered by `/pages/_app.tsx`

---

## 📊 Database Schema Summary

```
users (Supabase Auth)
  ├── accounts (mailboxes)
  │     ├── sentLogs (Log)
  │     ├── receivedLogs (Log)
  │     └── warmupLogs (WarmupLog)
  ├── auditLogs (AuditLog)
  └── plan (Plan)

send_templates (SendTemplate)
reply_templates (ReplyTemplate)
logs (Log) - individual events
warmup_logs (WarmupLog) - daily aggregates
audit_logs (AuditLog) - admin actions
plans (Plan) - subscription tiers
```

---

## 🎯 Workflow Diagram

```
┌─────────────────────────────────────────────┐
│   WARMUP CRON (Every 5 minutes)            │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  1. Get Mailboxes (warmupEnabled = true)   │
│     - Calculate daily quota                 │
│     - Filter by remaining quota > 0         │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  2. Randomize Mailbox Order                 │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  3. For Each Mailbox:                       │
│     ┌─────────────────────────────────────┐ │
│     │ a. Wait 3-15 min (except first)     │ │
│     │ b. Select random recipient          │ │
│     │ c. Pick random send template        │ │
│     │ d. Randomize subject/body           │ │
│     │ e. Send via SMTP                    │ │
│     │ f. Log to database                  │ │
│     └─────────────────────────────────────┘ │
│     ┌─────────────────────────────────────┐ │
│     │ g. Check IMAP inbox                 │ │
│     │ h. For each unread from pool:       │ │
│     │    - Check reply rate (35%)         │ │
│     │    - Pick reply template            │ │
│     │    - Send reply via SMTP            │ │
│     │    - Mark as read                   │ │
│     │    - Log reply                      │ │
│     └─────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## ⚠️ Current Limitations & TODOs

~~1. **Reply Delay Not Enforced:**~~ ✅ **COMPLETED**
   - ~~Reply delay is calculated (5-240 min) but replies are sent immediately~~
   - ~~Requires job queue (Bull, BullMQ) for deferred execution~~
   - **Now implemented:** Replies scheduled in `ScheduledReply` table, processed every cron cycle

~~2. **No Email Uniqueness Check:**~~ ✅ **COMPLETED**
   - ~~May send multiple emails to same recipient in one cycle~~
   - ~~Could implement "sent today" tracking per recipient~~
   - **Now implemented:** Checks logs before sending, skips if already sent today

~~3. **No Dedicated Recipient Pool:**~~ ✅ **COMPLETED**
   - Uses peer-to-peer model (all mailboxes are senders AND recipients)
   - Original `recipients` table exists but is unused
   - **Now implemented:** Toggle between peer-to-peer and dedicated pool via `WARMUP_USE_RECIPIENT_POOL` env var

~~4. **Plan Limits Not Enforced in Warmup Engine:**~~ ✅ **COMPLETED**
   - ~~Plans exist with `mailboxLimit`, `dailyEmailLimit`~~
   - ~~Warmup engine doesn't check user's plan before sending~~
   - ~~Need to integrate plan checks in `getMailboxQuotaInfo()`~~
   - **Now implemented:** Plan limits enforced in warmup cycle AND mailbox creation API

~~5. **No Rate Limiting:**~~ ✅ **COMPLETED**
   - ~~No global rate limit across all mailboxes~~
   - ~~Could overwhelm SMTP servers if many mailboxes configured~~
   - **Now implemented:** Global rate limiting (500/hour default) with `RateLimitLog` table

### New Improvements (Completed January 25, 2026)

✅ **Configuration System:**
- All warmup settings centralized in `lib/warmup-config.ts`
- Environment variable support for customization
- Validation function for API endpoints

✅ **Database Enhancements:**
- New `ScheduledReply` table for deferred replies
- New `RateLimitLog` table for global rate limiting
- Enhanced `Recipient` table with `isActive` and `tags`

✅ **Comprehensive Testing:**
- 22 unit tests covering all new features
- Test file: `tests/warmup-improvements.test.ts`
- Coverage: quota calculation, plan limits, validation, integration flows

For detailed implementation, see: `WARMUP_IMPLEMENTATION_COMPLETE.md`

---

## ✨ Code Quality Observations

**Strengths:**
- ✅ Well-structured with separation of concerns
- ✅ Comprehensive error handling and logging
- ✅ TypeScript type safety throughout
- ✅ Randomization implemented correctly
- ✅ Database relations properly defined
- ✅ Both user and admin interfaces complete
- ✅ **NEW:** Centralized configuration system with env var support
- ✅ **NEW:** Comprehensive test coverage (22 unit tests)
- ✅ **NEW:** Plan enforcement at engine and API levels
- ✅ **NEW:** Natural reply timing with deferred execution
- ✅ **NEW:** Global rate limiting for server protection

**Areas for Improvement:**
- ~~⚠️ Hardcoded magic numbers (could use config file)~~ ✅ **FIXED**
- ~~⚠️ Reply delay implementation incomplete~~ ✅ **FIXED**
- ~~⚠️ No tests written~~ ✅ **FIXED**
- ⚠️ Some duplicate code between user/admin pages (minor)

---

## 📁 Key Files Reference

| Purpose | File Path |
|---------|-----------|
| **Warmup Engine** | `/lib/warmup-cron.ts` |
| **Warmup Utilities** | `/lib/warmup-utils.ts` |
| **Auto-start** | `/lib/warmup-auto-init.ts` |
| **Database Schema** | `/prisma/schema.prisma` |
| **User Dashboard** | `/pages/user/dashboard.tsx` |
| **Admin Mailboxes** | `/pages/admin/mailboxes.tsx` |
| **Admin Templates** | `/pages/admin/templates.tsx` |
| **Admin Users** | `/pages/admin/users.tsx` |
| **Admin Plans** | `/pages/admin/plans.tsx` |
| **Warmup Settings API** | `/pages/api/user/warmup-settings.ts` |
| **Cron Control API** | `/pages/api/warmup/cron.ts` |

---

## 🚀 Quick Reference

### Starting the Application
```bash
npm run dev        # Start Next.js dev server (auto-starts warmup)
```

### Warmup Configuration
- **Location:** Each mailbox's settings
- **Start Count:** 1-10 emails (default: 3)
- **Increase By:** 1-5 emails/day (default: 3)
- **Max Daily:** 5-20 emails (default: 20)
- **Reply Rate:** 25-45% (default: 35%)

### Key API Endpoints
- `POST /api/user/warmup-settings` - Update mailbox warmup settings
- `GET /api/warmup/status` - Check cron service status
- `POST /api/warmup/cron` - Start/stop warmup service (admin)
- `GET /api/user/logs` - Get user's activity logs
- `GET /api/admin/logs` - Get all system logs (admin)

### Database Tables
- `users` - User accounts
- `plans` - Subscription tiers
- `accounts` - Email mailboxes
- `send_templates` - Initial email templates
- `reply_templates` - Auto-reply templates
- `logs` - Individual send/reply events
- `warmup_logs` - Daily aggregate statistics
- `audit_logs` - Admin action tracking

---

**Audit Date:** January 25, 2026  
**Status:** ✅ All core features implemented and functional
