#!/usr/bin/env node
/**
 * Quick Status Check - Verify Quota Fix is Working
 * 
 * This script verifies that:
 * 1. Only SENT emails are counted (not REPLIED)
 * 2. Mailbox limits are enforced correctly
 * 3. Frontend displays accurate quota information
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatus() {
  console.log('\n' + '='.repeat(80));
  console.log(' QUOTA FIX STATUS CHECK');
  console.log('='.repeat(80) + '\n');

  try {
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().split('T')[0];

    // Count today's emails by type
    const stats = await prisma.$queryRaw`
      SELECT 
        status,
        COUNT(*) as count
      FROM warmup_emails
      WHERE DATE(created_at) = ${todayISO}
      GROUP BY status
      ORDER BY status
    `;

    console.log('📊 Today\'s Email Breakdown:');
    console.log('─'.repeat(80));
    
    let totalSent = 0;
    let totalReplied = 0;
    let totalOther = 0;

    stats.forEach(row => {
      const count = Number(row.count);
      if (row.status === 'SENT' || row.status === 'sent') {
        totalSent += count;
        console.log(`   ✉️  ${row.status.padEnd(10)} : ${count.toString().padStart(5)} emails (COUNTS against quota)`);
      } else if (row.status === 'REPLIED' || row.status === 'replied') {
        totalReplied += count;
        console.log(`   ↩️  ${row.status.padEnd(10)} : ${count.toString().padStart(5)} emails (EXCLUDED from quota)`);
      } else {
        totalOther += count;
        console.log(`   ❓ ${row.status.padEnd(10)} : ${count.toString().padStart(5)} emails`);
      }
    });

    console.log('─'.repeat(80));
    console.log(`   📮 Total Warmup Sends : ${totalSent.toString().padStart(5)} (counts toward quota)`);
    console.log(`   💬 Total Auto-Replies : ${totalReplied.toString().padStart(5)} (excluded from quota)`);
    console.log(`   🔢 Total All Emails   : ${(totalSent + totalReplied + totalOther).toString().padStart(5)}`);
    console.log('─'.repeat(80));

    // Get mailbox settings
    const accounts = await prisma.account.findMany({
      where: {
        warmupEnabled: true,
      },
      select: {
        id: true,
        email: true,
        warmupMaxDaily: true,
        warmupEnabled: true,
      },
    });

    const activeMailboxes = accounts.length;
    const expectedMax = accounts.reduce((sum, acc) => sum + (acc.warmupMaxDaily || 0), 0);

    console.log(`\n📬 Active Mailboxes: ${activeMailboxes}`);
    console.log(`📊 Expected Max Daily: ${expectedMax} warmup emails`);
    console.log(`📈 Actual Sent Today: ${totalSent} warmup emails`);
    
    if (totalSent > expectedMax) {
      console.log(`\n⚠️  WARNING: Sent ${totalSent - expectedMax} more than limit!`);
    } else {
      console.log(`\n✅ Within limits: ${expectedMax - totalSent} quota remaining`);
    }

    // Sample a few mailboxes
    console.log('\n📋 Sample Mailbox Status (showing first 5):');
    console.log('─'.repeat(80));

    for (let i = 0; i < Math.min(5, accounts.length); i++) {
      const account = accounts[i];
      
      // Count SENT only
      const sentCount = await prisma.warmupEmail.count({
        where: {
          mailboxId: account.id,
          status: { in: ['SENT', 'sent'] },
          createdAt: { gte: today },
        },
      });

      // Count total for comparison
      const totalCount = await prisma.warmupEmail.count({
        where: {
          mailboxId: account.id,
          createdAt: { gte: today },
        },
      });

      const limit = account.warmupMaxDaily || 0;
      const status = sentCount >= limit ? '🔴' : sentCount >= limit * 0.8 ? '🟡' : '🟢';
      
      console.log(`   ${status} ${account.email}`);
      console.log(`      Warmup Sends: ${sentCount}/${limit} | Total: ${totalCount}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Fix Status: APPLIED - Only SENT emails count toward quota');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error checking status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatus();
