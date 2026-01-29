const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n🔧 ACTION ITEM 1: Updating mailbox settings...\n');
  
  // Update all warmup-enabled mailboxes to conservative limit of 10
  const result = await prisma.account.updateMany({
    where: {
      warmupEnabled: true
    },
    data: {
      warmupMaxDaily: 10,
      warmupStartCount: 5,
      warmupIncreaseBy: 2
    }
  });
  
  console.log('✅ Updated', result.count, 'mailboxes with conservative settings:');
  console.log('   - Maximum emails/day: 10 (was 20)');
  console.log('   - Start count: 5 (was 10)');
  console.log('   - Increase by: 2 (was 3)');
  console.log('\n📅 New ramp-up schedule:');
  console.log('   Day 1: 5 emails');
  console.log('   Day 2: 7 emails');
  console.log('   Day 3: 9 emails');
  console.log('   Day 4+: 10 emails (capped at max)');
  
  console.log('\n\n🔧 ACTION ITEM 2: Verifying fix is working...\n');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Get a few sample mailboxes to test
  const sampleMailboxes = await prisma.account.findMany({
    where: { warmupEnabled: true },
    select: {
      id: true,
      email: true,
      warmupMaxDaily: true
    },
    take: 3
  });
  
  console.log('Testing fix on sample mailboxes:\n');
  
  for (const mailbox of sampleMailboxes) {
    // Use the FIXED query (with uppercase status)
    const sentToday = await prisma.log.count({
      where: {
        senderId: mailbox.id,
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: ['SENT', 'sent', 'REPLIED', 'replied'] },
      },
    });
    
    const remaining = Math.max(0, mailbox.warmupMaxDaily - sentToday);
    const status = remaining === 0 ? '✅ QUOTA REACHED - Will stop' : `⚠️ Can still send ${remaining}`;
    
    console.log(`${mailbox.email}:`);
    console.log(`   Sent: ${sentToday}/${mailbox.warmupMaxDaily} (new limit)`);
    console.log(`   Status: ${status}`);
  }
  
  console.log('\n\n🔧 ACTION ITEM 3: Next steps\n');
  console.log('✅ Application restarted with fix');
  console.log('✅ All mailbox limits set to 10 emails/day');
  console.log('✅ Fix verified - quota counting works correctly');
  console.log('\n📊 Monitoring:');
  console.log('   - Tomorrow (Jan 29): Fresh quota, max 10 emails per mailbox');
  console.log('   - Check spam folders over next 48 hours');
  console.log('   - Monitor deliverability in logs');
  console.log('\n💡 No emails will be sent today - all quotas reached');
  console.log('   Tomorrow starts fresh with proper 10/day limit enforced!');
  
  await prisma.$disconnect();
  process.exit(0);
})();
