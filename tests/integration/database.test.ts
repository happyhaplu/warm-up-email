#!/usr/bin/env tsx
/**
 * Integration Tests - Database & System
 */

import prisma from '../../lib/prisma';
import { AutoScalerConfig } from '../../lib/auto-scaler-config';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error: any) {
    console.log(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    failed++;
  }
}

function expect(value: any) {
  return {
    toBeDefined() {
      if (value === undefined || value === null) {
        throw new Error('Expected value to be defined');
      }
    },
    toBeGreaterThan(expected: number) {
      if (value <= expected) {
        throw new Error(`Expected ${value} > ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (value < expected) {
        throw new Error(`Expected ${value} >= ${expected}`);
      }
    },
  };
}

async function runTests() {
  console.log('\n🧪 Integration Tests\n');

  // Test 1: Database connection
  await test('Database connection should work', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
  });

  // Test 2: Count accounts
  await test('Should count accounts', async () => {
    const count = await prisma.account.count();
    expect(count).toBeGreaterThanOrEqual(0);
    console.log(`   Found ${count} accounts`);
  });

  // Test 3: Count users
  await test('Should count users', async () => {
    const count = await prisma.user.count();
    expect(count).toBeGreaterThanOrEqual(0);
    console.log(`   Found ${count} users`);
  });

  // Test 4: Count warmup logs
  await test('Should count warmup logs', async () => {
    const count = await prisma.warmupLog.count();
    expect(count).toBeGreaterThanOrEqual(0);
    console.log(`   Found ${count} warmup logs`);
  });

  // Test 5: Auto-scaler config is valid
  await test('Auto-scaler config should be valid', async () => {
    expect(AutoScalerConfig.MAILBOXES_PER_WORKER).toBeGreaterThan(0);
    expect(AutoScalerConfig.MIN_WORKERS).toBeGreaterThan(0);
    console.log(`   Mailboxes per worker: ${AutoScalerConfig.MAILBOXES_PER_WORKER}`);
  });

  // Cleanup
  await prisma.$disconnect();

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('✅ All integration tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

runTests();
