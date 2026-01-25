const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedPlans() {
  console.log('🌱 Seeding plans...');

  const plans = [
    {
      name: 'free',
      displayName: 'Free',
      description: 'Perfect for trying out email warmup',
      mailboxLimit: 1,
      dailyEmailLimit: 20,
      monthlyEmailLimit: 600,
      price: 0,
      isActive: true,
      features: JSON.stringify([
        '1 mailbox',
        '20 emails/day per mailbox',
        '600 emails/month',
        'Basic templates',
        'Email support',
      ]),
    },
    {
      name: 'starter',
      displayName: 'Starter',
      description: 'Great for small teams and freelancers',
      mailboxLimit: 5,
      dailyEmailLimit: 50,
      monthlyEmailLimit: 7500,
      price: 29,
      isActive: true,
      features: JSON.stringify([
        '5 mailboxes',
        '50 emails/day per mailbox',
        '7,500 emails/month',
        'Advanced templates',
        'Priority email support',
        'Basic analytics',
      ]),
    },
    {
      name: 'pro',
      displayName: 'Professional',
      description: 'For growing businesses and agencies',
      mailboxLimit: 20,
      dailyEmailLimit: 100,
      monthlyEmailLimit: 60000,
      price: 99,
      isActive: true,
      features: JSON.stringify([
        '20 mailboxes',
        '100 emails/day per mailbox',
        '60,000 emails/month',
        'Custom templates',
        '24/7 priority support',
        'Advanced analytics',
        'API access',
        'Webhook integrations',
      ]),
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'Unlimited power for large organizations',
      mailboxLimit: -1, // -1 means unlimited
      dailyEmailLimit: 500,
      monthlyEmailLimit: -1, // -1 means unlimited
      price: 499,
      isActive: true,
      features: JSON.stringify([
        'Unlimited mailboxes',
        '500 emails/day per mailbox',
        'Unlimited monthly emails',
        'Custom everything',
        'Dedicated account manager',
        'Custom integrations',
        'White-label option',
        'SLA guarantee',
      ]),
    },
  ];

  for (const plan of plans) {
    const created = await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`✓ Created/updated plan: ${created.displayName}`);
  }

  // Assign free plan to all users without a plan
  const freePlan = await prisma.plan.findUnique({ where: { name: 'free' } });
  if (freePlan) {
    const usersWithoutPlan = await prisma.user.findMany({
      where: { planId: null },
    });

    for (const user of usersWithoutPlan) {
      await prisma.user.update({
        where: { id: user.id },
        data: { planId: freePlan.id },
      });
      console.log(`✓ Assigned Free plan to ${user.email}`);
    }
  }

  console.log('✅ Plans seeded successfully!');
}

seedPlans()
  .catch((e) => {
    console.error('❌ Error seeding plans:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
