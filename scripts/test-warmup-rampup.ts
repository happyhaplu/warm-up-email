/**
 * Test script for warmup gradual ramp-up and randomization
 */

import {
  getDailyLimit,
  getDaysSinceStart,
  getRandomOffset,
  getRandomReplyDelay,
  getRandomSendOffset,
  randomizeSubject,
  randomizeBody,
  getWarmupScheduleInfo,
} from '../lib/warmup-utils';

console.log('🧪 Testing Warmup Gradual Ramp-Up System\n');

// Test 1: Daily Limits
console.log('📊 Test 1: Daily Limit Ramp-Up Schedule');
console.log('==========================================');
for (let day = 1; day <= 20; day++) {
  const limit = getDailyLimit(day, 20);
  const info = getWarmupScheduleInfo(day, 20);
  console.log(`Day ${day.toString().padStart(2, ' ')}: ${limit.toString().padStart(2, ' ')} emails/day - ${info.phase}`);
}

// Test 2: Days Since Start Calculation
console.log('\n📅 Test 2: Days Since Start Calculation');
console.log('==========================================');
const testDates = [
  new Date(), // Today (Day 1)
  new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (Day 3)
  new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago (Day 7)
  new Date(Date.now() - 13 * 24 * 60 * 60 * 1000), // 13 days ago (Day 14)
  new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago (Day 21)
];

testDates.forEach((date, i) => {
  const dayNumber = getDaysSinceStart(date);
  const limit = getDailyLimit(dayNumber, 20);
  console.log(`Start Date: ${date.toLocaleDateString()} → Day ${dayNumber} → ${limit} emails/day`);
});

// Test 3: Randomization
console.log('\n🎲 Test 3: Randomization Validation');
console.log('==========================================');

console.log('\nRandom Send Offsets (±30-90 minutes):');
for (let i = 0; i < 5; i++) {
  const offset = getRandomSendOffset();
  const minutes = Math.round(offset / 1000 / 60);
  console.log(`  ${minutes > 0 ? '+' : ''}${minutes} minutes`);
}

console.log('\nRandom Reply Delays (5-240 minutes):');
for (let i = 0; i < 5; i++) {
  const delay = getRandomReplyDelay();
  const minutes = Math.round(delay / 1000 / 60);
  console.log(`  ${minutes} minutes`);
}

console.log('\nRandom Offset Range (30-90 minutes):');
for (let i = 0; i < 5; i++) {
  const offset = getRandomOffset(30, 90);
  const minutes = Math.round(offset / 1000 / 60);
  console.log(`  ${minutes} minutes`);
}

// Test 4: Template Randomization
console.log('\n📝 Test 4: Template Randomization');
console.log('==========================================');

const testSubject = 'Quick question about collaboration';
const testBody = 'I wanted to reach out regarding a potential opportunity to work together.';

console.log('\nOriginal Subject: "' + testSubject + '"');
console.log('Randomized Versions:');
for (let i = 0; i < 5; i++) {
  console.log(`  ${i + 1}. "${randomizeSubject(testSubject)}"`);
}

console.log('\nOriginal Body: "' + testBody + '"');
console.log('Randomized Versions (showing first 80 chars):');
for (let i = 0; i < 3; i++) {
  const randomized = randomizeBody(testBody);
  const preview = randomized.substring(0, 80).replace(/\n/g, '↵');
  console.log(`  ${i + 1}. "${preview}..."`);
}

// Test 5: Multiple Mailboxes Simulation
console.log('\n👥 Test 5: Multiple Mailboxes Simulation');
console.log('==========================================');

interface SimulatedMailbox {
  email: string;
  startDate: Date;
  dayNumber: number;
  dailyLimit: number;
  sentToday: number;
}

const mailboxes: SimulatedMailbox[] = [
  {
    email: 'mailbox1@example.com',
    startDate: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000), // Started today
    dayNumber: 0,
    dailyLimit: 0,
    sentToday: 0,
  },
  {
    email: 'mailbox2@example.com',
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Started 5 days ago
    dayNumber: 0,
    dailyLimit: 0,
    sentToday: 0,
  },
  {
    email: 'mailbox3@example.com',
    startDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // Started 12 days ago
    dayNumber: 0,
    dailyLimit: 0,
    sentToday: 0,
  },
  {
    email: 'mailbox4@example.com',
    startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // Started 20 days ago
    dayNumber: 0,
    dailyLimit: 0,
    sentToday: 0,
  },
];

mailboxes.forEach((mailbox) => {
  mailbox.dayNumber = getDaysSinceStart(mailbox.startDate);
  mailbox.dailyLimit = getDailyLimit(mailbox.dayNumber, 20);
  mailbox.sentToday = Math.floor(Math.random() * mailbox.dailyLimit);
  
  const info = getWarmupScheduleInfo(mailbox.dayNumber, 20);
  const remaining = mailbox.dailyLimit - mailbox.sentToday;
  
  console.log(`\n${mailbox.email}:`);
  console.log(`  Started: ${mailbox.startDate.toLocaleDateString()}`);
  console.log(`  Day: ${mailbox.dayNumber} (${info.phase})`);
  console.log(`  Limit: ${mailbox.dailyLimit} emails/day`);
  console.log(`  Sent: ${mailbox.sentToday}/${mailbox.dailyLimit}`);
  console.log(`  Remaining: ${remaining}`);
  console.log(`  Status: ${remaining > 0 ? '✅ Can send more' : '⏸️ Quota reached'}`);
});

// Test 6: Validation Summary
console.log('\n✅ Test 6: Validation Summary');
console.log('==========================================');

let allTestsPassed = true;

// Validate ramp-up schedule
const day1 = getDailyLimit(1, 20);
const day4 = getDailyLimit(4, 20);
const day7 = getDailyLimit(7, 20);
const day11 = getDailyLimit(11, 20);
const day15 = getDailyLimit(15, 20);

console.log('\n✓ Ramp-Up Schedule:');
console.log(`  Day 1-3: ${day1} emails/day ${day1 === 3 ? '✅' : '❌'}`);
console.log(`  Day 4-6: ${day4} emails/day ${day4 === 5 ? '✅' : '❌'}`);
console.log(`  Day 7-10: ${day7} emails/day ${day7 === 7 ? '✅' : '❌'}`);
console.log(`  Day 11-14: ${day11} emails/day ${day11 === 10 ? '✅' : '❌'}`);
console.log(`  Day 15+: ${day15} emails/day ${day15 === 20 ? '✅' : '❌'}`);

if (day1 !== 3 || day4 !== 5 || day7 !== 7 || day11 !== 10 || day15 !== 20) {
  allTestsPassed = false;
}

// Validate randomization ranges
console.log('\n✓ Randomization Ranges:');
let validOffsets = true;
for (let i = 0; i < 10; i++) {
  const offset = getRandomSendOffset();
  const minutes = Math.abs(offset) / 1000 / 60;
  if (minutes < 30 || minutes > 90) {
    validOffsets = false;
    break;
  }
}
console.log(`  Send offsets (±30-90 min): ${validOffsets ? '✅' : '❌'}`);

let validReplies = true;
for (let i = 0; i < 10; i++) {
  const delay = getRandomReplyDelay();
  const minutes = delay / 1000 / 60;
  if (minutes < 5 || minutes > 240) {
    validReplies = false;
    break;
  }
}
console.log(`  Reply delays (5-240 min): ${validReplies ? '✅' : '❌'}`);

if (!validOffsets || !validReplies) {
  allTestsPassed = false;
}

// Validate template variations
console.log('\n✓ Template Variations:');
const subjects = new Set<string>();
const bodies = new Set<string>();

for (let i = 0; i < 10; i++) {
  subjects.add(randomizeSubject(testSubject));
  bodies.add(randomizeBody(testBody));
}

const hasSubjectVariation = subjects.size > 1;
const hasBodyVariation = bodies.size > 1;

console.log(`  Subject variations: ${subjects.size} unique ${hasSubjectVariation ? '✅' : '❌'}`);
console.log(`  Body variations: ${bodies.size} unique ${hasBodyVariation ? '✅' : '❌'}`);

if (!hasSubjectVariation || !hasBodyVariation) {
  allTestsPassed = false;
}

// Final result
console.log('\n' + '='.repeat(50));
if (allTestsPassed) {
  console.log('✅ ALL TESTS PASSED!');
  console.log('\nThe warmup system is ready for production:');
  console.log('  • Gradual ramp-up follows the specified schedule');
  console.log('  • Randomization prevents pattern detection');
  console.log('  • Template variations ensure unique content');
  console.log('  • Multiple mailboxes can ramp up independently');
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log('Please review the output above for details.');
  process.exit(1);
}

console.log('='.repeat(50) + '\n');
