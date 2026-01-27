#!/usr/bin/env tsx
/**
 * Unit Tests - Warmup Configuration
 * Simple test runner - no complicated setup needed
 */

import { WarmupEngineConfig } from '../../lib/warmup-config';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => {
        console.log(`✅ ${name}`);
        passed++;
      }).catch((error) => {
        console.log(`❌ ${name}`);
        console.error(`   Error: ${error.message}`);
        failed++;
      });
    } else {
      console.log(`✅ ${name}`);
      passed++;
    }
  } catch (error: any) {
    console.log(`❌ ${name}`);
    console.error(`   Error: ${error.message}`);
    failed++;
  }
}

function expect(value: any) {
  return {
    toBe(expected: any) {
      if (value !== expected) {
        throw new Error(`Expected ${expected}, got ${value}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (value <= expected) {
        throw new Error(`Expected ${value} to be greater than ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (value >= expected) {
        throw new Error(`Expected ${value} to be less than ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected: number) {
      if (value > expected) {
        throw new Error(`Expected ${value} to be less than or equal to ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (value < expected) {
        throw new Error(`Expected ${value} to be greater than or equal to ${expected}`);
      }
    },
  };
}

console.log('\n🧪 Testing Warmup Configuration\n');

// Test 1: Batch size is valid
test('Batch size should be positive', () => {
  expect(WarmupEngineConfig.BATCH_SIZE).toBeGreaterThan(0);
});

// Test 2: Max concurrent is valid
test('Max concurrent should be positive', () => {
  expect(WarmupEngineConfig.MAX_CONCURRENT_SENDS).toBeGreaterThan(0);
});

// Test 3: Cooldown min is valid
test('Mailbox cooldown min should be positive', () => {
  expect(WarmupEngineConfig.MAILBOX_COOLDOWN_MIN_MS).toBeGreaterThan(0);
});

// Test 4: Cooldown max >= min
test('Mailbox cooldown max should be >= min', () => {
  expect(WarmupEngineConfig.MAILBOX_COOLDOWN_MAX_MS).toBeGreaterThanOrEqual(
    WarmupEngineConfig.MAILBOX_COOLDOWN_MIN_MS
  );
});

// Test 5: Stagger is valid
test('Stagger min should be positive', () => {
  expect(WarmupEngineConfig.SEND_STAGGER_MIN_MS).toBeGreaterThan(0);
});

// Test 6: Global limit is valid
test('Global hourly limit should be positive', () => {
  expect(WarmupEngineConfig.GLOBAL_HOURLY_LIMIT).toBeGreaterThan(0);
});

// Summary
setTimeout(() => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}, 100);
