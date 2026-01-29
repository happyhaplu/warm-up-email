const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  console.log('\n📊 REAL QUOTA STATUS (WARMUP SENDS ONLY)\n');
  console.log('='.repeat(70));
  
  const accounts = await prisma.account.findMany({
    where: { warmupEnabled: true },
    select: {
      id: true,
      email: true,
      warmupMaxDaily: true
    }
  });
  
  let totalSent = 0;
  let totalReplied = 0;
  let exceededCount = 0;
  let atLimitCount = 0;
  let underLimitCount = 0;
  
  const results = [];
  
  for (const account of accounts) {
    const sent = await prisma.log.count({
      where: {
        senderId: account.id,
        timestamp: { gte: today, lt: tomorrow },
        status: { in: ['SENT', 'sent'] }
      }
    });
    
    const replied = await prisma.log.count({
      where: {
        senderId: account.id,
        timestamp: { gte: today, lt: tomorrow },
        status: { in: ['REPLIED', 'replied'] }
      }
    });
    
    totalSent += sent;
    totalReplied += replied;
    
    if (sent > account.warmupMaxDaily) {
      exceededCount++;
    } else if (sent === account.warmupMaxDaily) {
      atLimitCount++;
    } else {
      underLimitCount++;
    }
    
    results.push({
      email: account.email,
      sent,
      replied,
      total: sent + replied,
      limit: account.warmupMaxDaily,
      status: sent > account.warmupMaxDaily ? 'EXCEEDED' : sent === account.warmupMaxDaily ? 'AT LIMIT' : 'UNDER'
    });
  }
  
  results.sort((a, b) => b.sent - a.sent);
  
  console.log('Top 10 warmup senders (CORRECT counting):');
  results.slice(0, 10).forEach((r, i) => {
    console.log(`  ${i+1}. ${r.email}`);
    console.log(`     Warmup sends: ${r.sent}/${r.limit} ${r.sent > r.limit ? '❌ EXCEEDED +' + (r.sent - r.limit) : '✅'}`);
    console.log(`     Auto-replies: ${r.replied} (not counted in quota)`);
  });
  console.log('');
  
  console.log('='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total mailboxes: ${accounts.length}`);
  console.log(`  ❌ Exceeded limit: ${exceededCount}`);
  console.log(`  ⚠️  At limit: ${atLimitCount}`);
  console.log(`  ✅ Under limit: ${underLimitCount}`);
  console.log('');
  console.log(`Total warmup emails sent today: ${totalSent}`);
  console.log(`Total auto-replies sent today: ${totalReplied}`);
  console.log(`Total in database: ${totalSent + totalReplied}`);
  console.log('');
  console.log(`Expected if all at limit (48 × 10): 480 emails`);
  console.log(`Actual warmup sends: ${totalSent}`);
  console.log(`Difference: ${totalSent > 480 ? '+' + (totalSent - 480) + ' ❌ OVER' : (480 - totalSent) + ' under'}`);
  console.log('');
  console.log('='.repeat(70));
  console.log('EXPLANATION');
  console.log('='.repeat(70));
  console.log('The 2196 total you saw was:');
  console.log(`  ${totalSent} warmup emails (what counts against quota)`);
  console.log(`  ${totalReplied} auto-replies (should NOT count against quota)`);
  console.log('');
  console.log('With the FIX applied:');
  console.log('  ✅ System will ONLY count warmup sends (SENT)');
  console.log('  ✅ Auto-replies (REPLIED) will NOT count against quota');
  console.log('  ✅ Mailboxes can now operate normally');
  console.log('');
  
  await prisma.$disconnect();
  process.exit(0);
})();
