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

/**
 * Scalable Warmup Engine Configuration
 * Production settings for handling thousands of users × 100 mailboxes each
 */
export const WarmupEngineConfig = {
  // Batch Processing
  BATCH_SIZE: parseInt(process.env.WARMUP_BATCH_SIZE || '100', 10), // Process 100 mailboxes per batch
  MAX_CONCURRENT_SENDS: parseInt(process.env.WARMUP_MAX_CONCURRENT || '20', 10), // 20 parallel sends
  BATCH_DELAY_MS: parseInt(process.env.WARMUP_BATCH_DELAY_MS || '5000', 10), // 5s between batches
  
  // Send Stagger (natural spacing between initiating sends)
  SEND_STAGGER_MIN_MS: parseInt(process.env.WARMUP_STAGGER_MIN_MS || '1000', 10), // 1s min
  SEND_STAGGER_MAX_MS: parseInt(process.env.WARMUP_STAGGER_MAX_MS || '5000', 10), // 5s max
  
  // Per-Mailbox Cooldown (prevents same mailbox from sending too frequently)
  MAILBOX_COOLDOWN_MIN_MS: parseInt(process.env.WARMUP_MAILBOX_COOLDOWN_MIN_MS || '180000', 10), // 3 min minimum gap
  MAILBOX_COOLDOWN_MAX_MS: parseInt(process.env.WARMUP_MAILBOX_COOLDOWN_MAX_MS || '600000', 10), // 10 min maximum gap
  MAILBOX_COOLDOWN_RANDOMIZE: process.env.WARMUP_MAILBOX_COOLDOWN_RANDOMIZE !== 'false', // Randomize for natural patterns
  
  // Global Safety Limits (system-wide)
  GLOBAL_HOURLY_LIMIT: parseInt(process.env.WARMUP_GLOBAL_HOURLY_LIMIT || '10000', 10), // 10k/hour system-wide
  GLOBAL_MINUTE_LIMIT: parseInt(process.env.WARMUP_GLOBAL_MINUTE_LIMIT || '200', 10), // 200/min system-wide
  
  // Per-User Caps (enforced at user level across all their mailboxes)
  USER_HOURLY_LIMIT: parseInt(process.env.WARMUP_USER_HOURLY_LIMIT || '500', 10), // 500/hour per user
  USER_DAILY_CAP_MULTIPLIER: parseFloat(process.env.WARMUP_USER_DAILY_CAP || '1.2'), // 1.2x plan limit as hard cap
  
  // Timeout Settings
  SMTP_TIMEOUT_MS: parseInt(process.env.WARMUP_SMTP_TIMEOUT_MS || '30000', 10), // 30s SMTP timeout
  IMAP_TIMEOUT_MS: parseInt(process.env.WARMUP_IMAP_TIMEOUT_MS || '30000', 10), // 30s IMAP timeout
  
  // Rate Limit Backoff
  RATE_LIMIT_BACKOFF_MS: parseInt(process.env.WARMUP_RATE_LIMIT_BACKOFF_MS || '10000', 10), // 10s backoff when rate limited
  
  // Monitoring & Metrics
  METRICS_RETENTION_DAYS: parseInt(process.env.WARMUP_METRICS_RETENTION_DAYS || '30', 10), // Keep 30 days of metrics
  ENABLE_DETAILED_METRICS: process.env.WARMUP_ENABLE_DETAILED_METRICS !== 'false', // Default enabled
  
  // Quota Enforcement
  MIN_DAILY_QUOTA_PER_MAILBOX: parseInt(process.env.WARMUP_MIN_DAILY_QUOTA || '30', 10), // Minimum 30/day per mailbox
  QUOTA_DEFICIT_PRIORITY_BOOST: parseFloat(process.env.WARMUP_QUOTA_PRIORITY_BOOST || '2.0'), // 2x priority for mailboxes behind quota
  
  // Horizontal Scaling
  ENABLE_DISTRIBUTED_MODE: process.env.WARMUP_DISTRIBUTED_MODE === 'true', // Enable for multi-instance deployment
  WORKER_ID: process.env.WARMUP_WORKER_ID || '1', // Worker identifier for distributed systems
  WORKER_COUNT: parseInt(process.env.WARMUP_WORKER_COUNT || '1', 10), // Total workers in cluster
  
  // Cron Schedule
  CRON_INTERVAL_MINUTES: parseInt(process.env.WARMUP_CRON_INTERVAL_MINUTES || '15', 10), // Run every 15 minutes
  CRON_SPREAD_WINDOW_MINUTES: parseInt(process.env.WARMUP_CRON_SPREAD_MINUTES || '10', 10), // Spread sends over 10min window
} as const;

export type WarmupEngineConfigType = typeof WarmupEngineConfig;

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
