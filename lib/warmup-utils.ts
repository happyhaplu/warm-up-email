/**
 * Warmup Utilities
 * Helper functions for gradual ramp-up and randomization
 */

import { WarmupConfig } from './warmup-config';

interface WarmupRampSchedule {
  minDay: number;
  maxDay: number;
  dailyLimit: number;
}

/**
 * Calculate the daily send limit based on warmup settings
 * @param daysSinceStart Number of days since warmup began
 * @param maxDaily Maximum daily limit (0 or -1 for unlimited)
 * @param startCount Starting daily count
 * @param increaseBy How much to increase each day
 * @returns Daily send limit for current day
 */
export function getDailyLimit(
  daysSinceStart: number, 
  maxDaily: number = WarmupConfig.DEFAULT_MAX_DAILY,
  startCount: number = WarmupConfig.DEFAULT_START_COUNT,
  increaseBy: number = WarmupConfig.DEFAULT_INCREASE_BY
): number {
  if (daysSinceStart < 1) return 0;

  // Calculate progressive limit: startCount + (daysSinceStart - 1) * increaseBy
  const calculatedLimit = startCount + (daysSinceStart - 1) * increaseBy;

  // Handle unlimited case (0 or -1 means unlimited)
  if (maxDaily === 0 || maxDaily === -1) {
    return calculatedLimit; // No cap
  }

  // Cap at maxDaily
  return Math.min(calculatedLimit, maxDaily);
}

/**
 * Get random delay between email sends (uses config values)
 * @returns Random delay in milliseconds
 */
export function getRandomSendDelay(): number {
  const minMinutes = WarmupConfig.SEND_DELAY_MIN;
  const maxMinutes = WarmupConfig.SEND_DELAY_MAX;
  const min = minMinutes * 60 * 1000;
  const max = maxMinutes * 60 * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
 * Get random reply delay in milliseconds (uses config values for natural behavior)
 * @returns Random delay in milliseconds
 */
export function getRandomReplyDelay(): number {
  return getRandomOffset(WarmupConfig.REPLY_DELAY_MIN, WarmupConfig.REPLY_DELAY_MAX);
}

/**
 * Get random reply delay in minutes (for display)
 * @returns Random delay in minutes
 */
export function getRandomReplyDelayMinutes(): number {
  const delayMs = getRandomReplyDelay();
  return Math.floor(delayMs / (60 * 1000));
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

/**
 * Calculate scheduled time for a reply
 * @param now Current time
 * @param delayMs Delay in milliseconds
 * @returns Scheduled date/time
 */
export function getScheduledReplyTime(now: Date = new Date(), delayMs?: number): Date {
  const delay = delayMs || getRandomReplyDelay();
  return new Date(now.getTime() + delay);
}

/**
 * Check if user has exceeded their plan limits
 * @param usage Current usage
 * @param planLimits Plan limits
 * @returns Object indicating if limits are exceeded and which ones
 */
export function checkPlanLimits(
  usage: {
    mailboxCount: number;
    dailyEmailsSent: number;
    monthlyEmailsSent: number;
  },
  planLimits: {
    mailboxLimit: number;
    dailyEmailLimit: number;
    monthlyEmailLimit: number;
  }
): {
  exceeded: boolean;
  mailboxLimitExceeded: boolean;
  dailyLimitExceeded: boolean;
  monthlyLimitExceeded: boolean;
  message?: string;
} {
  const mailboxLimitExceeded = usage.mailboxCount >= planLimits.mailboxLimit;
  const dailyLimitExceeded = usage.dailyEmailsSent >= planLimits.dailyEmailLimit;
  const monthlyLimitExceeded = usage.monthlyEmailsSent >= planLimits.monthlyEmailLimit;

  const exceeded = mailboxLimitExceeded || dailyLimitExceeded || monthlyLimitExceeded;

  let message = '';
  if (mailboxLimitExceeded) message = `Mailbox limit reached (${usage.mailboxCount}/${planLimits.mailboxLimit})`;
  else if (dailyLimitExceeded) message = `Daily email limit reached (${usage.dailyEmailsSent}/${planLimits.dailyEmailLimit})`;
  else if (monthlyLimitExceeded) message = `Monthly email limit reached (${usage.monthlyEmailsSent}/${planLimits.monthlyEmailLimit})`;

  return {
    exceeded,
    mailboxLimitExceeded,
    dailyLimitExceeded,
    monthlyLimitExceeded,
    message,
  };
}
