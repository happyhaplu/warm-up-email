import { warmupService } from '../lib/warmup-service';
import prisma from '../lib/prisma';

async function testWarmup() {
  try {
    console.log('🧪 Testing warmup service...\n');

    // Check database connection
    console.log('1️⃣ Checking database connection...');
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // Check for accounts
    console.log('2️⃣ Checking accounts...');
    const accounts = await prisma.account.findMany();
    console.log(`✅ Found ${accounts.length} account(s)`);
    if (accounts.length > 0) {
      accounts.forEach(acc => {
        console.log(`   - ${acc.email}`);
      });
    }
    console.log('');

    // Check for recipients
    console.log('3️⃣ Checking recipients...');
    const recipients = await prisma.recipient.findMany();
    console.log(`✅ Found ${recipients.length} recipient(s)`);
    if (recipients.length > 0) {
      recipients.forEach(rec => {
        console.log(`   - ${rec.email}`);
      });
    }
    console.log('');

    // Check for templates
    console.log('4️⃣ Checking templates...');
    const templates = await prisma.template.findMany();
    console.log(`✅ Found ${templates.length} template(s)`);
    if (templates.length > 0) {
      templates.forEach(tpl => {
        console.log(`   - ${tpl.subject}`);
      });
    }
    console.log('');

    if (accounts.length === 0 || recipients.length === 0 || templates.length === 0) {
      console.log('⚠️ Warning: You need at least 1 account, 1 recipient, and 1 template to run warmup');
      console.log('💡 Add them via the web interface at http://localhost:3000\n');
    }

    // Test warmup service status
    console.log('5️⃣ Checking warmup service status...');
    const status = warmupService.getStatus();
    console.log(`✅ Service status: ${status.running ? 'Running ✨' : 'Stopped ⏸️'}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All tests passed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testWarmup();
