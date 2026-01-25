#!/usr/bin/env node
/**
 * Fix log status values to uppercase
 * Converts: 'sent' -> 'SENT', 'replied' -> 'REPLIED', 'failed' -> 'FAILED', etc.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing log status values to uppercase...\n');

  try {
    // Get count before update
    const before = await prisma.log.groupBy({
      by: ['status'],
      _count: true,
    });

    console.log('📊 Status distribution BEFORE update:');
    before.forEach(item => {
      console.log(`   ${item.status}: ${item._count}`);
    });

    // Update all lowercase status to uppercase
    const result = await prisma.$executeRaw`
      UPDATE logs 
      SET status = UPPER(status) 
      WHERE status IN ('sent', 'replied', 'received', 'failed')
    `;

    console.log(`\n✅ Updated ${result} log records\n`);

    // Get count after update
    const after = await prisma.log.groupBy({
      by: ['status'],
      _count: true,
    });

    console.log('📊 Status distribution AFTER update:');
    after.forEach(item => {
      console.log(`   ${item.status}: ${item._count}`);
    });

    console.log('\n✅ All logs have been updated to use uppercase status values!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
