import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const LOST_DATA_RECOVERY_REPORT_KEY = "lost-data-recovery-dry-run" as const;
export const LOST_DATA_RECOVERY_REPORT_PATH = "agent/state/lost-data-recovery-dry-run.generated.json";
export const PHASE_ONE_REPORT_PATH = "agent/state/analytics-rewire-phase-one.generated.json" as const;
export const PHASE_TWO_REPORT_PATH = "agent/state/identity-privacy-raw-ledger-rewire.generated.json" as const;

export const REQUIRED_RECOVERY_LANE_KEYS = [
  "analytics_identity_links",
  "guest_tracking_indexes",
  "user_journey_indexes",
  "behavioral_timeline_facts",
  "analytics_watch_sessions",
  "notification_facts",
  "support_recovery_facts",
  "purchase_facts",
  "unlock_facts",
  "analytics_legacy_recovered_events",
  "analytics_pipeline_daily",
  "analytics_export_status",
  "analytics_guest_batches",
  "analytics_sessions",
  "analytics_event_facts",
] as const;

export type RecoveryLaneKey = typeof REQUIRED_RECOVERY_LANE_KEYS[number];
export type SourceType =
  | "raw_ledger"
  | "identity_graph"
  | "snapshot"
  | "legacy_recovered"
  | "vendor_evidence"
  | "debug_evidence"
  | "unknown";
export type ConsentRequirement =
  | "required_operational_only"
  | "eligible_if_minimized"
  | "consent_required"
  | "needs_review";
export type SurfaceTarget = "Admin Debug" | "Admin Analytics" | "archive_only" | "needs_review";
export type Confidence = "high" | "medium" | "low" | "unknown";
export type Severity = "P0" | "P1" | "P2" | "P3";
export type AllowedMode = "static_only" | "emulator_only" | "manual_approval_required";

export type RecoveryLane = {
  laneKey: string;
  title: string;
  sourcePath: string;
  sourceType: SourceType;
  identityKeys: string[];
  oldFields: string[];
  canonicalFields: string[];
  consentRequirement: ConsentRequirement;
  canSurfaceInAdminAnalytics: boolean;
  canSurfaceInAdminDebug: boolean;
  canBackfillLater: boolean;
  firstSurfaceTarget: SurfaceTarget;
  confidence: Confidence;
  recoveryValue: Confidence;
  costRisk: Confidence;
  recommendedAction: string;
  blockedBy: string[];
  validatorsNeeded: string[];
};

export type LegacyFieldMapping = {
  mappingKey: string;
  sourcePath: string;
  oldField: string;
  canonicalField: string;
  confidence: Confidence;
  mappingWarnings: string[];
  recommendedAction: string;
};

export type DryRunBackfillStep = {
  stepKey: string;
  title: string;
  purpose: string;
  sourcePaths: string[];
  targetPathOrSnapshot: string;
  allowedMode: AllowedMode;
  productionAllowedNow: false;
  costRisk: Confidence;
  requiredValidators: string[];
  rollbackNote: string;
};

export type RecoveryIssue = {
  issueKey: string;
  severity: Severity;
  title: string;
  description: string;
  files: string[];
  blocksRecovery: boolean;
  blocksPhaseOneFreeze: boolean;
  recommendedAction: string;
};

export type LostDataRecoveryDryRunReport = {
  generatedAtUtc: string;
  reportKey: typeof LOST_DATA_RECOVERY_REPORT_KEY;
  currentHead?: string;
  sourceReports: {
    phaseOneInventory: {
      path: typeof PHASE_ONE_REPORT_PATH;
      generatedAtUtc?: string;
      currentHead?: string;
      laneCount?: number;
      orphanCandidateCount?: number;
      duplicateAuthorityCount?: number;
    };
    phaseTwoIdentityPrivacy: {
      path: typeof PHASE_TWO_REPORT_PATH;
      generatedAtUtc?: string;
      currentHead?: string;
      identityLaneCount?: number;
      recoveryEligibilityRuleCount?: number;
    };
  };
  phasesCovered: string[];
  summary: {
    recoverableLaneCount: number;
    debugFirstCount: number;
    adminAnalyticsEligibleCount: number;
    backfillEligibleCount: number;
    consentReviewCount: number;
    highValueRecoveryCount: number;
    orphanCandidateCount: number;
    issueCount: number;
    p0Count: number;
    p1Count: number;
  };
  recoveryLanes: RecoveryLane[];
  legacyFieldMappings: LegacyFieldMapping[];
  dryRunBackfillPlan: DryRunBackfillStep[];
  issues: RecoveryIssue[];
};

type BuildOptions = {
  root?: string;
  now?: Date;
};

type PhaseOneReport = {
  generatedAtUtc?: string;
  currentHead?: string;
  summary?: {
    laneCount?: number;
    orphanCandidateCount?: number;
    duplicateAuthorityCount?: number;
  };
  orphanCandidates?: Array<{
    key?: string;
    writtenPath?: string;
    recoveryValue?: Confidence;
  }>;
};

type PhaseTwoReport = {
  generatedAtUtc?: string;
  currentHead?: string;
  sourceInventoryReport?: {
    currentHead?: string;
  };
  summary?: {
    identityLaneCount?: number;
    recoveryEligibilityRuleCount?: number;
  };
  recoveryEligibility?: Array<{
    laneKey?: string;
    sourcePath?: string;
    identityKeys?: string[];
    consentRequirement?: ConsentRequirement;
    canSurfaceInAdminAnalytics?: boolean;
    canSurfaceInAdminDebug?: boolean;
    canBackfillLater?: boolean;
    confidence?: Confidence;
    recommendedAction?: string;
  }>;
};

type RecoveryLaneSeed = Omit<RecoveryLane, "confidence" | "recoveryValue"> & {
  fallbackConfidence: Confidence;
  fallbackRecoveryValue: Confidence;
};

const RECOVERY_LANE_SEEDS: RecoveryLaneSeed[] = [
  {
    laneKey: "analytics_identity_links",
    title: "Analytics identity links",
    sourcePath: "analytics_identity_links",
    sourceType: "identity_graph",
    identityKeys: ["anonymousVisitorId", "sessionId", "userId"],
    oldFields: ["subject_*", "anon_*", "legacy anonymous/session ids"],
    canonicalFields: ["anonymousVisitorId", "sessionId", "userId", "identity_linked"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    firstSurfaceTarget: "Admin Debug",
    fallbackConfidence: "high",
    fallbackRecoveryValue: "high",
    costRisk: "low",
    recommendedAction: "Use Debug-first lineage evidence to recover guest-to-user continuity without rewriting old guest facts.",
    blockedBy: ["identity/consent proof before Admin Analytics surfacing"],
    validatorsNeeded: ["npm run check:identity-privacy-raw-ledger-rewire", "npm run check:guest-user-analytics"],
  },
  {
    laneKey: "guest_tracking_indexes",
    title: "Guest tracking indexes",
    sourcePath: "guest_tracking_indexes",
    sourceType: "identity_graph",
    identityKeys: ["anonymousVisitorId", "sessionId"],
    oldFields: ["legacy guest id", "legacy session key"],
    canonicalFields: ["anonymousVisitorId", "sessionId", "sourceConfidence"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    firstSurfaceTarget: "Admin Debug",
    fallbackConfidence: "high",
    fallbackRecoveryValue: "high",
    costRisk: "medium",
    recommendedAction: "Recover guest continuity as Debug evidence before promoting any journey totals.",
    blockedBy: ["guest sample evidence", "privacy minimization labels"],
    validatorsNeeded: ["npm run check:guest-user-analytics"],
  },
  {
    laneKey: "user_journey_indexes",
    title: "User journey indexes",
    sourcePath: "user_journey_indexes",
    sourceType: "identity_graph",
    identityKeys: ["userId", "anonymousVisitorId", "sessionId"],
    oldFields: ["legacy ordered route/event fields"],
    canonicalFields: ["userId", "anonymousVisitorId", "sessionId", "journeyStep", "sourceConfidence"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    firstSurfaceTarget: "Admin Debug",
    fallbackConfidence: "high",
    fallbackRecoveryValue: "high",
    costRisk: "medium",
    recommendedAction: "Keep journey recovery Debug-first until ordered journey snapshots prove the display model.",
    blockedBy: ["ordered journey snapshot contract", "identity link evidence"],
    validatorsNeeded: ["npm run check:identity-privacy-raw-ledger-rewire"],
  },
  {
    laneKey: "behavioral_timeline_facts",
    title: "Behavioral timeline facts",
    sourcePath: "behavioral_timeline_facts",
    sourceType: "raw_ledger",
    identityKeys: ["actorType", "anonymousVisitorId", "sessionId", "userId"],
    oldFields: ["legacy event params", "legacy actor fields"],
    canonicalFields: ["actorType", "occurredAt", "receivedAt", "source", "consentState", "sourceConfidence"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    firstSurfaceTarget: "Admin Debug",
    fallbackConfidence: "high",
    fallbackRecoveryValue: "high",
    costRisk: "medium",
    recommendedAction: "Treat as raw behavior spine; display only through indexes or snapshots with consent labels.",
    blockedBy: ["snapshot/index display model", "fake-zero protection"],
    validatorsNeeded: ["npm run check:analytics-event-contract", "npm run check:event-fact-truth"],
  },
  {
    laneKey: "analytics_watch_sessions",
    title: "Watch sessions",
    sourcePath: "analytics_watch_sessions / analytics_watch_assets",
    sourceType: "raw_ledger",
    identityKeys: ["sessionId", "anonymousVisitorId", "userId"],
    oldFields: ["legacy page duration", "legacy route duration", "legacy watch timestamps"],
    canonicalFields: ["watchSessionId", "assetId", "startedAt", "completedAt", "watchScoreSource"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: true,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    firstSurfaceTarget: "Admin Analytics",
    fallbackConfidence: "medium",
    fallbackRecoveryValue: "medium",
    costRisk: "medium",
    recommendedAction: "Surface through watch-session rollups/snapshots; legacy page duration remains fallback only.",
    blockedBy: ["watch-session rollup snapshot"],
    validatorsNeeded: ["npm run check:watch-time-rollup-truth"],
  },
  {
    laneKey: "notification_facts",
    title: "Notification facts",
    sourcePath: "notification records / user_notification_indexes",
    sourceType: "raw_ledger",
    identityKeys: ["userId", "sessionId", "notificationId"],
    oldFields: ["recipientId", "token/browser state", "push runtime logs"],
    canonicalFields: ["userId", "notificationId", "sentAt", "openedAt", "readAt", "deliveryStatus"],
    consentRequirement: "required_operational_only",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: false,
    firstSurfaceTarget: "Admin Debug",
    fallbackConfidence: "medium",
    fallbackRecoveryValue: "medium",
    costRisk: "medium",
    recommendedAction: "Use for delivery/support integrity first; avoid optional engagement profiling when privacy is off.",
    blockedBy: ["delivery/read source labels"],
    validatorsNeeded: ["npm run check:notification-pipeline"],
  },
  {
    laneKey: "support_recovery_facts",
    title: "Support and recovery facts",
    sourcePath: "support / platform_feedback / recovery records",
    sourceType: "debug_evidence",
    identityKeys: ["userId", "sessionId", "supportThreadId"],
    oldFields: ["legacy support thread ids", "feedback ids"],
    canonicalFields: ["userId", "supportThreadId", "recoveryReason", "sourceConfidence"],
    consentRequirement: "required_operational_only",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: false,
    firstSurfaceTarget: "Admin Debug",
    fallbackConfidence: "medium",
    fallbackRecoveryValue: "medium",
    costRisk: "low",
    recommendedAction: "Keep as support recovery evidence, not behavioral personalization.",
    blockedBy: ["support purpose label"],
    validatorsNeeded: ["npm run check:support-recovery-flows"],
  },
  {
    laneKey: "purchase_facts",
    title: "Purchase facts",
    sourcePath: "transactions / analytics_commerce_rollup",
    sourceType: "raw_ledger",
    identityKeys: ["userId", "transactionId", "orderId"],
    oldFields: ["payment/customer ids", "orderId", "capturedAt"],
    canonicalFields: ["userId", "transactionId", "completedAt", "amount", "sourceTruth"],
    consentRequirement: "required_operational_only",
    canSurfaceInAdminAnalytics: true,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    firstSurfaceTarget: "Admin Analytics",
    fallbackConfidence: "high",
    fallbackRecoveryValue: "high",
    costRisk: "low",
    recommendedAction: "Recover only from server/payment/transaction truth; vendor ecommerce remains evidence only.",
    blockedBy: ["server/payment truth proof"],
    validatorsNeeded: ["npm run check:purchase-telemetry-truth"],
  },
  {
    laneKey: "unlock_facts",
    title: "Unlock facts",
    sourcePath: "unlock / entitlement / GumDrop ledger facts",
    sourceType: "raw_ledger",
    identityKeys: ["userId", "dropId", "entitlementId"],
    oldFields: ["unlockId", "ledger entry", "unlockedAt"],
    canonicalFields: ["userId", "dropId", "entitlementId", "sourceTruth"],
    consentRequirement: "required_operational_only",
    canSurfaceInAdminAnalytics: true,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    firstSurfaceTarget: "Admin Analytics",
    fallbackConfidence: "high",
    fallbackRecoveryValue: "high",
    costRisk: "low",
    recommendedAction: "Recover only from entitlement/server facts; telemetry-only unlock events are not entitlement truth.",
    blockedBy: ["entitlement/server truth proof"],
    validatorsNeeded: ["npm run check:unlock-telemetry-truth"],
  },
  {
    laneKey: "analytics_legacy_recovered_events",
    title: "Legacy recovered events",
    sourcePath: "analytics_legacy_recovered_events",
    sourceType: "legacy_recovered",
    identityKeys: ["legacyId", "anonymousVisitorId", "sessionId", "userId"],
    oldFields: ["legacy_event_name", "legacy timestamp", "legacy actor/object params"],
    canonicalFields: ["eventName", "legacySource", "legacyConfidence", "mappingWarnings"],
    consentRequirement: "needs_review",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: false,
    firstSurfaceTarget: "Admin Debug",
    fallbackConfidence: "unknown",
    fallbackRecoveryValue: "high",
    costRisk: "unknown",
    recommendedAction: "Keep Debug-only until mapping confidence and consent review pass.",
    blockedBy: ["mapping confidence", "consent review", "manual backfill approval"],
    validatorsNeeded: ["npm run check:analytics-legacy-recovery"],
  },
  {
    laneKey: "analytics_pipeline_daily",
    title: "Analytics pipeline daily",
    sourcePath: "analytics_pipeline_daily",
    sourceType: "debug_evidence",
    identityKeys: ["date", "pipelineKey"],
    oldFields: ["legacy pipeline status"],
    canonicalFields: ["pipelineKey", "date", "status", "lastValidatedAt"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: false,
    firstSurfaceTarget: "Admin Debug",
    fallbackConfidence: "medium",
    fallbackRecoveryValue: "medium",
    costRisk: "low",
    recommendedAction: "Use as pipeline health evidence, not user behavior truth.",
    blockedBy: ["Debug source label"],
    validatorsNeeded: ["npm run check:debug-evidence-pipeline"],
  },
  {
    laneKey: "analytics_export_status",
    title: "Analytics export status",
    sourcePath: "analytics_export_status",
    sourceType: "vendor_evidence",
    identityKeys: ["exportKey", "date"],
    oldFields: ["legacy export status fields"],
    canonicalFields: ["exportKey", "date", "status", "sourceLabel"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: false,
    firstSurfaceTarget: "Admin Debug",
    fallbackConfidence: "medium",
    fallbackRecoveryValue: "medium",
    costRisk: "low",
    recommendedAction: "Use as BigQuery/export evidence only; never user behavior truth.",
    blockedBy: ["vendor evidence label"],
    validatorsNeeded: ["npm run check:analytics-import-export"],
  },
  {
    laneKey: "analytics_guest_batches",
    title: "Guest batches",
    sourcePath: "analytics_guest_batches",
    sourceType: "raw_ledger",
    identityKeys: ["anonymousVisitorId", "sessionId", "serverSessionKey"],
    oldFields: ["anon_*", "legacy guest batch id", "legacy session key"],
    canonicalFields: ["anonymousVisitorId", "sessionId", "batchId", "consentState"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    firstSurfaceTarget: "Admin Debug",
    fallbackConfidence: "medium",
    fallbackRecoveryValue: "high",
    costRisk: "medium",
    recommendedAction: "Keep raw source only; recover through guest snapshots/indexes with fake-zero protection.",
    blockedBy: ["guest snapshot", "sample evidence"],
    validatorsNeeded: ["npm run check:guest-user-analytics"],
  },
  {
    laneKey: "analytics_sessions",
    title: "Analytics sessions",
    sourcePath: "analytics_sessions",
    sourceType: "raw_ledger",
    identityKeys: ["sessionId", "anonymousVisitorId", "userId"],
    oldFields: ["kandy_session_id", "legacy session fact fields"],
    canonicalFields: ["sessionId", "anonymousVisitorId", "startedAt", "lastEventAt"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    firstSurfaceTarget: "Admin Debug",
    fallbackConfidence: "medium",
    fallbackRecoveryValue: "medium",
    costRisk: "medium",
    recommendedAction: "Use for session continuity only after the session definition is declared.",
    blockedBy: ["session definition", "snapshot display model"],
    validatorsNeeded: ["npm run check:identity-privacy-raw-ledger-rewire"],
  },
  {
    laneKey: "analytics_event_facts",
    title: "Analytics event facts",
    sourcePath: "analytics_event_facts",
    sourceType: "raw_ledger",
    identityKeys: ["actorType", "anonymousVisitorId", "sessionId", "userId", "creatorId", "adminId"],
    oldFields: ["legacy_event_name", "timestamp", "eventTimestamp", "createdAt"],
    canonicalFields: ["eventId", "eventName", "occurredAt", "receivedAt", "actorType", "consentState"],
    consentRequirement: "eligible_if_minimized",
    canSurfaceInAdminAnalytics: false,
    canSurfaceInAdminDebug: true,
    canBackfillLater: true,
    firstSurfaceTarget: "Admin Debug",
    fallbackConfidence: "high",
    fallbackRecoveryValue: "high",
    costRisk: "high",
    recommendedAction: "Keep raw source only; display through snapshots/indexes and source-labeled Debug evidence.",
    blockedBy: ["snapshot authority collapse", "raw admin display fallback removal"],
    validatorsNeeded: ["npm run check:analytics-event-contract", "npm run check:analytics-rewire-phase-one"],
  },
];

export const LEGACY_FIELD_MAPPINGS: LegacyFieldMapping[] = [
  {
    mappingKey: "legacy-page-duration",
    sourcePath: "page/session rollups",
    oldField: "pageDuration / routeDuration",
    canonicalField: "watchScoreSource = legacy_page_duration",
    confidence: "medium",
    mappingWarnings: ["Fallback only; not watch_session_rollup.", "Must not replace analytics_watch_sessions."],
    recommendedAction: "Use only when no watch-session rollup exists and label the source as legacy fallback.",
  },
  {
    mappingKey: "legacy-guest-session-ids",
    sourcePath: "analytics_guest_batches / analytics_sessions",
    oldField: "subject_* / anon_* / kandy_session_id",
    canonicalField: "anonymousVisitorId / sessionId",
    confidence: "medium",
    mappingWarnings: ["Pseudonymous identifier; consent-aware only.", "Do not rewrite old guest facts into user facts."],
    recommendedAction: "Map as identity evidence with mappingWarnings and original legacy fields retained.",
  },
  {
    mappingKey: "legacy-event-name",
    sourcePath: "analytics_event_facts",
    oldField: "legacy_event_name",
    canonicalField: "eventName with legacy_event_name metadata",
    confidence: "high",
    mappingWarnings: ["Only accepted when canonical catalog alias exists."],
    recommendedAction: "Store canonical eventName and retain the original legacy_event_name in metadata.",
  },
  {
    mappingKey: "ga-current-day",
    sourcePath: "GA4 / BigQuery intraday",
    oldField: "current-day provider metrics",
    canonicalField: "vendor_evidence / estimated",
    confidence: "medium",
    mappingWarnings: ["Not canonical product truth.", "Intraday/current-day exports are incomplete."],
    recommendedAction: "Use as Debug parity evidence only and label as estimated/intraday.",
  },
  {
    mappingKey: "realtime-summary-fallback",
    sourcePath: "analytics_aggregate_stats/realtime_summary",
    oldField: "legacy realtime summary fields",
    canonicalField: "analytics_admin_metric_snapshots fallback/evidence",
    confidence: "medium",
    mappingWarnings: ["Duplicate snapshot authority exists.", "Must not outrank analytics_admin_metric_snapshots."],
    recommendedAction: "Use as legacy/fallback/evidence unless the route explicitly owns the live-pulse bridge.",
  },
  {
    mappingKey: "legacy-timestamps",
    sourcePath: "legacy analytics sources",
    oldField: "timestamp / eventTimestamp / createdAt / updatedAt",
    canonicalField: "occurredAt / receivedAt",
    confidence: "medium",
    mappingWarnings: ["Timestamp meaning must be source-specific.", "Missing timestamp lowers mapping confidence."],
    recommendedAction: "Prefer occurredAt when available; otherwise mark the recovered candidate with mappingWarnings.",
  },
];

export const DRY_RUN_BACKFILL_PLAN: DryRunBackfillStep[] = [
  {
    stepKey: "stage-a-static-inventory",
    title: "Stage A: static inventory of recoverable lanes",
    purpose: "Keep recovery planning local and source-based before any data access.",
    sourcePaths: ["agent/state/analytics-rewire-phase-one.generated.json", "agent/state/identity-privacy-raw-ledger-rewire.generated.json"],
    targetPathOrSnapshot: "agent/state/lost-data-recovery-dry-run.generated.json",
    allowedMode: "static_only",
    productionAllowedNow: false,
    costRisk: "low",
    requiredValidators: ["npm run check:lost-data-recovery-dry-run"],
    rollbackNote: "Remove the generated dry-run report and validator if the inventory contract is wrong.",
  },
  {
    stepKey: "stage-b-emulator-mapper-validation",
    title: "Stage B: emulator-only mapper validation",
    purpose: "Validate legacy mappers with fixture or emulator data before any production source is touched.",
    sourcePaths: ["legacy fixture samples", "emulator-only exports"],
    targetPathOrSnapshot: "emulator analytics_legacy_recovered_events candidates",
    allowedMode: "emulator_only",
    productionAllowedNow: false,
    costRisk: "low",
    requiredValidators: ["npm run check:analytics-legacy-recovery"],
    rollbackNote: "Drop emulator outputs; no production records should exist.",
  },
  {
    stepKey: "stage-c-dry-run-recovery-snapshot",
    title: "Stage C: dry-run recovery snapshot generation",
    purpose: "Produce candidate recovery snapshots with source labels, consent requirements, and confidence metadata.",
    sourcePaths: ["analytics_identity_links", "guest_tracking_indexes", "behavioral_timeline_facts", "analytics_watch_sessions"],
    targetPathOrSnapshot: "dry-run recovery snapshot artifact",
    allowedMode: "manual_approval_required",
    productionAllowedNow: false,
    costRisk: "medium",
    requiredValidators: ["npm run check:identity-privacy-raw-ledger-rewire", "npm run check:lost-data-recovery-dry-run"],
    rollbackNote: "Discard dry-run snapshots and keep raw sources unchanged.",
  },
  {
    stepKey: "stage-d-admin-debug-surfacing",
    title: "Stage D: Admin Debug surfacing",
    purpose: "Surface recovery source, confidence, blockers, and mapping warnings in Debug before Analytics.",
    sourcePaths: ["dry-run recovery snapshot artifact"],
    targetPathOrSnapshot: "Admin Debug recovery evidence panel",
    allowedMode: "manual_approval_required",
    productionAllowedNow: false,
    costRisk: "low",
    requiredValidators: ["npm run check:debug-evidence-pipeline"],
    rollbackNote: "Hide the Debug recovery panel and keep dry-run evidence available for review.",
  },
  {
    stepKey: "stage-e-admin-analytics-surfacing",
    title: "Stage E: Admin Analytics surfacing after Debug confidence",
    purpose: "Promote only eligible lanes into compact Admin Analytics snapshots after Debug confidence proves source truth.",
    sourcePaths: ["Admin Debug reviewed recovery evidence", "analytics_admin_metric_snapshots"],
    targetPathOrSnapshot: "analytics_admin_metric_snapshots",
    allowedMode: "manual_approval_required",
    productionAllowedNow: false,
    costRisk: "medium",
    requiredValidators: ["npm run check:admin-analytics-hot-cache", "npm run check:admin-analytics-no-pure-realtime"],
    rollbackNote: "Demote recovered values back to Debug-only and preserve verified snapshots.",
  },
  {
    stepKey: "stage-f-production-backfill-approval",
    title: "Stage F: production backfill only after manual approval",
    purpose: "Allow a future reviewed production write plan only after dry-run, Debug, privacy, and validator evidence pass.",
    sourcePaths: ["approved source-specific production paths"],
    targetPathOrSnapshot: "versioned recovery collection or approved snapshot path",
    allowedMode: "manual_approval_required",
    productionAllowedNow: false,
    costRisk: "high",
    requiredValidators: ["npm run check:lost-data-recovery-dry-run", "npm run check:analytics-legacy-recovery", "npm run typecheck"],
    rollbackNote: "Stop the backfill, retain original source records, and remove only versioned recovery outputs from the approved target.",
  },
];

function readJson<T>(root: string, repoPath: string): T | null {
  const fullPath = path.join(root, repoPath);
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as T;
  } catch {
    return null;
  }
}

function currentHead(root: string) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

function getPhaseOneSummary(phaseOne: PhaseOneReport | null) {
  return {
    path: PHASE_ONE_REPORT_PATH,
    generatedAtUtc: phaseOne?.generatedAtUtc,
    currentHead: phaseOne?.currentHead,
    laneCount: phaseOne?.summary?.laneCount,
    orphanCandidateCount: phaseOne?.summary?.orphanCandidateCount,
    duplicateAuthorityCount: phaseOne?.summary?.duplicateAuthorityCount,
  };
}

function getPhaseTwoSummary(phaseTwo: PhaseTwoReport | null) {
  return {
    path: PHASE_TWO_REPORT_PATH,
    generatedAtUtc: phaseTwo?.generatedAtUtc,
    currentHead: phaseTwo?.currentHead,
    identityLaneCount: phaseTwo?.summary?.identityLaneCount,
    recoveryEligibilityRuleCount: phaseTwo?.summary?.recoveryEligibilityRuleCount,
  };
}

function findOrphanRecoveryValue(phaseOne: PhaseOneReport | null, laneKey: string) {
  return phaseOne?.orphanCandidates?.find((candidate) => candidate.key === laneKey || candidate.writtenPath === laneKey)?.recoveryValue;
}

function findEligibility(phaseTwo: PhaseTwoReport | null, laneKey: string) {
  return phaseTwo?.recoveryEligibility?.find((item) => item.laneKey === laneKey || item.sourcePath === laneKey);
}

function buildRecoveryLanes(phaseOne: PhaseOneReport | null, phaseTwo: PhaseTwoReport | null): RecoveryLane[] {
  return RECOVERY_LANE_SEEDS.map((seed) => {
    const eligibility = findEligibility(phaseTwo, seed.laneKey);
    const recoveryValue = findOrphanRecoveryValue(phaseOne, seed.laneKey) ?? seed.fallbackRecoveryValue;
    return {
      ...seed,
      identityKeys: eligibility?.identityKeys && eligibility.identityKeys.length > 0 ? eligibility.identityKeys : seed.identityKeys,
      consentRequirement: eligibility?.consentRequirement ?? seed.consentRequirement,
      canSurfaceInAdminAnalytics: eligibility?.canSurfaceInAdminAnalytics ?? seed.canSurfaceInAdminAnalytics,
      canSurfaceInAdminDebug: eligibility?.canSurfaceInAdminDebug ?? seed.canSurfaceInAdminDebug,
      canBackfillLater: eligibility?.canBackfillLater ?? seed.canBackfillLater,
      confidence: eligibility?.confidence ?? seed.fallbackConfidence,
      recoveryValue,
    };
  });
}

function buildIssues(root: string, phaseOne: PhaseOneReport | null, phaseTwo: PhaseTwoReport | null): RecoveryIssue[] {
  const head = currentHead(root);
  const issues: RecoveryIssue[] = [
    {
      issueKey: "production-backfill-disabled",
      severity: "P2",
      title: "Production recovery backfill remains disabled",
      description: "This phase builds dry-run recovery planning only. No production read, write, migration, or deletion is approved.",
      files: ["docs/agent-truth/lost-data-recovery-dry-run.md", LOST_DATA_RECOVERY_REPORT_PATH],
      blocksRecovery: false,
      blocksPhaseOneFreeze: false,
      recommendedAction: "Run static and emulator-only stages before requesting manual production approval.",
    },
    {
      issueKey: "debug-first-recovery-required",
      severity: "P2",
      title: "High-value recovered data must surface in Debug before Admin Analytics",
      description: "Guest continuity, journey, legacy, and raw ledger recovery require Debug source/confidence evidence before compact operator metrics.",
      files: ["docs/agent-truth/lost-data-recovery-dry-run.md"],
      blocksRecovery: false,
      blocksPhaseOneFreeze: false,
      recommendedAction: "Build Admin Debug recovery evidence before any Admin Analytics surfacing.",
    },
  ];

  if (head && phaseOne?.currentHead && phaseOne.currentHead !== head) {
    issues.push({
      issueKey: "phase-one-report-head-mismatch",
      severity: "P1",
      title: "Phase One inventory report is not current with HEAD",
      description: `Phase One currentHead=${phaseOne.currentHead}; current HEAD=${head}.`,
      files: [PHASE_ONE_REPORT_PATH],
      blocksRecovery: true,
      blocksPhaseOneFreeze: false,
      recommendedAction: "Rerun npm run check:analytics-rewire-phase-one before recovery planning.",
    });
  }

  if (head && phaseTwo?.currentHead && phaseTwo.currentHead !== head) {
    issues.push({
      issueKey: "phase-two-report-head-mismatch",
      severity: "P1",
      title: "Phase Two identity/privacy report is not current with HEAD",
      description: `Phase Two currentHead=${phaseTwo.currentHead}; current HEAD=${head}.`,
      files: [PHASE_TWO_REPORT_PATH],
      blocksRecovery: true,
      blocksPhaseOneFreeze: false,
      recommendedAction: "Rerun npm run check:identity-privacy-raw-ledger-rewire before recovery planning.",
    });
  }

  if (phaseTwo?.sourceInventoryReport?.currentHead && phaseOne?.currentHead && phaseTwo.sourceInventoryReport.currentHead !== phaseOne.currentHead) {
    issues.push({
      issueKey: "phase-two-source-inventory-mismatch",
      severity: "P1",
      title: "Phase Two report references an older Phase One inventory",
      description: "Phase Two sourceInventoryReport must point at the same Phase One currentHead used for this dry-run plan.",
      files: [PHASE_ONE_REPORT_PATH, PHASE_TWO_REPORT_PATH],
      blocksRecovery: true,
      blocksPhaseOneFreeze: false,
      recommendedAction: "Rerun Phase One, then Phase Two, then this dry-run validator in sequence.",
    });
  }

  return issues;
}

function count<T>(values: T[], predicate: (value: T) => boolean) {
  return values.filter(predicate).length;
}

export function buildLostDataRecoveryDryRunReport(options: BuildOptions = {}): LostDataRecoveryDryRunReport {
  const root = options.root ?? process.cwd();
  const now = options.now ?? new Date();
  const phaseOne = readJson<PhaseOneReport>(root, PHASE_ONE_REPORT_PATH);
  const phaseTwo = readJson<PhaseTwoReport>(root, PHASE_TWO_REPORT_PATH);
  const recoveryLanes = buildRecoveryLanes(phaseOne, phaseTwo);
  const issues = buildIssues(root, phaseOne, phaseTwo);

  return {
    generatedAtUtc: now.toISOString(),
    reportKey: LOST_DATA_RECOVERY_REPORT_KEY,
    currentHead: currentHead(root),
    sourceReports: {
      phaseOneInventory: getPhaseOneSummary(phaseOne),
      phaseTwoIdentityPrivacy: getPhaseTwoSummary(phaseTwo),
    },
    phasesCovered: [
      "6. Legacy Recovery Mapper",
      "14. Data Retention, Archive, And Cleanup Policy Planning",
      "17. Recovery Surfacing Planning",
    ],
    summary: {
      recoverableLaneCount: recoveryLanes.length,
      debugFirstCount: count(recoveryLanes, (lane) => lane.firstSurfaceTarget === "Admin Debug"),
      adminAnalyticsEligibleCount: count(recoveryLanes, (lane) => lane.canSurfaceInAdminAnalytics),
      backfillEligibleCount: count(recoveryLanes, (lane) => lane.canBackfillLater),
      consentReviewCount: count(recoveryLanes, (lane) => lane.consentRequirement === "needs_review" || lane.consentRequirement === "consent_required"),
      highValueRecoveryCount: count(recoveryLanes, (lane) => lane.recoveryValue === "high"),
      orphanCandidateCount: phaseOne?.summary?.orphanCandidateCount ?? 0,
      issueCount: issues.length,
      p0Count: count(issues, (issue) => issue.severity === "P0"),
      p1Count: count(issues, (issue) => issue.severity === "P1"),
    },
    recoveryLanes,
    legacyFieldMappings: LEGACY_FIELD_MAPPINGS,
    dryRunBackfillPlan: DRY_RUN_BACKFILL_PLAN,
    issues,
  };
}

export function validateLostDataRecoveryDryRunReport(report: LostDataRecoveryDryRunReport) {
  const failures: string[] = [];
  if (report.reportKey !== LOST_DATA_RECOVERY_REPORT_KEY) failures.push("reportKey is incorrect.");
  if (!report.generatedAtUtc || Number.isNaN(Date.parse(report.generatedAtUtc))) failures.push("generatedAtUtc must be parseable.");
  if (!report.sourceReports?.phaseOneInventory || report.sourceReports.phaseOneInventory.path !== PHASE_ONE_REPORT_PATH) failures.push("phaseOneInventory source report is missing.");
  if (!report.sourceReports?.phaseTwoIdentityPrivacy || report.sourceReports.phaseTwoIdentityPrivacy.path !== PHASE_TWO_REPORT_PATH) failures.push("phaseTwoIdentityPrivacy source report is missing.");
  if (!Array.isArray(report.phasesCovered) || report.phasesCovered.length < 3) failures.push("phasesCovered is incomplete.");

  const laneKeys = new Set(report.recoveryLanes?.map((lane) => lane.laneKey));
  for (const laneKey of REQUIRED_RECOVERY_LANE_KEYS) {
    if (!laneKeys.has(laneKey)) failures.push(`missing required recovery lane: ${laneKey}`);
  }

  for (const lane of report.recoveryLanes ?? []) {
    if (!lane.consentRequirement) failures.push(`${lane.laneKey} missing consentRequirement.`);
    if (typeof lane.canSurfaceInAdminDebug !== "boolean") failures.push(`${lane.laneKey} missing canSurfaceInAdminDebug.`);
    if (typeof lane.canSurfaceInAdminAnalytics !== "boolean") failures.push(`${lane.laneKey} missing canSurfaceInAdminAnalytics.`);
    if (typeof lane.canBackfillLater !== "boolean") failures.push(`${lane.laneKey} missing canBackfillLater.`);
    if (!Array.isArray(lane.validatorsNeeded) || lane.validatorsNeeded.length === 0) failures.push(`${lane.laneKey} missing validatorsNeeded.`);
  }

  const legacyLane = report.recoveryLanes.find((lane) => lane.laneKey === "analytics_legacy_recovered_events");
  if (!legacyLane || legacyLane.firstSurfaceTarget !== "Admin Debug" || legacyLane.consentRequirement !== "needs_review" || legacyLane.canSurfaceInAdminAnalytics) {
    failures.push("legacy recovered events must be Debug-only/needs_review by default.");
  }

  for (const laneKey of ["purchase_facts", "unlock_facts"]) {
    const lane = report.recoveryLanes.find((entry) => entry.laneKey === laneKey);
    if (!lane || lane.consentRequirement !== "required_operational_only" || !lane.canSurfaceInAdminAnalytics) {
      failures.push(`${laneKey} must be required_operational_only and Admin Analytics eligible.`);
    }
  }

  const vendorLane = report.recoveryLanes.find((lane) => lane.laneKey === "analytics_export_status");
  if (!vendorLane || vendorLane.sourceType !== "vendor_evidence" || vendorLane.canSurfaceInAdminAnalytics) {
    failures.push("vendor evidence must not become canonical Admin Analytics product truth.");
  }

  const requiredStages = [
    "stage-a-static-inventory",
    "stage-b-emulator-mapper-validation",
    "stage-c-dry-run-recovery-snapshot",
    "stage-d-admin-debug-surfacing",
    "stage-e-admin-analytics-surfacing",
    "stage-f-production-backfill-approval",
  ];
  const stageKeys = new Set(report.dryRunBackfillPlan?.map((step) => step.stepKey));
  for (const stage of requiredStages) {
    if (!stageKeys.has(stage)) failures.push(`missing dry-run stage: ${stage}`);
  }
  for (const step of report.dryRunBackfillPlan ?? []) {
    if (step.productionAllowedNow !== false) failures.push(`${step.stepKey} must set productionAllowedNow=false.`);
  }

  if (!report.legacyFieldMappings?.some((mapping) => mapping.mappingKey === "legacy-page-duration")) failures.push("legacy page duration mapping is missing.");
  if (!report.legacyFieldMappings?.some((mapping) => mapping.mappingKey === "legacy-guest-session-ids")) failures.push("legacy guest/session id mapping is missing.");
  if (!report.legacyFieldMappings?.some((mapping) => mapping.mappingKey === "ga-current-day")) failures.push("vendor evidence mapping is missing.");

  if (report.summary.recoverableLaneCount !== report.recoveryLanes.length) failures.push("summary.recoverableLaneCount mismatch.");
  if (report.summary.issueCount !== report.issues.length) failures.push("summary.issueCount mismatch.");
  return failures;
}

export function writeLostDataRecoveryDryRunReport(report: LostDataRecoveryDryRunReport, root = process.cwd()) {
  const absolutePath = path.join(root, LOST_DATA_RECOVERY_REPORT_PATH);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
