const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  console.log('\n🔍 CHECKING IF REPLIES ARE COUNTED SEPARATELY\n');
  console.log('='.repeat(70));
  
  const sampleMailboxId = 35; // hr.bshappy2@gmail.com with 57 sends
  
  // Count SENT only
  const sentOnly = await prisma.log.count({
    where: {
      senderId: sampleMailboxId,
      timestamp: { gte: today, lt: tomorrow },
      status: 'SENT'
    }
  });
  
  // Count REPLIED only  
  const repliedOnly = await prisma.log.count({
    where: {
      senderId: sampleMailboxId,
      timestamp: { gte: today, lt: tomorrow },
      status: 'REPLIED'
    }
  });
  
  // Count both (what the system uses)
  const both = await prisma.log.count({
    where: {
      senderId: sampleMailboxId,
      timestamp: { gte: today, lt: tomorrow },
      status: { in: ['SENT', 'REPLIED'] }
    }
  });
  
  const account = await prisma.account.findUnique({
    where: { id: sampleMailboxId },
    select: { email: true, warmupMaxDaily: true }
  });
  
  console.log(`Mailbox: ${account.email}`);
  console.log(`Limit: ${account.warmupMaxDaily}`);
  console.log('');
  console.log(`SENT status: ${sentOnly}`);
  console.log(`REPLIED status: ${repliedOnly}`);
  console.log(`Total (SENT + REPLIED): ${both}`);
  console.log('');
  
  if (both === sentOnly + repliedOnly) {
    console.log('✅ No double-counting - counts are separate');
    console.log('');
    console.log('🔍 REAL ISSUE: The system is counting BOTH sent AND replied emails!');
    console.log('');
    console.log('Breakdown:');
    console.log(`  - Warmup emails SENT: ${sentOnly}`);
    console.log(`  - Auto-replies SENT: ${repliedOnly}`);
    console.log(`  - Total counted: ${both}`);
    console.log('');
    console.log('❌ PROBLEM: Should only count original sends (SENT)');
    console.log('   Auto-replies should NOT count against daily quota!');
  }
  
  // Check reply rate
  const replyRate = Math.round((repliedOnly / sentOnly) * 100);
  console.log('');
  console.log(`Reply rate: ${replyRate}% (${repliedOnly} replies from ${sentOnly} sends)`);
  console.log('');
  console.log('Expected with warmupReplyRate=35%:');
  console.log(`  If limit is 10, send ~10 emails, reply to ~3-4 of them`);
  console.log(`  Total in logs: 10 SENT + 3-4 REPLIED = 13-14 entries`);
  console.log('');
  console.log('But we\'re seeing:');
  console.log(`  ${sentOnly} SENT + ${repliedOnly} REPLIED = ${both} entries!`);
  
  await prisma.$disconnect();
  process.exit(0);
})();
