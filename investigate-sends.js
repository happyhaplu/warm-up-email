const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  console.log('\n🔍 INVESTIGATING HIGH SEND COUNT\n');
  console.log('='.repeat(70));
  
  // Total count
  const total = await prisma.log.count({
    where: {
      timestamp: { gte: today, lt: tomorrow },
      status: { in: ['SENT', 'sent', 'REPLIED', 'replied'] }
    }
  });
  
  console.log(`Total emails today: ${total}\n`);
  
  // Break down by status
  const byStatus = await prisma.log.groupBy({
    by: ['status'],
    where: {
      timestamp: { gte: today, lt: tomorrow }
    },
    _count: { id: true }
  });
  
  console.log('By status:');
  byStatus.forEach(s => {
    console.log(`  ${s.status}: ${s._count.id}`);
  });
  console.log('');
  
  // Get per-mailbox breakdown
  const logs = await prisma.log.findMany({
    where: {
      timestamp: { gte: today, lt: tomorrow },
      status: { in: ['SENT', 'sent', 'REPLIED', 'replied'] }
    },
    select: {
      senderId: true,
      senderAccount: {
        select: {
          email: true,
          warmupMaxDaily: true
        }
      }
    },
    orderBy: { senderId: 'asc' }
  });
  
  const perMailbox = {};
  logs.forEach(log => {
    if (!perMailbox[log.senderId]) {
      perMailbox[log.senderId] = {
        count: 0,
        email: log.senderAccount?.email || 'unknown',
        limit: log.senderAccount?.warmupMaxDaily || 0
      };
    }
    perMailbox[log.senderId].count++;
  });
  
  const mailboxes = Object.values(perMailbox);
  mailboxes.sort((a, b) => b.count - a.count);
  
  console.log('Top 10 senders today:');
  mailboxes.slice(0, 10).forEach((mb, i) => {
    const exceeded = mb.count - mb.limit;
    console.log(`  ${i+1}. ${mb.email}`);
    console.log(`     Sent: ${mb.count}, Limit: ${mb.limit}, Exceeded: ${exceeded > 0 ? '+' + exceeded : '0'}`);
  });
  console.log('');
  
  // Statistics
  const counts = mailboxes.map(m => m.count);
  const exceededCount = mailboxes.filter(m => m.count > m.limit).length;
  
  console.log('Statistics:');
  console.log(`  Total mailboxes: ${mailboxes.length}`);
  console.log(`  Mailboxes that exceeded limit: ${exceededCount}`);
  console.log(`  Max sent by one mailbox: ${Math.max(...counts)}`);
  console.log(`  Min sent by one mailbox: ${Math.min(...counts)}`);
  console.log(`  Average per mailbox: ${Math.round(counts.reduce((a,b) => a+b, 0) / counts.length)}`);
  console.log('');
  
  // Check if emails are still being sent NOW
  const last5Min = new Date(Date.now() - 5 * 60 * 1000);
  const recent = await prisma.log.count({
    where: {
      timestamp: { gte: last5Min },
      status: { in: ['SENT', 'sent'] }
    }
  });
  
  console.log(`Emails sent in last 5 minutes: ${recent}`);
  console.log(`Status: ${recent > 0 ? '⚠️ STILL SENDING' : '✅ Stopped'}`);
  console.log('');
  
  // Check warmup settings
  const settings = await prisma.account.aggregate({
    where: { warmupEnabled: true },
    _avg: { warmupMaxDaily: true },
    _max: { warmupMaxDaily: true },
    _min: { warmupMaxDaily: true }
  });
  
  console.log('Warmup settings:');
  console.log(`  Average limit: ${settings._avg.warmupMaxDaily}`);
  console.log(`  Max limit: ${settings._max.warmupMaxDaily}`);
  console.log(`  Min limit: ${settings._min.warmupMaxDaily}`);
  
  await prisma.$disconnect();
  process.exit(0);
})();
