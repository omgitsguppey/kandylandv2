import type { BehavioralEventFact } from "@/lib/behavioral/event-fact-contract";
import type { UserJourneyEvent } from "@/lib/behavioral/user-journey-contract";

export const SQL_DATABASE_PARITY_CONTRACT_VERSION = "2026.05.sql-database-parity.1";

export type SqlDatabaseParityStatus =
  | "matched"
  | "mismatch_recorded"
  | "source_missing"
  | "cost_blocked"
  | "external_review_required";

export type SqlDatabaseCostLaneStatus =
  | "hot_path_essential_summary"
  | "batched_watermark_export"
  | "summary_first_admin_read"
  | "paged_drilldown"
  | "blocked_casual_cloud_sql_mirror"
  | "external_review_required";

export type SqlDatabaseParityObjectKind =
  | "rawEventFact"
  | "normalizedEventFact"
  | "globalSummary"
  | "userSummary"
  | "personMetric"
  | "sessionSummary"
  | "journeySummary"
  | "exportRow";

export interface SqlDatabaseExportRow {
  exportRowKind: "event_fact";
  rawEventFactId: string;
  normalizedEventName: string;
  timestampMs: number;
  warehousePartition: string;
  actorUserId: string | null;
  userId: string | null;
  sessionId: string | null;
  linkedPersonId: string | null;
  route: string;
  surface: string;
  featureId: string;
  globalDedupeKey: string;
  userDedupeKey: string;
  sqlDedupeKey: string;
  replayProtection: string;
  primaryProductTruth: false;
  sourceTruth: string;
  parityStatus: SqlDatabaseParityStatus;
}

export interface SqlDatabaseSummary {
  summaryKind: "globalSummary" | "userSummary" | "personMetric" | "sessionSummary" | "journeySummary";
  summaryKey: string;
  eventName: string;
  countDelta: number;
  dedupeKey: string;
  linkedPersonId: string | null;
  userId: string | null;
  sessionId: string | null;
  sourceEventFactId: string;
  sourceTruth: "normalized_event_fact";
  parityStatus: SqlDatabaseParityStatus;
}

export interface SqlDatabaseJourneyExport {
  exportRowKind: "journey_summary";
  journeyEventId: string;
  sourceEventFactId: string;
  journeySummary: SqlDatabaseSummary;
  warehousePartition: string;
  primaryProductTruth: false;
  privacyClass: UserJourneyEvent["privacyClass"];
}

export interface SqlDatabaseParityMismatch {
  objectKind: SqlDatabaseParityObjectKind;
  status: SqlDatabaseParityStatus;
  reason: string;
  nextAction: string;
}

export interface SqlDatabaseParityDebugLane {
  label: "SQL/database parity";
  parityStatus: SqlDatabaseParityStatus;
  mismatchCount: number;
  exportFreshness: "current" | "stale" | "source_missing";
  costGuardStatus: "batched_summary_first" | "missing";
  blockedExternalReview: boolean;
  rawDetailsDefaultOpen: false;
}

export interface SqlDatabaseParityVerificationInput {
  rawEventFact?: BehavioralEventFact | null;
  normalizedEventFact?: BehavioralEventFact | null;
  exportRow?: SqlDatabaseExportRow | null;
  globalSummary?: SqlDatabaseSummary | null;
  userSummary?: SqlDatabaseSummary | null;
  journeySummary?: SqlDatabaseSummary | null;
}

export interface SqlDatabaseParityVerification {
  parityStatus: SqlDatabaseParityStatus;
  mismatchCount: number;
  mismatches: SqlDatabaseParityMismatch[];
  exportFreshness: "current" | "stale" | "source_missing";
  costLane: SqlDatabaseCostLaneEvaluation;
  scoreDimensions: {
    sourceHealth: "covered";
    runtimeHealth: "source_ready_external_review_remaining";
    evidenceCompleteness: "covered";
    freshness: "covered";
    costRisk: "source_guarded_external_review_remaining";
    regressionRisk: "covered";
    overallHealthScore: "covered";
  };
  debugLane: SqlDatabaseParityDebugLane;
}

export interface SqlDatabaseCostLaneEvaluation {
  status: SqlDatabaseCostLaneStatus;
  costGuard: "batched_summary_first";
  nextAction: string;
  providerCallRequired: false;
}

export const SQL_DATABASE_PARITY_COST_GUARDS = {
  bigQueryExportCadence: "daily_watermark_batch",
  perEventBigQueryExportAllowed: false,
  casualCloudSqlMirrorSyncAllowed: false,
  hotPathWrites: "essential_summaries_only",
  adminReads: "summaries_first_paged_drilldowns",
  noDuplicateMaterializers: true,
  noProductionExportInValidator: true,
} as const;

export function buildSqlDatabaseParityDebugLane(
  input: Partial<Omit<SqlDatabaseParityDebugLane, "label" | "rawDetailsDefaultOpen">> = {},
): SqlDatabaseParityDebugLane {
  const mismatchCount = Math.max(0, Math.trunc(Number(input.mismatchCount ?? 0)));
  const parityStatus = input.parityStatus ?? (mismatchCount > 0 ? "mismatch_recorded" : "matched");
  return {
    label: "SQL/database parity",
    parityStatus,
    mismatchCount,
    exportFreshness: input.exportFreshness ?? "current",
    costGuardStatus: input.costGuardStatus ?? "batched_summary_first",
    blockedExternalReview: input.blockedExternalReview ?? true,
    rawDetailsDefaultOpen: false,
  };
}
