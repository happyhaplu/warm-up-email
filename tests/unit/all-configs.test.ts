#!/usr/bin/env tsx
/**
 * Simple Config Tests
 * No database needed
 */

import { WarmupEngineConfig, WarmupConfig } from '../../lib/warmup-config';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
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

console.log('\n🧪 Testing All Configurations\n');

// Warmup Engine Config Tests
console.log('Warmup Engine Configuration:');
test('Batch size should be positive', () => {
  expect(WarmupEngineConfig.BATCH_SIZE).toBeGreaterThan(0);
  console.log(`   Batch size: ${WarmupEngineConfig.BATCH_SIZE}`);
});

test('Max concurrent should be positive', () => {
  expect(WarmupEngineConfig.MAX_CONCURRENT_SENDS).toBeGreaterThan(0);
  console.log(`   Max concurrent: ${WarmupEngineConfig.MAX_CONCURRENT_SENDS}`);
});

test('Mailbox cooldown min should be positive', () => {
  expect(WarmupEngineConfig.MAILBOX_COOLDOWN_MIN_MS).toBeGreaterThan(0);
});

test('Mailbox cooldown max >= min', () => {
  expect(WarmupEngineConfig.MAILBOX_COOLDOWN_MAX_MS).toBeGreaterThanOrEqual(
    WarmupEngineConfig.MAILBOX_COOLDOWN_MIN_MS
  );
  const minMin = WarmupEngineConfig.MAILBOX_COOLDOWN_MIN_MS / 60000;
  const maxMin = WarmupEngineConfig.MAILBOX_COOLDOWN_MAX_MS / 60000;
  console.log(`   Cooldown: ${minMin}-${maxMin} minutes`);
});

test('Send stagger is configured', () => {
  expect(WarmupEngineConfig.SEND_STAGGER_MIN_MS).toBeGreaterThan(0);
  expect(WarmupEngineConfig.SEND_STAGGER_MAX_MS).toBeGreaterThanOrEqual(
    WarmupEngineConfig.SEND_STAGGER_MIN_MS
  );
});

test('Global limits are configured', () => {
  expect(WarmupEngineConfig.GLOBAL_HOURLY_LIMIT).toBeGreaterThan(0);
  expect(WarmupEngineConfig.GLOBAL_MINUTE_LIMIT).toBeGreaterThan(0);
  console.log(`   Global limit: ${WarmupEngineConfig.GLOBAL_HOURLY_LIMIT}/hour, ${WarmupEngineConfig.GLOBAL_MINUTE_LIMIT}/min`);
});

// Warmup Config Tests
console.log('\nWarmup Configuration:');
test('Send delay range is valid', () => {
  expect(WarmupConfig.SEND_DELAY_MIN).toBeGreaterThan(0);
  expect(WarmupConfig.SEND_DELAY_MAX).toBeGreaterThanOrEqual(WarmupConfig.SEND_DELAY_MIN);
  console.log(`   Send delay: ${WarmupConfig.SEND_DELAY_MIN}-${WarmupConfig.SEND_DELAY_MAX} minutes`);
});

test('Reply delay range is valid', () => {
  expect(WarmupConfig.REPLY_DELAY_MIN).toBeGreaterThan(0);
  expect(WarmupConfig.REPLY_DELAY_MAX).toBeGreaterThanOrEqual(WarmupConfig.REPLY_DELAY_MIN);
  console.log(`   Reply delay: ${WarmupConfig.REPLY_DELAY_MIN}-${WarmupConfig.REPLY_DELAY_MAX} minutes`);
});

test('Default values are within limits', () => {
  expect(WarmupConfig.DEFAULT_START_COUNT).toBeGreaterThanOrEqual(WarmupConfig.MIN_START_COUNT);
  expect(WarmupConfig.DEFAULT_START_COUNT).toBeLessThanOrEqual(WarmupConfig.MAX_START_COUNT);
  
  expect(WarmupConfig.DEFAULT_INCREASE_BY).toBeGreaterThanOrEqual(WarmupConfig.MIN_INCREASE_BY);
  expect(WarmupConfig.DEFAULT_INCREASE_BY).toBeLessThanOrEqual(WarmupConfig.MAX_INCREASE_BY);
  
  expect(WarmupConfig.DEFAULT_MAX_DAILY).toBeGreaterThanOrEqual(WarmupConfig.MIN_MAX_DAILY);
  expect(WarmupConfig.DEFAULT_MAX_DAILY).toBeLessThanOrEqual(WarmupConfig.MAX_MAX_DAILY);
  
  console.log(`   Defaults: start=${WarmupConfig.DEFAULT_START_COUNT}, increase=${WarmupConfig.DEFAULT_INCREASE_BY}, max=${WarmupConfig.DEFAULT_MAX_DAILY}`);
});

test('Reply rate is within range', () => {
  expect(WarmupConfig.DEFAULT_REPLY_RATE).toBeGreaterThanOrEqual(WarmupConfig.MIN_REPLY_RATE);
  expect(WarmupConfig.DEFAULT_REPLY_RATE).toBeLessThanOrEqual(WarmupConfig.MAX_REPLY_RATE);
  console.log(`   Reply rate: ${WarmupConfig.DEFAULT_REPLY_RATE}% (range: ${WarmupConfig.MIN_REPLY_RATE}-${WarmupConfig.MAX_REPLY_RATE}%)`);
});

// Summary
setTimeout(() => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('✅ All configuration tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}, 100);
