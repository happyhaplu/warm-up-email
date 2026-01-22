/**
 * Warmup Utilities
 * Helper functions for gradual ramp-up and randomization
 */

interface WarmupRampSchedule {
  minDay: number;
  maxDay: number;
  dailyLimit: number;
}

// Gradual ramp-up schedule (hard-coded)
const WARMUP_RAMP_SCHEDULE: WarmupRampSchedule[] = [
  { minDay: 1, maxDay: 3, dailyLimit: 3 },    // Day 1-3: 3 emails/day
  { minDay: 4, maxDay: 6, dailyLimit: 5 },    // Day 4-6: 5 emails/day
  { minDay: 7, maxDay: 10, dailyLimit: 7 },   // Day 7-10: 7 emails/day
  { minDay: 11, maxDay: 14, dailyLimit: 10 }, // Day 11-14: 10 emails/day
  // Day 15+: uses warmupMaxDaily from account (10-20)
];

/**
 * Get the daily send limit for a mailbox based on days since warmup start
 * @param daysSinceStart Number of days since warmup began
 * @param maxDaily Maximum daily limit (configured per mailbox)
 * @returns Daily send limit for current day
 */
export function getDailyLimit(daysSinceStart: number, maxDaily: number = 20): number {
  if (daysSinceStart < 1) return 0;

  // Find matching schedule
  for (const schedule of WARMUP_RAMP_SCHEDULE) {
    if (daysSinceStart >= schedule.minDay && daysSinceStart <= schedule.maxDay) {
      return schedule.dailyLimit;
    }
  }

  // Day 15+: cap at configured max (10-20)
  return Math.min(maxDaily, 20);
}

/**
 * Get random time offset in milliseconds
 * @param minMinutes Minimum offset in minutes
 * @param maxMinutes Maximum offset in minutes
 * @returns Random offset in milliseconds
 */
export function getRandomOffset(minMinutes: number, maxMinutes: number): number {
  const min = minMinutes * 60 * 1000;
  const max = maxMinutes * 60 * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get random reply delay in milliseconds (5-240 minutes)
 * @returns Random delay in milliseconds
 */
export function getRandomReplyDelay(): number {
  return getRandomOffset(5, 240);
}

/**
 * Get random send time offset (±30-90 minutes)
 * @returns Random offset in milliseconds (can be negative)
 */
export function getRandomSendOffset(): number {
  const minOffset = 30 * 60 * 1000;  // 30 minutes
  const maxOffset = 90 * 60 * 1000;  // 90 minutes
  const offset = Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
  // Randomly make it negative or positive
  return Math.random() > 0.5 ? offset : -offset;
}

/**
 * Calculate days since warmup start
 * @param startDate When warmup began
 * @returns Number of days since start (1-indexed)
 */
export function getDaysSinceStart(startDate: Date): number {
  const now = new Date();
  const start = new Date(startDate);
  
  // Reset to midnight for accurate day calculation
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays + 1; // 1-indexed (day 1 is the start day)
}

/**
 * Add slight variations to email subject to avoid pattern detection
 * @param subject Original subject
 * @returns Slightly modified subject
 */
export function randomizeSubject(subject: string): string {
  const variations = [
    subject, // Keep original
    subject + ' 👋',
    subject + ' 🙂',
    `${subject}`,
    subject.replace('?', ''),
    subject + '!',
    'Re: ' + subject,
  ];
  
  return variations[Math.floor(Math.random() * variations.length)];
}

/**
 * Add slight variations to email body to avoid pattern detection
 * @param body Original email body
 * @returns Slightly modified body
 */
export function randomizeBody(body: string): string {
  const greetings = [
    'Hi there,\n\n',
    'Hello,\n\n',
    'Hey,\n\n',
    'Hi,\n\n',
    '',
  ];
  
  const closings = [
    '\n\nBest regards',
    '\n\nThanks',
    '\n\nCheers',
    '\n\nBest',
    '\n\nThank you',
    '',
  ];
  
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  const closing = closings[Math.floor(Math.random() * closings.length)];
  
  return greeting + body + closing;
}

/**
 * Get a randomized delay before sending next email (to spread out sends)
 * @returns Delay in milliseconds (2-10 minutes)
 */
export function getRandomSendDelay(): number {
  return getRandomOffset(2, 10);
}

/**
 * Check if mailbox should send today based on daily limit and sent count
 * @param sentToday Number of emails sent today
 * @param dailyLimit Current daily limit
 * @returns True if mailbox can send more emails today
 */
export function canSendToday(sentToday: number, dailyLimit: number): boolean {
  return sentToday < dailyLimit;
}

/**
 * Get warmup schedule info for display
 * @param dayNumber Current day number
 * @param maxDaily Maximum daily limit
 * @returns Warmup schedule information
 */
export function getWarmupScheduleInfo(dayNumber: number, maxDaily: number = 20) {
  const dailyLimit = getDailyLimit(dayNumber, maxDaily);
  
  let phase = 'Initial';
  if (dayNumber >= 1 && dayNumber <= 3) phase = 'Initial (Day 1-3)';
  else if (dayNumber >= 4 && dayNumber <= 6) phase = 'Early (Day 4-6)';
  else if (dayNumber >= 7 && dayNumber <= 10) phase = 'Growing (Day 7-10)';
  else if (dayNumber >= 11 && dayNumber <= 14) phase = 'Mature (Day 11-14)';
  else if (dayNumber >= 15) phase = 'Established (Day 15+)';
  
  return {
    dayNumber,
    dailyLimit,
    phase,
    nextPhaseDay: dayNumber < 15 ? getNextPhaseDay(dayNumber) : null,
  };
}

/**
 * Get the day when next phase starts
 */
function getNextPhaseDay(currentDay: number): number {
  if (currentDay < 4) return 4;
  if (currentDay < 7) return 7;
  if (currentDay < 11) return 11;
  if (currentDay < 15) return 15;
  return 15;
}
