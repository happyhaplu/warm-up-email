const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const logs = await prisma.log.findMany({
    where: {
      timestamp: {
        gte: today,
        lt: tomorrow
      },
      status: { in: ['SENT', 'sent', 'REPLIED', 'replied'] }
    },
    select: {
      id: true,
      senderId: true,
      sender: true,
      recipient: true,
      timestamp: true,
      status: true
    },
    orderBy: { senderId: 'asc' }
  });
  
  // Group by sender
  const groupedBySender = {};
  logs.forEach(log => {
    const key = log.senderId || log.sender;
    if (!groupedBySender[key]) {
      groupedBySender[key] = {
        senderId: log.senderId,
        sender: log.sender,
        count: 0,
        emails: []
      };
    }
    groupedBySender[key].count++;
    groupedBySender[key].emails.push({
      recipient: log.recipient,
      timestamp: log.timestamp,
      status: log.status
    });
  });
  
  console.log('\n=== Emails sent today by mailbox ===\n');
  Object.values(groupedBySender).forEach(data => {
    console.log(`Mailbox ID ${data.senderId} (${data.sender}): ${data.count} emails sent`);
    if (data.count > 20) {
      console.log('  ⚠️ WARNING: Exceeded warmupMaxDaily limit of 20!');
    }
  });
  
  console.log(`\n\nTotal emails sent today: ${logs.length}\n`);
  
  // Now check warmup settings vs actual sends
  const accounts = await prisma.account.findMany({
    where: { warmupEnabled: true },
    select: {
      id: true,
      email: true,
      warmupMaxDaily: true,
      warmupStartCount: true,
      warmupIncreaseBy: true,
      warmupStartDate: true
    }
  });
  
  console.log('\n=== Warmup Settings vs Actual Sends ===\n');
  for (const account of accounts) {
    const sentCount = groupedBySender[account.id]?.count || 0;
    const limit = account.warmupMaxDaily;
    const exceeded = sentCount > limit;
    
    if (exceeded) {
      console.log(`⚠️ LIMIT EXCEEDED: ${account.email}`);
      console.log(`   Limit: ${limit}, Sent: ${sentCount}, Exceeded by: ${sentCount - limit}`);
    }
  }
  
  await prisma.$disconnect();
})();
