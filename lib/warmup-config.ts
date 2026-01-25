/**
 * Warmup Configuration
 * Centralized configuration for all warmup parameters
 * Replace hardcoded magic numbers throughout the codebase
 */

export const WarmupConfig = {
  // Send Delays (minutes)
  SEND_DELAY_MIN: parseInt(process.env.WARMUP_SEND_DELAY_MIN || '3', 10),
  SEND_DELAY_MAX: parseInt(process.env.WARMUP_SEND_DELAY_MAX || '15', 10),

  // Reply Delays (minutes)
  REPLY_DELAY_MIN: parseInt(process.env.WARMUP_REPLY_DELAY_MIN || '5', 10),
  REPLY_DELAY_MAX: parseInt(process.env.WARMUP_REPLY_DELAY_MAX || '240', 10),

  // Warmup Defaults
  DEFAULT_START_COUNT: 3,
  DEFAULT_INCREASE_BY: 3,
  DEFAULT_MAX_DAILY: 20,
  DEFAULT_REPLY_RATE: 35, // percentage

  // Warmup Limits
  MIN_START_COUNT: 1,
  MAX_START_COUNT: 10,
  MIN_INCREASE_BY: 1,
  MAX_INCREASE_BY: 5,
  MIN_MAX_DAILY: 5,
  MAX_MAX_DAILY: 30,
  MIN_REPLY_RATE: 25,
  MAX_REPLY_RATE: 45,

  // Cron Settings
  CHECK_INTERVAL_MS: parseInt(process.env.WARMUP_CHECK_INTERVAL_MS || '300000', 10), // 5 minutes
  
  // Global Rate Limiting
  GLOBAL_HOURLY_LIMIT: parseInt(process.env.WARMUP_GLOBAL_HOURLY_LIMIT || '500', 10),
  GLOBAL_MINUTE_LIMIT: parseInt(process.env.WARMUP_GLOBAL_MINUTE_LIMIT || '20', 10),

  // Recipient Pool Settings
  USE_DEDICATED_RECIPIENT_POOL: process.env.WARMUP_USE_RECIPIENT_POOL === 'true',
  MIN_RECIPIENT_POOL_SIZE: 10,

  // Email Uniqueness
  PREVENT_DUPLICATE_SENDS_PER_DAY: true,
  
  // SMTP/IMAP Settings
  SMTP_TIMEOUT: 30000, // 30 seconds
  IMAP_TIMEOUT: 30000, // 30 seconds
  
  // Retry Settings
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000, // 5 seconds

  // Logging
  VERBOSE_LOGGING: process.env.WARMUP_VERBOSE_LOGGING === 'true',
} as const;

export type WarmupConfigType = typeof WarmupConfig;

// Validation
export function validateWarmupSettings(settings: {
  warmupStartCount?: number;
  warmupIncreaseBy?: number;
  warmupMaxDaily?: number;
  warmupReplyRate?: number;
}) {
  const errors: string[] = [];

  if (settings.warmupStartCount !== undefined) {
    if (settings.warmupStartCount < WarmupConfig.MIN_START_COUNT || 
        settings.warmupStartCount > WarmupConfig.MAX_START_COUNT) {
      errors.push(`Start count must be between ${WarmupConfig.MIN_START_COUNT} and ${WarmupConfig.MAX_START_COUNT}`);
    }
  }

  if (settings.warmupIncreaseBy !== undefined) {
    if (settings.warmupIncreaseBy < WarmupConfig.MIN_INCREASE_BY || 
        settings.warmupIncreaseBy > WarmupConfig.MAX_INCREASE_BY) {
      errors.push(`Increase by must be between ${WarmupConfig.MIN_INCREASE_BY} and ${WarmupConfig.MAX_INCREASE_BY}`);
    }
  }

  if (settings.warmupMaxDaily !== undefined) {
    if (settings.warmupMaxDaily < WarmupConfig.MIN_MAX_DAILY || 
        settings.warmupMaxDaily > WarmupConfig.MAX_MAX_DAILY) {
      errors.push(`Max daily must be between ${WarmupConfig.MIN_MAX_DAILY} and ${WarmupConfig.MAX_MAX_DAILY}`);
    }
  }

  if (settings.warmupReplyRate !== undefined) {
    if (settings.warmupReplyRate < WarmupConfig.MIN_REPLY_RATE || 
        settings.warmupReplyRate > WarmupConfig.MAX_REPLY_RATE) {
      errors.push(`Reply rate must be between ${WarmupConfig.MIN_REPLY_RATE}% and ${WarmupConfig.MAX_REPLY_RATE}%`);
    }
  }

  return { valid: errors.length === 0, errors };
}
