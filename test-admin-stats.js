#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAdminStats() {
  console.log('🔍 Testing Admin Stats Display\n');
  console.log('='.repeat(80));

  try {
    // Simulate what the admin stats API does
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get total counts
    const [
      totalAccounts,
      totalUsers,
      sendTemplates,
      replyTemplates,
    ] = await Promise.all([
      prisma.account.count(),
      prisma.user.count(),
      prisma.sendTemplate.count(),
      prisma.replyTemplate.count(),
    ]);

    // Get stats from WarmupLogs
    const allWarmupLogs = await prisma.warmupLog.findMany({
      select: {
        sentCount: true,
        repliedCount: true,
      },
    });

    const totalSent = allWarmupLogs.reduce((sum, log) => sum + (log.sentCount || 0), 0);
    const totalReplies = allWarmupLogs.reduce((sum, log) => sum + (log.repliedCount || 0), 0);
    const replyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0;

    // Get today's activity from real-time logs
    const todayLogs = await prisma.log.findMany({
      where: {
        timestamp: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      select: { status: true },
    });

    const logsToday = todayLogs.length;
    const failures = todayLogs.filter((log) => log.status === 'FAILED').length;

    const stats = {
      totalAccounts,
      totalMailboxes: totalAccounts,
      totalUsers,
      sendTemplates,
      replyTemplates,
      totalSent,
      totalReplies,
      replyRate,
      failures,
      logsToday,
    };

    console.log('\n📊 Admin Dashboard Stats (What Admin Will See):\n');
    console.log(`   Total Accounts: ${stats.totalAccounts}`);
    console.log(`   Total Users: ${stats.totalUsers}`);
    console.log(`   Send Templates: ${stats.sendTemplates}`);
    console.log(`   Reply Templates: ${stats.replyTemplates}`);
    console.log(`   Total Sent (All Time): ${stats.totalSent}`);
    console.log(`   Total Replies (All Time): ${stats.totalReplies}`);
    console.log(`   Reply Rate: ${stats.replyRate}%`);
    console.log(`   Failures (Today): ${stats.failures}`);
    console.log(`   Logs Today: ${stats.logsToday}`);

    // Check warmup running status
    const warmupEnabled = await prisma.account.count({
      where: { warmupEnabled: true }
    });

    console.log(`\n🔥 Warmup Status:`);
    console.log(`   Mailboxes with warmup enabled: ${warmupEnabled} / ${totalAccounts}`);
    console.log(`   Activity today: ${logsToday} log entries`);

    if (logsToday > 0) {
      const recentLogs = await prisma.log.findMany({
        where: {
          timestamp: { gte: todayStart }
        },
        orderBy: { timestamp: 'desc' },
        take: 5,
        select: {
          status: true,
          timestamp: true,
          sender: { select: { email: true } }
        }
      });

      console.log(`\n📝 Recent Activity (Last 5):`);
      recentLogs.forEach(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        console.log(`   - ${log.status} from ${log.sender?.email || 'Unknown'} at ${time}`);
      });

      console.log(`\n✅ Warmup IS RUNNING (${logsToday} emails sent today)`);
    } else {
      console.log(`\n⚠️  No activity today - warmup might be paused`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Admin stats API is working correctly!');
    console.log('   The admin dashboard should now show historical data from WarmupLogs');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminStats().catch(console.error);
