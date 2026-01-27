/**
 * Auto-Scaler Configuration
 * Automatic worker scaling based on mailbox count and demand
 */

export const AutoScalerConfig = {
  // Enable/disable auto-scaling
  ENABLED: process.env.AUTO_SCALER_ENABLED === 'true',

  // How often to check if scaling is needed (milliseconds)
  CHECK_INTERVAL_MS: parseInt(process.env.AUTO_SCALER_CHECK_INTERVAL_MS || '300000', 10), // 5 minutes

  // Mailbox count thresholds for scaling
  MAILBOXES_PER_WORKER: parseInt(process.env.AUTO_SCALER_MAILBOXES_PER_WORKER || '1000', 10),
  
  // Minimum and maximum workers
  MIN_WORKERS: parseInt(process.env.AUTO_SCALER_MIN_WORKERS || '1', 10),
  MAX_WORKERS: parseInt(process.env.AUTO_SCALER_MAX_WORKERS || '100', 10),

  // Scaling behavior
  SCALE_UP_THRESHOLD: parseFloat(process.env.AUTO_SCALER_SCALE_UP_THRESHOLD || '0.8'), // Scale up at 80% capacity
  SCALE_DOWN_THRESHOLD: parseFloat(process.env.AUTO_SCALER_SCALE_DOWN_THRESHOLD || '0.3'), // Scale down at 30% capacity
  
  // Cool-down periods (prevent rapid scaling)
  SCALE_UP_COOLDOWN_MS: parseInt(process.env.AUTO_SCALER_SCALE_UP_COOLDOWN_MS || '300000', 10), // 5 min
  SCALE_DOWN_COOLDOWN_MS: parseInt(process.env.AUTO_SCALER_SCALE_DOWN_COOLDOWN_MS || '600000', 10), // 10 min

  // Orchestration platform
  PLATFORM: (process.env.AUTO_SCALER_PLATFORM || 'docker') as 'docker' | 'kubernetes' | 'manual',

  // Docker-specific settings
  DOCKER_COMPOSE_FILE: process.env.AUTO_SCALER_DOCKER_COMPOSE_FILE || 'docker-compose.production.yml',
  DOCKER_SERVICE_NAME: process.env.AUTO_SCALER_DOCKER_SERVICE_NAME || 'warmup-worker',

  // Kubernetes-specific settings
  K8S_NAMESPACE: process.env.AUTO_SCALER_K8S_NAMESPACE || 'default',
  K8S_DEPLOYMENT_NAME: process.env.AUTO_SCALER_K8S_DEPLOYMENT_NAME || 'warmup-workers',
};

export interface ScalingDecision {
  action: 'scale-up' | 'scale-down' | 'no-change';
  currentWorkers: number;
  targetWorkers: number;
  reason: string;
  mailboxCount: number;
  utilizationPercent: number;
}
