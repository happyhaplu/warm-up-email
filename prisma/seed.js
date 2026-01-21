const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.log.deleteMany();
  await prisma.template.deleteMany();
  await prisma.recipient.deleteMany();
  await prisma.account.deleteMany();

  // Seed sample templates
  const templates = await Promise.all([
    prisma.template.create({
      data: {
        subject: 'Quick question about collaboration',
        body: 'Hi there!\n\nI wanted to reach out and see if you might be interested in collaborating on some projects. I think our skills could complement each other well.\n\nLet me know if you\'d like to chat more about this.\n\nBest regards'
      }
    }),
    prisma.template.create({
      data: {
        subject: 'Following up on our conversation',
        body: 'Hello!\n\nJust following up on our previous conversation. I wanted to check in and see if you had any thoughts or questions.\n\nLooking forward to hearing from you.\n\nCheers'
      }
    }),
    prisma.template.create({
      data: {
        subject: 'Sharing an interesting resource',
        body: 'Hey!\n\nI came across something interesting and thought you might find it valuable. Would love to hear your thoughts on it when you get a chance.\n\nTake care'
      }
    })
  ]);

  console.log(`✓ Created ${templates.length} sample templates`);

  // Note: Accounts and Recipients should be added manually via the UI
  // as they require real email addresses and app passwords
  
  console.log('\n✓ Database seeded successfully!');
  console.log('\nNext steps:');
  console.log('1. Start the app: npm run dev');
  console.log('2. Add accounts at: http://localhost:3000/accounts');
  console.log('3. Add recipients at: http://localhost:3000/recipients');
  console.log('4. Start warmup service: npm run warmup');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
