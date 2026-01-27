#!/usr/bin/env tsx
/**
 * System Tests - Full System Validation
 */

import prisma from '../lib/prisma';
import { WarmupEngineConfig } from '../lib/warmup-config';
import { AutoScalerConfig } from '../lib/auto-scaler-config';

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
    toBe(expected: any) {
      if (value !== expected) {
        throw new Error(`Expected ${expected}, got ${value}`);
      }
    },
  };
}

async function runTests() {
  console.log('\n🧪 System Tests - Full Validation\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get system stats
  const [accountCount, userCount, logCount] = await Promise.all([
    prisma.account.count(),
    prisma.user.count(),
    prisma.warmupLog.count(),
  ]);

  console.log('📊 System Statistics:');
  console.log(`   Accounts: ${accountCount}`);
  console.log(`   Users: ${userCount}`);
  console.log(`   Warmup Logs: ${logCount}`);
  console.log('');

  // Test 1: System has data
  await test('System should have accounts configured', async () => {
    expect(accountCount).toBeGreaterThan(0);
  });

  // Test 2: System has warmup activity
  await test('System should have warmup activity', async () => {
    expect(logCount).toBeGreaterThan(0);
  });

  // Test 3: Config is production-ready
  await test('Warmup config should be production-ready', async () => {
    expect(WarmupEngineConfig.BATCH_SIZE).toBeGreaterThan(0);
    expect(WarmupEngineConfig.MAX_CONCURRENT_SENDS).toBeGreaterThan(0);
    console.log(`   Batch size: ${WarmupEngineConfig.BATCH_SIZE}`);
    console.log(`   Max concurrent: ${WarmupEngineConfig.MAX_CONCURRENT_SENDS}`);
  });

  // Test 4: Cooldown is configured
  await test('Per-mailbox cooldown should be configured', async () => {
    expect(WarmupEngineConfig.MAILBOX_COOLDOWN_MIN_MS).toBeGreaterThan(0);
    expect(WarmupEngineConfig.MAILBOX_COOLDOWN_MAX_MS).toBeGreaterThanOrEqual(
      WarmupEngineConfig.MAILBOX_COOLDOWN_MIN_MS
    );
    const minMin = WarmupEngineConfig.MAILBOX_COOLDOWN_MIN_MS / 60000;
    const maxMin = WarmupEngineConfig.MAILBOX_COOLDOWN_MAX_MS / 60000;
    console.log(`   Cooldown: ${minMin}-${maxMin} minutes`);
  });

  // Test 5: Auto-scaler ready
  await test('Auto-scaler should be configured', async () => {
    expect(AutoScalerConfig.MAILBOXES_PER_WORKER).toBeGreaterThan(0);
    expect(AutoScalerConfig.MIN_WORKERS).toBeGreaterThan(0);
    expect(AutoScalerConfig.MAX_WORKERS).toBeGreaterThanOrEqual(AutoScalerConfig.MIN_WORKERS);
    console.log(`   Mailboxes/worker: ${AutoScalerConfig.MAILBOXES_PER_WORKER}`);
    console.log(`   Workers: ${AutoScalerConfig.MIN_WORKERS}-${AutoScalerConfig.MAX_WORKERS}`);
  });

  // Test 6: Calculate scaling capacity
  await test('System scaling capacity should be calculated', async () => {
    const currentCapacity = accountCount;
    const optimalWorkers = Math.ceil(currentCapacity / AutoScalerConfig.MAILBOXES_PER_WORKER);
    const maxCapacity = AutoScalerConfig.MAX_WORKERS * AutoScalerConfig.MAILBOXES_PER_WORKER;
    
    expect(optimalWorkers).toBeGreaterThan(0);
    
    console.log(`   Current mailboxes: ${currentCapacity}`);
    console.log(`   Optimal workers: ${optimalWorkers}`);
    console.log(`   Max capacity: ${maxCapacity} mailboxes`);
  });

  // Cleanup
  await prisma.$disconnect();

  // Summary
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  console.log('');

  if (failed === 0) {
    console.log('╔══════════════════════════════════════╗');
    console.log('║  ✅ ALL SYSTEM TESTS PASSED! ✅     ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');
    console.log('System Status: PRODUCTION READY 🚀');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed - review errors above');
    process.exit(1);
  }
}

runTests();
