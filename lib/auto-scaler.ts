/**
 * Auto-Scaler Service
 * Automatically scales workers based on mailbox count and demand
 * 
 * Features:
 * - Monitors mailbox count in real-time
 * - Calculates optimal worker count
 * - Scales up when approaching capacity
 * - Scales down when under-utilized
 * - Cool-down periods to prevent flapping
 * - Integration with Docker Compose and Kubernetes
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import prisma from './prisma';
import { AutoScalerConfig, ScalingDecision } from './auto-scaler-config';

const execAsync = promisify(exec);

export class AutoScaler {
  private lastScaleUpTime = 0;
  private lastScaleDownTime = 0;
  private currentWorkerCount = 1;

  /**
   * Main scaling check - should be called periodically
   */
  async checkAndScale(): Promise<ScalingDecision> {
    console.log('[Auto-Scaler] Checking scaling requirements...');

    // Get current mailbox count
    const mailboxCount = await this.getMailboxCount();
    console.log(`[Auto-Scaler] Current mailboxes: ${mailboxCount}`);

    // Get current worker count
    const currentWorkers = await this.getCurrentWorkerCount();
    console.log(`[Auto-Scaler] Current workers: ${currentWorkers}`);

    // Calculate optimal worker count
    const optimalWorkers = this.calculateOptimalWorkers(mailboxCount);
    console.log(`[Auto-Scaler] Optimal workers: ${optimalWorkers}`);

    // Calculate current utilization
    const capacity = currentWorkers * AutoScalerConfig.MAILBOXES_PER_WORKER;
    const utilizationPercent = (mailboxCount / capacity) * 100;
    console.log(`[Auto-Scaler] Utilization: ${utilizationPercent.toFixed(1)}%`);

    // Determine scaling action
    const decision = this.makeScalingDecision(
      mailboxCount,
      currentWorkers,
      optimalWorkers,
      utilizationPercent
    );

    // Execute scaling if needed
    if (decision.action !== 'no-change') {
      await this.executeScaling(decision);
    }

    return decision;
  }

  /**
   * Get total mailbox count from database
   */
  private async getMailboxCount(): Promise<number> {
    const count = await prisma.account.count({
      where: {
        warmupEnabled: true,
      },
    });
    return count;
  }

  /**
   * Get current number of running workers
   */
  private async getCurrentWorkerCount(): Promise<number> {
    try {
      if (AutoScalerConfig.PLATFORM === 'docker') {
        return await this.getDockerWorkerCount();
      } else if (AutoScalerConfig.PLATFORM === 'kubernetes') {
        return await this.getKubernetesWorkerCount();
      } else {
        // Manual mode - read from environment or default to 1
        return parseInt(process.env.WARMUP_WORKER_COUNT || '1', 10);
      }
    } catch (error) {
      console.error('[Auto-Scaler] Error getting worker count:', error);
      return this.currentWorkerCount; // Fallback to cached value
    }
  }

  /**
   * Get worker count from Docker Compose
   */
  private async getDockerWorkerCount(): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `docker-compose -f ${AutoScalerConfig.DOCKER_COMPOSE_FILE} ps -q ${AutoScalerConfig.DOCKER_SERVICE_NAME} | wc -l`
      );
      const count = parseInt(stdout.trim(), 10);
      this.currentWorkerCount = count || 1;
      return this.currentWorkerCount;
    } catch (error) {
      console.error('[Auto-Scaler] Docker worker count failed:', error);
      return 1;
    }
  }

  /**
   * Get worker count from Kubernetes
   */
  private async getKubernetesWorkerCount(): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `kubectl get deployment ${AutoScalerConfig.K8S_DEPLOYMENT_NAME} -n ${AutoScalerConfig.K8S_NAMESPACE} -o jsonpath='{.spec.replicas}'`
      );
      const count = parseInt(stdout.trim(), 10);
      this.currentWorkerCount = count || 1;
      return this.currentWorkerCount;
    } catch (error) {
      console.error('[Auto-Scaler] Kubernetes worker count failed:', error);
      return 1;
    }
  }

  /**
   * Calculate optimal number of workers based on mailbox count
   */
  private calculateOptimalWorkers(mailboxCount: number): number {
    const calculated = Math.ceil(mailboxCount / AutoScalerConfig.MAILBOXES_PER_WORKER);
    
    // Clamp to min/max limits
    return Math.max(
      AutoScalerConfig.MIN_WORKERS,
      Math.min(AutoScalerConfig.MAX_WORKERS, calculated)
    );
  }

  /**
   * Make scaling decision based on current state
   */
  private makeScalingDecision(
    mailboxCount: number,
    currentWorkers: number,
    optimalWorkers: number,
    utilizationPercent: number
  ): ScalingDecision {
    const now = Date.now();

    // Check if we need to scale up
    if (utilizationPercent >= AutoScalerConfig.SCALE_UP_THRESHOLD * 100) {
      // Check cooldown
      if (now - this.lastScaleUpTime < AutoScalerConfig.SCALE_UP_COOLDOWN_MS) {
        return {
          action: 'no-change',
          currentWorkers,
          targetWorkers: currentWorkers,
          reason: 'Scale-up needed but in cooldown period',
          mailboxCount,
          utilizationPercent,
        };
      }

      const targetWorkers = Math.min(
        currentWorkers + 1, // Scale up by 1 at a time
        optimalWorkers,
        AutoScalerConfig.MAX_WORKERS
      );

      if (targetWorkers > currentWorkers) {
        return {
          action: 'scale-up',
          currentWorkers,
          targetWorkers,
          reason: `High utilization (${utilizationPercent.toFixed(1)}%) - adding worker`,
          mailboxCount,
          utilizationPercent,
        };
      }
    }

    // Check if we can scale down
    if (utilizationPercent <= AutoScalerConfig.SCALE_DOWN_THRESHOLD * 100) {
      // Check cooldown
      if (now - this.lastScaleDownTime < AutoScalerConfig.SCALE_DOWN_COOLDOWN_MS) {
        return {
          action: 'no-change',
          currentWorkers,
          targetWorkers: currentWorkers,
          reason: 'Scale-down possible but in cooldown period',
          mailboxCount,
          utilizationPercent,
        };
      }

      const targetWorkers = Math.max(
        currentWorkers - 1, // Scale down by 1 at a time
        optimalWorkers,
        AutoScalerConfig.MIN_WORKERS
      );

      if (targetWorkers < currentWorkers) {
        return {
          action: 'scale-down',
          currentWorkers,
          targetWorkers,
          reason: `Low utilization (${utilizationPercent.toFixed(1)}%) - removing worker`,
          mailboxCount,
          utilizationPercent,
        };
      }
    }

    // No scaling needed
    return {
      action: 'no-change',
      currentWorkers,
      targetWorkers: currentWorkers,
      reason: `Utilization optimal (${utilizationPercent.toFixed(1)}%)`,
      mailboxCount,
      utilizationPercent,
    };
  }

  /**
   * Execute the scaling action
   */
  private async executeScaling(decision: ScalingDecision): Promise<void> {
    console.log(`[Auto-Scaler] Executing: ${decision.action}`);
    console.log(`[Auto-Scaler] Reason: ${decision.reason}`);
    console.log(`[Auto-Scaler] Workers: ${decision.currentWorkers} → ${decision.targetWorkers}`);

    try {
      if (AutoScalerConfig.PLATFORM === 'docker') {
        await this.scaleDockerWorkers(decision.targetWorkers);
      } else if (AutoScalerConfig.PLATFORM === 'kubernetes') {
        await this.scaleKubernetesWorkers(decision.targetWorkers);
      } else {
        console.log('[Auto-Scaler] Manual mode - scale workers manually');
        console.log(`[Auto-Scaler] Set WARMUP_WORKER_COUNT=${decision.targetWorkers}`);
      }

      // Update cooldown timers
      if (decision.action === 'scale-up') {
        this.lastScaleUpTime = Date.now();
      } else if (decision.action === 'scale-down') {
        this.lastScaleDownTime = Date.now();
      }

      // Update cached worker count
      this.currentWorkerCount = decision.targetWorkers;

      console.log(`[Auto-Scaler] ✅ Scaling complete!`);
    } catch (error) {
      console.error('[Auto-Scaler] ❌ Scaling failed:', error);
      throw error;
    }
  }

  /**
   * Scale Docker Compose workers
   */
  private async scaleDockerWorkers(targetCount: number): Promise<void> {
    const command = `docker-compose -f ${AutoScalerConfig.DOCKER_COMPOSE_FILE} up -d --scale ${AutoScalerConfig.DOCKER_SERVICE_NAME}=${targetCount}`;
    console.log(`[Auto-Scaler] Running: ${command}`);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('Creating') && !stderr.includes('Starting')) {
      console.error('[Auto-Scaler] Docker scaling error:', stderr);
    }
    if (stdout) {
      console.log('[Auto-Scaler] Docker output:', stdout.trim());
    }
  }

  /**
   * Scale Kubernetes deployment
   */
  private async scaleKubernetesWorkers(targetCount: number): Promise<void> {
    const command = `kubectl scale deployment ${AutoScalerConfig.K8S_DEPLOYMENT_NAME} --replicas=${targetCount} -n ${AutoScalerConfig.K8S_NAMESPACE}`;
    console.log(`[Auto-Scaler] Running: ${command}`);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error('[Auto-Scaler] Kubernetes scaling error:', stderr);
    }
    if (stdout) {
      console.log('[Auto-Scaler] Kubernetes output:', stdout.trim());
    }
  }

  /**
   * Get scaling status for monitoring
   */
  async getStatus(): Promise<{
    enabled: boolean;
    currentWorkers: number;
    mailboxCount: number;
    utilizationPercent: number;
    optimalWorkers: number;
    canScaleUp: boolean;
    canScaleDown: boolean;
  }> {
    const mailboxCount = await this.getMailboxCount();
    const currentWorkers = await this.getCurrentWorkerCount();
    const optimalWorkers = this.calculateOptimalWorkers(mailboxCount);
    const capacity = currentWorkers * AutoScalerConfig.MAILBOXES_PER_WORKER;
    const utilizationPercent = (mailboxCount / capacity) * 100;

    return {
      enabled: AutoScalerConfig.ENABLED,
      currentWorkers,
      mailboxCount,
      utilizationPercent,
      optimalWorkers,
      canScaleUp: currentWorkers < AutoScalerConfig.MAX_WORKERS,
      canScaleDown: currentWorkers > AutoScalerConfig.MIN_WORKERS,
    };
  }
}

// Export singleton instance
export const autoScaler = new AutoScaler();
