/**
 * Warmup Metrics System
 * Real-time quota tracking, throughput monitoring, and performance metrics
 * Designed for production observability at scale
 */

import prisma from './prisma';
import { WarmupEngineConfig } from './warmup-config';

interface MailboxMetrics {
  mailboxId: number;
  email: string;
  totalSent: number;
  totalFailed: number;
  avgSendTimeMs: number;
  lastSendTime: Date | null;
  quotaFillRate: number; // Percentage of daily quota filled
  currentStreak: number; // Days of consecutive sends
}

interface SystemMetrics {
  totalMailboxes: number;
  activeMailboxes: number; // Mailboxes that sent today
  totalSentToday: number;
  totalFailedToday: number;
  avgBatchDuration: number;
  throughputPerHour: number;
  quotaCompletionRate: number; // % of mailboxes that hit their quota
  systemHealth: 'healthy' | 'degraded' | 'critical';
}

interface BatchMetrics {
  batchId: string;
  startTime: Date;
  endTime: Date;
  totalProcessed: number;
  successful: number;
  failed: number;
  duration: number;
  throughput: number; // emails per second
}

interface QuotaStatus {
  mailboxId: number;
  email: string;
  dailyQuota: number;
  sentToday: number;
  remaining: number;
  percentComplete: number;
  status: 'on-track' | 'behind' | 'complete' | 'failing';
  hoursRemaining: number;
}

export class WarmupMetrics {
  private batchHistory: BatchMetrics[] = [];
  private mailboxStats = new Map<number, {
    sent: number;
    failed: number;
    totalDuration: number;
    lastSend: Date | null;
  }>();

  /**
   * Record email sent successfully
   */
  async recordEmailSent(mailboxId: number, email: string, durationMs: number): Promise<void> {
    const stats = this.mailboxStats.get(mailboxId) || {
      sent: 0,
      failed: 0,
      totalDuration: 0,
      lastSend: null,
    };

    stats.sent++;
    stats.totalDuration += durationMs;
    stats.lastSend = new Date();
    this.mailboxStats.set(mailboxId, stats);
  }

  /**
   * Record email failed
   */
  async recordEmailFailed(mailboxId: number, email: string, error: string): Promise<void> {
    const stats = this.mailboxStats.get(mailboxId) || {
      sent: 0,
      failed: 0,
      totalDuration: 0,
      lastSend: null,
    };

    stats.failed++;
    this.mailboxStats.set(mailboxId, stats);
  }

  /**
   * Record batch completion
   */
  async recordBatchComplete(batch: {
    totalProcessed: number;
    successful: number;
    failed: number;
    duration: number;
  }): Promise<void> {
    const batchMetric: BatchMetrics = {
      batchId: `batch-${Date.now()}`,
      startTime: new Date(Date.now() - batch.duration),
      endTime: new Date(),
      totalProcessed: batch.totalProcessed,
      successful: batch.successful,
      failed: batch.failed,
      duration: batch.duration,
      throughput: batch.totalProcessed / (batch.duration / 1000), // per second
    };

    this.batchHistory.push(batchMetric);

    // Keep only recent history (last 100 batches)
    if (this.batchHistory.length > 100) {
      this.batchHistory.shift();
    }

    // Log to console
    console.log(`📊 Batch complete: ${batch.successful}/${batch.totalProcessed} sent, throughput: ${batchMetric.throughput.toFixed(2)} emails/s`);
  }

  /**
   * Get real-time quota status for all mailboxes
   */
  async getQuotaStatus(): Promise<QuotaStatus[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const now = new Date();
    const hoursRemaining = Math.max(0, (tomorrow.getTime() - now.getTime()) / (1000 * 60 * 60));

    const warmupLogs = await prisma.warmupLog.findMany({
      where: {
        date: today,
      },
      include: {
        mailbox: {
          select: {
            id: true,
            email: true,
            warmupEnabled: true,
          },
        },
      },
    });

    const quotaStatuses: QuotaStatus[] = warmupLogs
      .filter(log => log.mailbox.warmupEnabled)
      .map(log => {
        const percentComplete = (log.sentCount / Math.max(log.dailyLimit, 1)) * 100;
        const remaining = Math.max(0, log.dailyLimit - log.sentCount);

        let status: QuotaStatus['status'] = 'on-track';
        if (percentComplete >= 100) {
          status = 'complete';
        } else if (percentComplete < 50 && hoursRemaining < 12) {
          status = 'behind';
        } else if (log.sentCount === 0 && hoursRemaining < 6) {
          status = 'failing';
        }

        return {
          mailboxId: log.mailboxId,
          email: log.mailbox.email!,
          dailyQuota: log.dailyLimit,
          sentToday: log.sentCount,
          remaining,
          percentComplete,
          status,
          hoursRemaining,
        };
      });

    // Sort by status priority (failing > behind > on-track > complete)
    const statusPriority = { failing: 0, behind: 1, 'on-track': 2, complete: 3 };
    quotaStatuses.sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);

    return quotaStatuses;
  }

  /**
   * Get mailbox-specific metrics
   */
  async getMailboxMetrics(mailboxId?: number): Promise<MailboxMetrics[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where = mailboxId ? { mailboxId } : {};
    const warmupLogs = await prisma.warmupLog.findMany({
      where: {
        ...where,
        date: today,
      },
      include: {
        mailbox: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    const metrics: MailboxMetrics[] = [];

    for (const log of warmupLogs) {
      const stats = this.mailboxStats.get(log.mailboxId);
      const totalSent = stats?.sent || log.sentCount;
      const totalFailed = stats?.failed || 0;
      const avgSendTimeMs = stats ? stats.totalDuration / Math.max(stats.sent, 1) : 0;
      const quotaFillRate = (log.sentCount / Math.max(log.dailyLimit, 1)) * 100;

      // Calculate streak (consecutive days of sending)
      const streak = await this.calculateStreak(log.mailboxId);

      metrics.push({
        mailboxId: log.mailboxId,
        email: log.mailbox.email!,
        totalSent,
        totalFailed,
        avgSendTimeMs,
        lastSendTime: stats?.lastSend || null,
        quotaFillRate,
        currentStreak: streak,
      });
    }

    return metrics;
  }

  /**
   * Calculate consecutive day streak for a mailbox
   */
  private async calculateStreak(mailboxId: number): Promise<number> {
    const logs = await prisma.warmupLog.findMany({
      where: {
        mailboxId,
        sentCount: { gt: 0 },
      },
      orderBy: {
        date: 'desc',
      },
      take: 30, // Check last 30 days
    });

    if (logs.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < logs.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      const logDate = new Date(logs[i].date);
      logDate.setHours(0, 0, 0, 0);

      if (logDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Get system-wide metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all warmup-enabled mailboxes
    const totalMailboxes = await prisma.account.count({
      where: {
        warmupEnabled: true,
        email: { not: '' },
      },
    });

    // Get warmup logs for today
    const warmupLogs = await prisma.warmupLog.findMany({
      where: {
        date: today,
      },
    });

    const activeMailboxes = warmupLogs.filter(log => log.sentCount > 0).length;
    const totalSentToday = warmupLogs.reduce((sum, log) => sum + log.sentCount, 0);
    
    // Calculate failures
    const totalFailedToday = await prisma.log.count({
      where: {
        timestamp: { gte: today, lt: tomorrow },
        status: 'FAILED',
      },
    });

    // Calculate average batch duration from history
    const avgBatchDuration = this.batchHistory.length > 0
      ? this.batchHistory.reduce((sum, b) => sum + b.duration, 0) / this.batchHistory.length
      : 0;

    // Calculate throughput (emails per hour)
    const hoursPassed = Math.max(1, (new Date().getTime() - today.getTime()) / (1000 * 60 * 60));
    const throughputPerHour = totalSentToday / hoursPassed;

    // Calculate quota completion rate
    const mailboxesWithQuotaComplete = warmupLogs.filter(
      log => log.sentCount >= log.dailyLimit
    ).length;
    const quotaCompletionRate = totalMailboxes > 0
      ? (mailboxesWithQuotaComplete / totalMailboxes) * 100
      : 0;

    // Determine system health
    let systemHealth: SystemMetrics['systemHealth'] = 'healthy';
    const failureRate = totalSentToday > 0 ? (totalFailedToday / totalSentToday) * 100 : 0;
    
    if (failureRate > 20 || quotaCompletionRate < 30) {
      systemHealth = 'critical';
    } else if (failureRate > 10 || quotaCompletionRate < 60) {
      systemHealth = 'degraded';
    }

    return {
      totalMailboxes,
      activeMailboxes,
      totalSentToday,
      totalFailedToday,
      avgBatchDuration,
      throughputPerHour,
      quotaCompletionRate,
      systemHealth,
    };
  }

  /**
   * Get batch history
   */
  getBatchHistory(limit: number = 10): BatchMetrics[] {
    return this.batchHistory.slice(-limit).reverse();
  }

  /**
   * Get mailboxes behind quota
   */
  async getMailboxesBehindQuota(): Promise<QuotaStatus[]> {
    const allStatuses = await this.getQuotaStatus();
    return allStatuses.filter(s => s.status === 'behind' || s.status === 'failing');
  }

  /**
   * Get top performing mailboxes
   */
  async getTopPerformers(limit: number = 10): Promise<MailboxMetrics[]> {
    const metrics = await this.getMailboxMetrics();
    return metrics
      .sort((a, b) => b.quotaFillRate - a.quotaFillRate)
      .slice(0, limit);
  }

  /**
   * Get performance summary for dashboards
   */
  async getPerformanceSummary(): Promise<{
    system: SystemMetrics;
    topPerformers: MailboxMetrics[];
    behindQuota: QuotaStatus[];
    recentBatches: BatchMetrics[];
  }> {
    const [system, topPerformers, behindQuota, recentBatches] = await Promise.all([
      this.getSystemMetrics(),
      this.getTopPerformers(5),
      this.getMailboxesBehindQuota(),
      Promise.resolve(this.getBatchHistory(5)),
    ]);

    return {
      system,
      topPerformers,
      behindQuota,
      recentBatches,
    };
  }

  /**
   * Export metrics for external monitoring systems (Prometheus, Datadog, etc.)
   */
  async exportPrometheusMetrics(): Promise<string> {
    const system = await this.getSystemMetrics();
    const quotaStatuses = await this.getQuotaStatus();

    const lines: string[] = [];

    // System metrics
    lines.push(`# HELP warmup_total_mailboxes Total number of warmup-enabled mailboxes`);
    lines.push(`# TYPE warmup_total_mailboxes gauge`);
    lines.push(`warmup_total_mailboxes ${system.totalMailboxes}`);

    lines.push(`# HELP warmup_active_mailboxes Number of mailboxes that sent today`);
    lines.push(`# TYPE warmup_active_mailboxes gauge`);
    lines.push(`warmup_active_mailboxes ${system.activeMailboxes}`);

    lines.push(`# HELP warmup_emails_sent_today Total emails sent today`);
    lines.push(`# TYPE warmup_emails_sent_today counter`);
    lines.push(`warmup_emails_sent_today ${system.totalSentToday}`);

    lines.push(`# HELP warmup_emails_failed_today Total emails failed today`);
    lines.push(`# TYPE warmup_emails_failed_today counter`);
    lines.push(`warmup_emails_failed_today ${system.totalFailedToday}`);

    lines.push(`# HELP warmup_throughput_per_hour Emails sent per hour`);
    lines.push(`# TYPE warmup_throughput_per_hour gauge`);
    lines.push(`warmup_throughput_per_hour ${system.throughputPerHour.toFixed(2)}`);

    lines.push(`# HELP warmup_quota_completion_rate Percentage of mailboxes at quota`);
    lines.push(`# TYPE warmup_quota_completion_rate gauge`);
    lines.push(`warmup_quota_completion_rate ${system.quotaCompletionRate.toFixed(2)}`);

    lines.push(`# HELP warmup_system_health System health status (0=critical, 1=degraded, 2=healthy)`);
    lines.push(`# TYPE warmup_system_health gauge`);
    const healthValue = system.systemHealth === 'healthy' ? 2 : system.systemHealth === 'degraded' ? 1 : 0;
    lines.push(`warmup_system_health ${healthValue}`);

    // Quota status by mailbox
    lines.push(`# HELP warmup_mailbox_quota_fill Quota fill rate per mailbox (0-100)`);
    lines.push(`# TYPE warmup_mailbox_quota_fill gauge`);
    quotaStatuses.forEach(status => {
      lines.push(`warmup_mailbox_quota_fill{mailbox_id="${status.mailboxId}",email="${status.email}"} ${status.percentComplete.toFixed(2)}`);
    });

    return lines.join('\n');
  }

  /**
   * Clean up old metrics data
   */
  async cleanupOldMetrics(): Promise<void> {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - WarmupEngineConfig.METRICS_RETENTION_DAYS);

    await prisma.warmupLog.deleteMany({
      where: {
        date: { lt: retentionDate },
      },
    });

    console.log(`🧹 Cleaned up metrics older than ${WarmupEngineConfig.METRICS_RETENTION_DAYS} days`);
  }

  /**
   * Reset in-memory stats (called at start of new day)
   */
  resetDailyStats(): void {
    this.mailboxStats.clear();
    console.log('🔄 Daily stats reset');
  }

  /**
   * Get real-time status string for monitoring
   */
  async getStatusString(): Promise<string> {
    const system = await this.getSystemMetrics();
    const behindCount = (await this.getMailboxesBehindQuota()).length;

    const statusIcon = system.systemHealth === 'healthy' ? '✅' : 
                       system.systemHealth === 'degraded' ? '⚠️' : '🔴';

    return [
      `${statusIcon} System Health: ${system.systemHealth.toUpperCase()}`,
      `📊 Mailboxes: ${system.activeMailboxes}/${system.totalMailboxes} active`,
      `✉️  Today: ${system.totalSentToday} sent, ${system.totalFailedToday} failed`,
      `⚡ Throughput: ${system.throughputPerHour.toFixed(0)} emails/hour`,
      `📈 Quota: ${system.quotaCompletionRate.toFixed(1)}% complete`,
      behindCount > 0 ? `⚠️  ${behindCount} mailboxes behind quota` : '',
    ].filter(Boolean).join('\n');
  }
}
