const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create send templates
  const sendTemplates = [
    {
      subject: 'Quick question about your project',
      body: 'Hi there!\n\nI came across your recent work and had a quick question. Would you mind if I reached out?\n\nThanks!',
    },
    {
      subject: 'Following up on our conversation',
      body: 'Hello,\n\nJust wanted to follow up on what we discussed earlier. Let me know if you have any questions.\n\nBest regards',
    },
    {
      subject: 'Great meeting you!',
      body: 'Hi,\n\nIt was great connecting with you. Looking forward to staying in touch!\n\nCheers',
    },
    {
      subject: 'Checking in',
      body: 'Hey!\n\nHope you\'re doing well. Just wanted to check in and see how things are going.\n\nTake care',
    },
    {
      subject: 'Quick update',
      body: 'Hello,\n\nWanted to share a quick update with you. Let me know what you think!\n\nBest',
    },
  ];

  console.log('Creating send templates...');
  for (const template of sendTemplates) {
    try {
      await prisma.sendTemplate.create({
        data: template,
      });
    } catch (error) {
      console.log(`Skipping duplicate template: ${template.subject}`);
    }
  }

  console.log(`✅ Created ${sendTemplates.length} send templates`);

  // Create reply templates
  const replyTemplates = [
    { text: 'Thanks!' },
    { text: 'Got it!' },
    { text: 'Looks good!' },
    { text: 'Appreciate it!' },
    { text: 'Perfect, thank you!' },
    { text: 'Received, thanks!' },
    { text: 'Thank you for the update.' },
    { text: 'Noted, thanks!' },
    { text: 'Great, thank you!' },
    { text: 'Thanks for sharing!' },
    { text: 'Sounds good!' },
    { text: 'Will do, thanks!' },
    { text: 'Understood!' },
    { text: 'Thanks for letting me know!' },
    { text: 'Excellent!' },
  ];

  console.log('Creating reply templates...');
  for (const template of replyTemplates) {
    try {
      await prisma.replyTemplate.create({
        data: template,
      });
    } catch (error) {
      console.log(`Skipping duplicate template: ${template.text}`);
    }
  }

  console.log(`✅ Created ${replyTemplates.length} reply templates`);

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
