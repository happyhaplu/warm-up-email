#!/usr/bin/env tsx
/**
 * Unit Tests - Warmup Utils
 */

import { getDailyLimit, getDaysSinceStart } from '../../lib/warmup-utils';

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
    toBeLessThanOrEqual(expected: number) {
      if (value > expected) {
        throw new Error(`Expected ${value} to be <= ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (value < expected) {
        throw new Error(`Expected ${value} to be >= ${expected}`);
      }
    },
  };
}

console.log('\n🧪 Testing Warmup Utils\n');

// Test getDailyLimit
test('getDailyLimit: Day 1 should return start count', () => {
  const limit = getDailyLimit(1, 20, 3, 3);
  expect(limit).toBe(3);
});

test('getDailyLimit: Should increase over time', () => {
  const day1 = getDailyLimit(1, 20, 3, 3);
  const day5 = getDailyLimit(5, 20, 3, 3);
  expect(day5).toBeGreaterThan(day1);
});

test('getDailyLimit: Should cap at max limit', () => {
  const limit = getDailyLimit(100, 20, 3, 3);
  expect(limit).toBeLessThanOrEqual(20);
});

// Test getDaysSinceStart
test('getDaysSinceStart: Same day should return 1', () => {
  const now = new Date();
  const days = getDaysSinceStart(now);
  expect(days).toBe(1);
});

test('getDaysSinceStart: Week ago should return 8', () => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const days = getDaysSinceStart(weekAgo);
  expect(days).toBe(8);
});

test('getDaysSinceStart: Old date should return positive', () => {
  const oldDate = new Date('2020-01-01');
  const days = getDaysSinceStart(oldDate);
  expect(days).toBeGreaterThan(0);
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
