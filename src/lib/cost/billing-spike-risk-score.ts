import type { BillingSpikeRiskTier } from "./billing-spike-contract";

export function clampBillingRisk(value: number) {
  return Math.max(0, Math.min(1_000_000_000, value));
}

export function computeFirestoreListenerRisk(input: {
  activeListeners: number;
  averageDocsPerSnapshot: number;
  reconnectRate: number;
  updateRate: number;
}) {
  return clampBillingRisk(
    input.activeListeners * input.averageDocsPerSnapshot * input.reconnectRate * input.updateRate,
  );
}

export function computeDebugLogRisk(input: {
  eventsPerMinute: number;
  avgLogBytes: number;
  dedupeMissRate: number;
}) {
  return clampBillingRisk(input.eventsPerMinute * input.avgLogBytes * input.dedupeMissRate);
}

export function computeAnalyticsIngestRisk(input: {
  sessionsPerMinute: number;
  eventsPerSession: number;
  writesPerEvent: number;
}) {
  return clampBillingRisk(input.sessionsPerMinute * input.eventsPerSession * input.writesPerEvent);
}

export function computeMediaEgressRisk(input: {
  viewsPerMinute: number;
  avgMediaBytes: number;
  uncachedRate: number;
}) {
  return clampBillingRisk(input.viewsPerMinute * input.avgMediaBytes * input.uncachedRate);
}

export function computeNotificationFanoutRisk(input: {
  recipients: number;
  writesPerRecipient: number;
  retryMultiplier: number;
}) {
  return clampBillingRisk(input.recipients * input.writesPerRecipient * input.retryMultiplier);
}

export function computeBuildDeployChurnRisk(input: {
  commitsPerDay: number;
  buildMinutesPerDeploy: number;
  deployTriggeredRate: number;
}) {
  return clampBillingRisk(input.commitsPerDay * input.buildMinutesPerDeploy * input.deployTriggeredRate);
}

export function computeMaterializerRisk(input: {
  usersScanned: number;
  docsReadPerUser: number;
  runsPerDay: number;
}) {
  return clampBillingRisk(input.usersScanned * input.docsReadPerUser * input.runsPerDay);
}

export function computeUploadRetryRisk(input: {
  filesPerBatch: number;
  avgFileBytes: number;
  retryCount: number;
}) {
  return clampBillingRisk(input.filesPerBatch * input.avgFileBytes * input.retryCount);
}

export function billingRiskTierFromScore(risk: number): BillingSpikeRiskTier {
  if (risk >= 500_000) return "critical";
  if (risk >= 100_000) return "high";
  if (risk >= 20_000) return "review";
  if (risk >= 5_000) return "watch";
  return "low";
}
