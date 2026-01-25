# Warmup Settings API Documentation

## Overview
Comprehensive warmup settings per mailbox with customizable limits, reply rates, and bulk update capabilities.

## Features

✅ **Per-Mailbox Warmup Settings**
- Custom start count (1-100 emails/day)
- Custom daily increase (0-50 emails)
- Custom maximum daily limit (1-1000 or unlimited)
- Custom reply rate (0-100%)
- Enable/disable warmup per mailbox

✅ **Unlimited Sending**
- Set `warmupMaxDaily` to `0` or `-1` for unlimited
- Progressive increase continues without cap

✅ **Bulk Edit**
- Update multiple mailboxes at once
- Apply same settings to all selected mailboxes

✅ **Random Delays**
- 3-15 minute random delays between emails
- Natural sending patterns to avoid detection

## API Endpoints

### User Endpoints

#### 1. Update Single Mailbox (PUT)
**Endpoint:** `PUT /api/user/mailboxes`

**Request Body:**
```json
{
  "id": 1,
  "warmupEnabled": true,
  "warmupStartCount": 5,
  "warmupIncreaseBy": 3,
  "warmupMaxDaily": 50,
  "warmupReplyRate": 40
}
```

**Parameters:**
- `id` (required): Mailbox ID
- `warmupEnabled` (optional): Enable/disable warmup
- `warmupStartCount` (optional): Starting emails per day (1-100)
- `warmupIncreaseBy` (optional): Daily increase amount (0-50)
- `warmupMaxDaily` (optional): Maximum daily emails (1-1000, or 0/-1 for unlimited)
- `warmupReplyRate` (optional): Reply rate percentage (0-100)
- `dailyWarmupQuota` (optional): Legacy quota field (1-1000)

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "warmupEnabled": true,
  "warmupStartCount": 5,
  "warmupIncreaseBy": 3,
  "warmupMaxDaily": 50,
  "warmupReplyRate": 40,
  "warmupStartDate": "2026-01-23T00:00:00.000Z",
  ...
}
```

#### 2. Bulk Update Mailboxes (PATCH)
**Endpoint:** `PATCH /api/user/mailboxes`

**Request Body:**
```json
{
  "mailboxIds": [1, 2, 3],
  "warmupEnabled": true,
  "warmupStartCount": 5,
  "warmupIncreaseBy": 3,
  "warmupMaxDaily": 50,
  "warmupReplyRate": 40
}
```

**Parameters:**
- `mailboxIds` (required): Array of mailbox IDs to update
- Other parameters same as single update

**Response:**
```json
{
  "success": true,
  "updated": 3,
  "settings": {
    "warmupEnabled": true,
    "warmupStartCount": 5,
    "warmupIncreaseBy": 3,
    "warmupMaxDaily": 50,
    "warmupReplyRate": 40
  }
}
```

### Admin Endpoints

#### 3. Admin Update Single Mailbox (PUT)
**Endpoint:** `PUT /api/admin/mailboxes`

Same as user endpoint but accessible by admins for any mailbox.

#### 4. Admin Bulk Update (PATCH)
**Endpoint:** `PATCH /api/admin/mailboxes`

**Request Body:**
```json
{
  "mailboxIds": [1, 2, 3, 4, 5],
  "warmupEnabled": true,
  "warmupStartCount": 3,
  "warmupIncreaseBy": 2,
  "warmupMaxDaily": 0,
  "warmupReplyRate": 35
}
```

**Note:** Admin can update any mailboxes, not just owned ones.

## Warmup Settings Explained

### 1. Start Count (`warmupStartCount`)
- **Default:** 3
- **Range:** 1-100
- **Description:** Number of emails to send on Day 1

**Example:**
```
warmupStartCount: 5
Day 1: 5 emails
```

### 2. Increase By (`warmupIncreaseBy`)
- **Default:** 3
- **Range:** 0-50
- **Description:** How many additional emails to send each day

**Example:**
```
warmupStartCount: 5
warmupIncreaseBy: 3
Day 1: 5 emails
Day 2: 8 emails
Day 3: 11 emails
Day 4: 14 emails
```

### 3. Maximum Daily (`warmupMaxDaily`)
- **Default:** 20
- **Range:** 1-1000, or 0/-1 for unlimited
- **Description:** Cap on daily emails (0 or -1 = no limit)

**Example with limit:**
```
warmupStartCount: 5
warmupIncreaseBy: 10
warmupMaxDaily: 30
Day 1: 5 emails
Day 2: 15 emails
Day 3: 25 emails
Day 4: 30 emails (capped)
Day 5: 30 emails (capped)
```

**Example unlimited:**
```
warmupStartCount: 5
warmupIncreaseBy: 10
warmupMaxDaily: 0  (unlimited)
Day 1: 5 emails
Day 2: 15 emails
Day 3: 25 emails
Day 4: 35 emails
Day 5: 45 emails
... continues growing
```

### 4. Reply Rate (`warmupReplyRate`)
- **Default:** 35
- **Range:** 0-100
- **Description:** Percentage of received emails to reply to

**Example:**
```
warmupReplyRate: 40
Receives 10 emails → Replies to ~4 emails (40%)
Receives 100 emails → Replies to ~40 emails (40%)
```

### 5. Warmup Enabled (`warmupEnabled`)
- **Default:** true
- **Values:** true/false
- **Description:** Whether this mailbox participates in warmup

## Calculation Formula

**Daily Limit = min(startCount + (dayNumber - 1) × increaseBy, maxDaily)**

Unless `maxDaily` is 0 or -1 (unlimited), then:
**Daily Limit = startCount + (dayNumber - 1) × increaseBy**

## Use Cases

### Conservative Warmup (New Mailbox)
```json
{
  "warmupStartCount": 2,
  "warmupIncreaseBy": 2,
  "warmupMaxDaily": 20,
  "warmupReplyRate": 35
}
```
Result: Day 1: 2, Day 2: 4, Day 3: 6... caps at 20

### Aggressive Warmup (Aged Mailbox)
```json
{
  "warmupStartCount": 10,
  "warmupIncreaseBy": 5,
  "warmupMaxDaily": 100,
  "warmupReplyRate": 45
}
```
Result: Day 1: 10, Day 2: 15, Day 3: 20... caps at 100

### Unlimited Sending (Established Mailbox)
```json
{
  "warmupStartCount": 20,
  "warmupIncreaseBy": 10,
  "warmupMaxDaily": 0,
  "warmupReplyRate": 50
}
```
Result: Day 1: 20, Day 2: 30, Day 3: 40... no cap

### Maintenance Mode (No Increase)
```json
{
  "warmupStartCount": 15,
  "warmupIncreaseBy": 0,
  "warmupMaxDaily": 15,
  "warmupReplyRate": 30
}
```
Result: Stays at 15 emails/day indefinitely

## Random Delay Feature

### Sending Delays
- **Range:** 3-15 minutes between each email send
- **Purpose:** Mimics natural human sending patterns
- **Implementation:** Automatic, no configuration needed

**Example Timeline:**
```
10:00 AM - Email 1 sent
10:07 AM - Email 2 sent (7 min delay)
10:20 AM - Email 3 sent (13 min delay)
10:24 AM - Email 4 sent (4 min delay)
```

### Reply Delays
- **Range:** 5-240 minutes (4 hours)
- **Purpose:** Natural reply timing
- **Implementation:** Automatic

## Bulk Update Examples

### Enable Warmup for All Mailboxes
```bash
curl -X PATCH http://localhost:3000/api/user/mailboxes \
  -H "Content-Type: application/json" \
  -d '{
    "mailboxIds": [1, 2, 3, 4],
    "warmupEnabled": true
  }'
```

### Set Conservative Settings for New Mailboxes
```bash
curl -X PATCH http://localhost:3000/api/user/mailboxes \
  -H "Content-Type: application/json" \
  -d '{
    "mailboxIds": [5, 6, 7],
    "warmupStartCount": 2,
    "warmupIncreaseBy": 2,
    "warmupMaxDaily": 15,
    "warmupReplyRate": 30
  }'
```

### Set Unlimited for Established Mailboxes
```bash
curl -X PATCH http://localhost:3000/api/admin/mailboxes \
  -H "Content-Type: application/json" \
  -d '{
    "mailboxIds": [10, 11, 12],
    "warmupMaxDaily": 0,
    "warmupReplyRate": 50
  }'
```

## Validation Rules

### warmupStartCount
- Min: 1
- Max: 100
- Error: "Start count must be between 1 and 100"

### warmupIncreaseBy
- Min: 0
- Max: 50
- Error: "Increase must be between 0 and 50"

### warmupMaxDaily
- Min: 1 (or 0/-1 for unlimited)
- Max: 1000
- Special: 0 or -1 = unlimited
- Error: "Max daily must be between 1-1000, or 0/-1 for unlimited"

### warmupReplyRate
- Min: 0
- Max: 100
- Error: "Reply rate must be between 0 and 100"

### dailyWarmupQuota
- Min: 1
- Max: 1000
- Error: "Daily quota must be between 1 and 1000"

## Database Schema

Relevant fields in `Account` model:
```prisma
model Account {
  warmupEnabled     Boolean   @default(true)
  warmupStartDate   DateTime?
  warmupMaxDaily    Int       @default(20)
  warmupStartCount  Int       @default(3)
  warmupIncreaseBy  Int       @default(3)
  warmupReplyRate   Int       @default(35)
  dailyWarmupQuota  Int       @default(2)  // Legacy field
}
```

## Frontend Integration

### Update Single Mailbox
```javascript
async function updateMailboxWarmup(mailboxId, settings) {
  const response = await fetch('/api/user/mailboxes', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: mailboxId,
      ...settings
    })
  });
  return response.json();
}

// Usage
await updateMailboxWarmup(1, {
  warmupStartCount: 5,
  warmupIncreaseBy: 3,
  warmupMaxDaily: 50
});
```

### Bulk Update
```javascript
async function bulkUpdateMailboxes(mailboxIds, settings) {
  const response = await fetch('/api/user/mailboxes', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mailboxIds,
      ...settings
    })
  });
  return response.json();
}

// Usage
await bulkUpdateMailboxes([1, 2, 3], {
  warmupEnabled: true,
  warmupReplyRate: 40
});
```

## Best Practices

### New Mailboxes (0-30 days old)
```json
{
  "warmupStartCount": 2,
  "warmupIncreaseBy": 2,
  "warmupMaxDaily": 20,
  "warmupReplyRate": 35
}
```

### Aged Mailboxes (1-6 months old)
```json
{
  "warmupStartCount": 5,
  "warmupIncreaseBy": 5,
  "warmupMaxDaily": 50,
  "warmupReplyRate": 40
}
```

### Established Mailboxes (6+ months old)
```json
{
  "warmupStartCount": 10,
  "warmupIncreaseBy": 10,
  "warmupMaxDaily": 0,
  "warmupReplyRate": 50
}
```

## Monitoring

Check warmup progress:
```sql
SELECT 
  email,
  warmupEnabled,
  warmupStartCount,
  warmupIncreaseBy,
  warmupMaxDaily,
  warmupReplyRate,
  DATE(warmupStartDate) as started,
  DATEDIFF(CURRENT_DATE, DATE(warmupStartDate)) + 1 as day_number
FROM accounts
WHERE warmupEnabled = true;
```

## Troubleshooting

### Issue: Mailbox not sending
**Check:**
1. `warmupEnabled` is `true`
2. `warmupStartCount` > 0
3. Daily quota not exceeded

### Issue: Too many/few emails
**Solution:** Adjust `warmupStartCount` and `warmupIncreaseBy`

### Issue: Want unlimited sending
**Solution:** Set `warmupMaxDaily` to `0` or `-1`

### Issue: Reply rate too high/low
**Solution:** Adjust `warmupReplyRate` (0-100%)

## Summary

This warmup system provides complete flexibility:
- ✅ Start slow or aggressive
- ✅ Increase gradually or rapidly  
- ✅ Cap at any limit or go unlimited
- ✅ Control reply behavior
- ✅ Update individually or in bulk
- ✅ Natural random timing
