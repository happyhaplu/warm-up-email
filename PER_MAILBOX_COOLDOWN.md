# ✅ Per-Mailbox Cooldown Feature

## What is Per-Mailbox Cooldown?

**Problem:** Without cooldown, the same mailbox could send multiple emails in quick succession (e.g., every few seconds), which looks unnatural and can trigger spam filters.

**Solution:** After a mailbox sends an email, it goes into "cooldown" and cannot send again for 3-10 minutes (randomized). During this cooldown period, OTHER mailboxes continue sending, creating natural patterns.

## How It Works

### Example with 48 Mailboxes:

```
Time 00:00 - Mailbox A sends → Goes into cooldown for 5 minutes
Time 00:02 - Mailbox B sends → Goes into cooldown for 7 minutes  
Time 00:04 - Mailbox C sends → Goes into cooldown for 4 minutes
Time 00:06 - Mailbox D sends → Goes into cooldown for 6 minutes
...
Time 00:04 - Mailbox C cooldown expires → Can send again
Time 00:05 - Mailbox A cooldown expires → Can send again
```

**Result:** Natural sending pattern where each mailbox has realistic gaps between sends, just like a real person would.

## Configuration

### Default Settings (in `.env`):

```bash
# Minimum gap between sends from same mailbox: 3 minutes
WARMUP_MAILBOX_COOLDOWN_MIN_MS=180000

# Maximum gap: 10 minutes  
WARMUP_MAILBOX_COOLDOWN_MAX_MS=600000

# Randomize cooldown for more natural patterns
WARMUP_MAILBOX_COOLDOWN_RANDOMIZE=true
```

### Adjust for Your Needs:

**More Aggressive (faster warmup, riskier):**
```bash
WARMUP_MAILBOX_COOLDOWN_MIN_MS=60000    # 1 minute min
WARMUP_MAILBOX_COOLDOWN_MAX_MS=300000   # 5 minutes max
```

**More Conservative (slower, safer):**
```bash
WARMUP_MAILBOX_COOLDOWN_MIN_MS=300000   # 5 minutes min
WARMUP_MAILBOX_COOLDOWN_MAX_MS=900000   # 15 minutes max
```

**Fixed Cooldown (no randomization):**
```bash
WARMUP_MAILBOX_COOLDOWN_RANDOMIZE=false
WARMUP_MAILBOX_COOLDOWN_MIN_MS=300000   # Always 5 minutes
```

## Technical Implementation

### 1. Cooldown Tracking

The system maintains two maps:
- `mailboxLastSent`: Timestamp when each mailbox last sent
- `mailboxCooldownUntil`: Timestamp when cooldown expires

### 2. Send Process

```typescript
// Before sending:
if (!isMailboxReady(mailboxId)) {
  // Mailbox in cooldown, try other mailboxes
  queue.push(mailbox); // Put at end of queue
  continue; // Skip for now
}

// After successful send:
setMailboxCooldown(mailboxId); // Set random cooldown 3-10 min
```

### 3. Queue Management

When a mailbox is in cooldown:
- It's moved to the END of the queue
- Other ready mailboxes are processed
- System automatically tries again when cooldown expires

## Benefits

### 1. Natural Sending Patterns ✅
- Mimics human behavior (people don't send emails every 5 seconds)
- Each mailbox has realistic gaps between sends
- Randomized timing prevents detection

### 2. Improved Deliverability ✅
- Reduces spam filter triggers
- Looks more like organic email traffic
- Spreads sends across time naturally

### 3. Better Resource Management ✅
- Prevents any single mailbox from hogging resources
- Distributes load evenly across all mailboxes
- Ensures all mailboxes get fair sending opportunities

### 4. Scalability ✅
- Works with 10 mailboxes or 10,000 mailboxes
- No performance degradation
- Automatic cleanup of expired cooldowns

## Logging

Each send now shows cooldown info:

```
✉️  user@example.com → recipient@example.com (8.25s) [cooldown: 3-10min]
```

This shows:
- Who sent to whom
- Send duration (8.25 seconds)
- Cooldown range (3-10 minutes)

## Monitoring

### Check Active Cooldowns:

```bash
curl http://localhost:3000/api/warmup/metrics
```

Response includes:
- Mailboxes currently in cooldown
- Average cooldown duration
- Cooldown expiry times

## FAQ

### Q: What happens if all mailboxes are in cooldown?
**A:** The system waits and retries. As cooldowns expire, mailboxes become available again.

### Q: Can I disable cooldown?
**A:** Not recommended, but you can set very low values:
```bash
WARMUP_MAILBOX_COOLDOWN_MIN_MS=1000  # 1 second
WARMUP_MAILBOX_COOLDOWN_MAX_MS=1000  # 1 second
```

### Q: How does this affect my daily quota?
**A:** Cooldown helps MEET quota by:
- Spreading sends across the day (not all at once)
- Running every 15 minutes, so mailboxes get multiple chances
- Ensuring 30+ emails/day per mailbox over 24 hours

### Q: What's the math?

With 48 mailboxes and 3-10 min cooldown:
```
Run every 15 minutes = 96 runs/day
48 mailboxes / 20 concurrent = ~2.4 batches per run
Average cooldown = 6.5 minutes

In 15 minutes, most mailboxes come off cooldown
Result: Each mailbox sends ~2-3 times per run
Daily: 48 mailboxes × 2-3 per run × 96 runs = plenty of sends!
```

## Comparison

### WITHOUT Per-Mailbox Cooldown:
```
00:00 - Mailbox A sends
00:03 - Mailbox A sends again  ⚠️ Too fast!
00:06 - Mailbox A sends again  ⚠️ Unnatural!
00:09 - Mailbox A sends again  ⚠️ Spam-like!
```

### WITH Per-Mailbox Cooldown:
```
00:00 - Mailbox A sends → Cooldown 5min
00:03 - Mailbox B sends → Cooldown 7min
00:06 - Mailbox C sends → Cooldown 4min
00:09 - Mailbox D sends → Cooldown 6min
00:10 - Mailbox C ready → Sends again ✅ Natural!
00:15 - Mailbox A ready → Sends again ✅ Perfect!
```

## Best Practices

1. **Keep randomization enabled** for most natural patterns
2. **Adjust based on mailbox count:**
   - Few mailboxes (< 10): Longer cooldown (5-15 min)
   - Many mailboxes (> 50): Shorter cooldown (3-10 min)
3. **Monitor logs** to ensure good distribution
4. **Start conservative** and increase speed if needed

## Summary

✅ **Enabled by default**
✅ **3-10 minute randomized cooldown**
✅ **Prevents same mailbox spam**
✅ **Creates natural patterns**
✅ **Improves deliverability**
✅ **Scalable to thousands of mailboxes**

This feature ensures your warmup looks like real human email activity, not an automated bot! 🚀
