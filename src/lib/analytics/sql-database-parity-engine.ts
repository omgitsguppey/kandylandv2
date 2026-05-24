import type { BehavioralEventFact } from "@/lib/behavioral/event-fact-contract";
import type { UserJourneyEvent } from "@/lib/behavioral/user-journey-contract";

import {
  buildSqlDatabaseParityDebugLane,
  type SqlDatabaseCostLaneEvaluation,
  type SqlDatabaseExportRow,
  type SqlDatabaseJourneyExport,
  type SqlDatabaseParityMismatch,
  type SqlDatabaseParityVerification,
  type SqlDatabaseParityVerificationInput,
  type SqlDatabaseSummary,
} from "./sql-database-parity-contract";

function clean(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function datePartition(timestampMs: number) {
  const date = new Date(Number.isFinite(timestampMs) ? timestampMs : Date.now());
  return date.toISOString().slice(0, 10);
}

function summaryKey(...parts: unknown[]) {
  return parts.map((part) => clean(part) || "unknown").join(":").replace(/[^A-Za-z0-9:_/-]+/gu, "_").slice(0, 180);
}

function linkedPersonIdFor(fact: BehavioralEventFact) {
  return clean(fact.dedupeDecision?.input.linkedPersonId)
    || clean(fact.dedupeDecision?.input.linkId)
    || clean(fact.userId)
    || clean(fact.anonymousVisitorId)
    || null;
}

function featureIdFor(fact: BehavioralEventFact) {
  if (fact.normalizedAction.includes("watch")) return "viewer";
  if (fact.entityType === "wallet" || fact.transactionId) return "wallet";
  if (fact.entityType === "task" || fact.taskId) return "daily_checkin";
  if (fact.entityType === "chat" || fact.threadId) return "chat";
  if (fact.entityType === "creator" || fact.creatorId) return "creator_profile";
  if (fact.entityType === "drop" || fact.dropId) return "drops";
  return fact.entityType || "analytics";
}

function buildSummary(input: {
  summaryKind: SqlDatabaseSummary["summaryKind"];
  fact: BehavioralEventFact;
  keyPrefix: string;
  countDelta: number;
  dedupeKey: string;
  linkedPersonId?: string | null;
}): SqlDatabaseSummary {
  return {
    summaryKind: input.summaryKind,
    summaryKey: summaryKey(input.keyPrefix, input.fact.eventName, input.linkedPersonId ?? input.fact.userId ?? input.fact.sessionId),
    eventName: input.fact.eventName,
    countDelta: input.countDelta,
    dedupeKey: input.dedupeKey,
    linkedPersonId: input.linkedPersonId ?? linkedPersonIdFor(input.fact),
    userId: clean(input.fact.userId) || null,
    sessionId: clean(input.fact.sessionId) || null,
    sourceEventFactId: input.fact.eventId,
    sourceTruth: "normalized_event_fact",
    parityStatus: "matched",
  };
}

export function mapEventFactToSqlRow(fact: BehavioralEventFact): SqlDatabaseExportRow {
  return {
    exportRowKind: "event_fact",
    rawEventFactId: fact.eventId,
    normalizedEventName: fact.eventName,
    timestampMs: fact.timestampMs,
    warehousePartition: datePartition(fact.timestampMs),
    actorUserId: clean(fact.actorUserId) || clean(fact.userId) || null,
    userId: clean(fact.userId) || null,
    sessionId: clean(fact.sessionId) || null,
    linkedPersonId: linkedPersonIdFor(fact),
    route: fact.route || fact.pagePath || "unknown",
    surface: fact.entityType || fact.sourceComponent || "analytics",
    featureId: featureIdFor(fact),
    globalDedupeKey: fact.dedupeDecision.global.dedupeKey,
    userDedupeKey: fact.dedupeDecision.user.dedupeKey,
    sqlDedupeKey: fact.dedupeDecision.sql.dedupeKey,
    replayProtection: fact.globalUserParity.replaySafety,
    primaryProductTruth: false,
    sourceTruth: fact.sourceTruth,
    parityStatus: "matched",
  };
}

export function mapEventFactToGlobalSummary(fact: BehavioralEventFact): SqlDatabaseSummary {
  return buildSummary({
    summaryKind: "globalSummary",
    fact,
    keyPrefix: "global",
    countDelta: fact.dedupeDecision.global.count ? 1 : 0,
    dedupeKey: fact.dedupeDecision.global.dedupeKey,
    linkedPersonId: null,
  });
}

export function mapEventFactToUserSummary(fact: BehavioralEventFact): SqlDatabaseSummary {
  return buildSummary({
    summaryKind: "userSummary",
    fact,
    keyPrefix: "user",
    countDelta: fact.dedupeDecision.user.count ? 1 : 0,
    dedupeKey: fact.dedupeDecision.user.dedupeKey,
    linkedPersonId: linkedPersonIdFor(fact),
  });
}

export function mapJourneyToExport(journey: UserJourneyEvent): SqlDatabaseJourneyExport {
  const sourceEventFactId = clean(journey.eventId) || clean(journey.journeyEventId);
  return {
    exportRowKind: "journey_summary",
    journeyEventId: journey.journeyEventId,
    sourceEventFactId,
    warehousePartition: datePartition(Date.parse(journey.timestamp)),
    primaryProductTruth: false,
    privacyClass: journey.privacyClass,
    journeySummary: {
      summaryKind: "journeySummary" as SqlDatabaseSummary["summaryKind"],
      summaryKey: summaryKey("journey", journey.linkedPersonId, journey.sessionId, journey.action),
      eventName: journey.sourceEventName,
      countDelta: 1,
      dedupeKey: journey.journeyEventId,
      linkedPersonId: journey.linkedPersonId || null,
      userId: journey.actorKind === "signed_in_user" ? journey.linkedPersonId : null,
      sessionId: journey.sessionId || null,
      sourceEventFactId,
      sourceTruth: "normalized_event_fact",
      parityStatus: "matched",
    },
  };
}

function addMismatch(
  mismatches: SqlDatabaseParityMismatch[],
  mismatch: SqlDatabaseParityMismatch,
) {
  mismatches.push(mismatch);
}

export function estimateCostLane(input: { operation: "hot_path_write" | "bigquery_export" | "admin_debug_read" | "drilldown_read" | "cloud_sql_mirror_sync" | "external_billing_review" }): SqlDatabaseCostLaneEvaluation {
  if (input.operation === "bigquery_export") {
    return {
      status: "batched_watermark_export",
      costGuard: "batched_summary_first",
      providerCallRequired: false,
      nextAction: "Keep BigQuery export on scheduled watermark batches; do not add per-event triggers.",
    };
  }
  if (input.operation === "admin_debug_read") {
    return {
      status: "summary_first_admin_read",
      costGuard: "batched_summary_first",
      providerCallRequired: false,
      nextAction: "Read admin/debug summaries first and use paged drilldowns for details.",
    };
  }
  if (input.operation === "drilldown_read") {
    return {
      status: "paged_drilldown",
      costGuard: "batched_summary_first",
      providerCallRequired: false,
      nextAction: "Keep drilldowns paged and scoped by partition or actor.",
    };
  }
  if (input.operation === "cloud_sql_mirror_sync") {
    return {
      status: "blocked_casual_cloud_sql_mirror",
      costGuard: "batched_summary_first",
      providerCallRequired: false,
      nextAction: "Cloud SQL/Data Connect mirror sync requires explicit approval and dry-run/manual guard.",
    };
  }
  if (input.operation === "external_billing_review") {
    return {
      status: "external_review_required",
      costGuard: "batched_summary_first",
      providerCallRequired: false,
      nextAction: "External billing review remains outside source-only validation.",
    };
  }
  return {
    status: "hot_path_essential_summary",
    costGuard: "batched_summary_first",
    providerCallRequired: false,
    nextAction: "Hot path writes only essential normalized summaries and raw event facts.",
  };
}

export function verifyGlobalUserSqlParity(input: SqlDatabaseParityVerificationInput): SqlDatabaseParityVerification {
  const mismatches: SqlDatabaseParityMismatch[] = [];
  const fact = input.normalizedEventFact ?? input.rawEventFact ?? null;

  if (!fact) {
    addMismatch(mismatches, {
      objectKind: "rawEventFact",
      status: "source_missing",
      reason: "Raw or normalized event fact is missing.",
      nextAction: "Build parity from canonical analytics_event_facts before SQL/export summaries.",
    });
  }
  if (!input.exportRow) {
    addMismatch(mismatches, {
      objectKind: "exportRow",
      status: "source_missing",
      reason: "Export row mapping is missing.",
      nextAction: "Map normalized event facts to export rows without raw private payloads.",
    });
  }
  if (fact && input.exportRow && input.exportRow.rawEventFactId !== fact.eventId) {
    addMismatch(mismatches, {
      objectKind: "exportRow",
      status: "mismatch_recorded",
      reason: "Export row event id does not match normalized event fact.",
      nextAction: "Regenerate export row from the normalized event fact.",
    });
  }
  if (fact && input.globalSummary?.dedupeKey !== fact.dedupeDecision.global.dedupeKey) {
    addMismatch(mismatches, {
      objectKind: "globalSummary",
      status: "mismatch_recorded",
      reason: "Global summary dedupe key diverges from event fact global dedupe decision.",
      nextAction: "Use mapEventFactToGlobalSummary for global summary writes.",
    });
  }
  if (fact && input.userSummary?.dedupeKey !== fact.dedupeDecision.user.dedupeKey) {
    addMismatch(mismatches, {
      objectKind: "userSummary",
      status: "mismatch_recorded",
      reason: "User summary dedupe key diverges from event fact user dedupe decision.",
      nextAction: "Use mapEventFactToUserSummary for user summary writes.",
    });
  }
  if (fact && input.globalSummary && input.userSummary && fact.dedupeDecision.user.count && input.globalSummary.countDelta > 0 && input.userSummary.countDelta <= 0) {
    addMismatch(mismatches, {
      objectKind: "userSummary",
      status: "mismatch_recorded",
      reason: "User summary failed to count a user-eligible globally counted event.",
      nextAction: "Record mismatch and repair the user materializer path before trusting user metrics.",
    });
  }
  if (input.journeySummary && fact && input.journeySummary.sourceEventFactId !== fact.eventId) {
    addMismatch(mismatches, {
      objectKind: "journeySummary",
      status: "mismatch_recorded",
      reason: "Journey summary does not point back to the source event fact.",
      nextAction: "Regenerate journey summary from normalized journey events.",
    });
  }

  const parityStatus = mismatches.length > 0 ? "mismatch_recorded" : "matched";
  const costLane = estimateCostLane({ operation: "bigquery_export" });
  return {
    parityStatus,
    mismatchCount: mismatches.length,
    mismatches,
    exportFreshness: input.exportRow ? "current" : "source_missing",
    costLane,
    scoreDimensions: {
      sourceHealth: "covered",
      runtimeHealth: "source_ready_external_review_remaining",
      evidenceCompleteness: "covered",
      freshness: "covered",
      costRisk: "source_guarded_external_review_remaining",
      regressionRisk: "covered",
      overallHealthScore: "covered",
    },
    debugLane: buildSqlDatabaseParityDebugLane({
      parityStatus,
      mismatchCount: mismatches.length,
      exportFreshness: input.exportRow ? "current" : "source_missing",
      costGuardStatus: costLane.costGuard,
      blockedExternalReview: true,
    }),
  };
}

export function classifyParityMismatch(input: SqlDatabaseParityVerification): SqlDatabaseParityMismatch {
  return input.mismatches[0] ?? {
    objectKind: "exportRow",
    status: "matched",
    reason: "Raw event fact, normalized summary, journey, and export keys agree.",
    nextAction: "Keep export batched and summary-first.",
  };
}
