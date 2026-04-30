import {
  type AnalyticsActorType,
  type AnalyticsEventSourceLane,
  type CanonicalAnalyticsEvent,
  createCanonicalAnalyticsEvent,
  normalizeLegacyMappingConfidence,
} from "@/lib/analytics/analytics-event-contract";

export const LEGACY_ANALYTICS_SOURCE_KEYS = [
  "analytics_event_facts",
  "analytics_guest_batches",
  "analytics_session_facts",
  "analytics_watch_sessions",
  "analytics_watch_assets",
  "transactions",
  "unlocks",
  "drop_views",
  "daily_task_events",
  "task_lifecycle_logs",
  "notifications",
  "onboarding_steps",
  "users",
  "presence",
  "admin_audit_logs",
  "ga4_daily",
  "ga4_intraday",
  "bigquery_export",
  "backend_rollup",
  "unknown",
] as const;

export type LegacyAnalyticsSourceKey = (typeof LEGACY_ANALYTICS_SOURCE_KEYS)[number];

export interface LegacyAnalyticsRecordInput {
  legacySource: LegacyAnalyticsSourceKey | string;
  legacyId?: string | null;
  sourcePath?: string | null;
  record: Record<string, unknown>;
  selectedRange?: string | null;
}

export interface LegacyMappingMetadata {
  legacySource: string;
  legacyId: string | null;
  sourcePath: string | null;
  selectedRange: string | null;
  confidence: "high" | "medium" | "low" | "directional" | "unknown";
  serverConfirmed: false;
  mixingPolicy: "legacy_directional_only";
  warnings: string[];
}

export interface LegacyMappingSuccess {
  status: "mapped";
  event: CanonicalAnalyticsEvent;
  metadata: LegacyMappingMetadata;
}

export interface LegacyMappingUnmapped {
  status: "unmapped";
  record: Record<string, unknown>;
  metadata: LegacyMappingMetadata;
  reason: string;
}

export type LegacyMappingResult = LegacyMappingSuccess | LegacyMappingUnmapped;

function stringValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function timestampValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) {
        return new Date(parsed).toISOString();
      }
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return new Date(value).toISOString();
    }
    if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
      const date = value.toDate();
      if (date instanceof Date && Number.isFinite(date.getTime())) {
        return date.toISOString();
      }
    }
  }
  return null;
}

function inferEventName(input: LegacyAnalyticsRecordInput) {
  const source = input.legacySource;
  const record = input.record;

  if (source === "notifications") {
    if (record.clearedAt) return "notification_cleared";
    if (record.readAt) return "notification_read";
    if (record.openedAt || record.clickedAt) return "notification_opened";
    return "notification_sent";
  }

  const directEvent = stringValue(record, ["eventName", "event_name", "name", "type", "event"]);
  if (directEvent) {
    return directEvent;
  }

  if (source === "transactions") {
    const status = stringValue(record, ["status", "state"])?.toLowerCase();
    return status === "failed" || status === "declined" ? "gumdrops_purchase_failed" : "gumdrops_purchase_completed";
  }

  if (source === "unlocks") {
    return "unlock_drop_success";
  }

  if (source === "drop_views") {
    return "drop_preview_opened";
  }

  if (source === "daily_task_events" || source === "task_lifecycle_logs") {
    const lifecycleState = stringValue(record, ["lifecycleState", "state", "status", "action"])?.toLowerCase();
    if (lifecycleState?.includes("assign")) return "daily_task_assigned";
    if (lifecycleState?.includes("start")) return "daily_task_started";
    if (lifecycleState?.includes("complete")) return "daily_task_completed";
    if (lifecycleState?.includes("fail") || lifecycleState?.includes("expire")) return "daily_task_failed";
    return "daily_task_started";
  }

  if (source === "onboarding_steps") {
    const stepState = stringValue(record, ["state", "status", "action"])?.toLowerCase();
    if (stepState?.includes("complete")) return "guided_onboarding_step_completed";
    return "guided_onboarding_step_started";
  }

  if (source === "analytics_guest_batches" || source === "analytics_session_facts") {
    return "page_viewed";
  }

  if (source === "admin_audit_logs") {
    return "admin_action_performed";
  }

  return null;
}

function inferActorType(input: LegacyAnalyticsRecordInput): AnalyticsActorType {
  const source = input.legacySource;
  const record = input.record;
  const route = stringValue(record, ["route", "pagePath", "page_path", "path"])?.toLowerCase();

  if (source === "admin_audit_logs" || route === "/admin" || route?.startsWith("/admin/") || record.adminId) {
    return "admin";
  }
  if (source === "backend_rollup" || record.systemGenerated === true) {
    return "system";
  }
  if (record.creatorId) {
    return "creator";
  }
  if (record.userId || record.uid) {
    return "user";
  }
  if (record.anonymousVisitorId || record.sessionId || record.clientSessionId || source === "analytics_guest_batches") {
    return "guest";
  }
  return "unknown";
}

function inferLegacyConfidence(input: LegacyAnalyticsRecordInput, warnings: string[]) {
  const source = input.legacySource;
  if (warnings.length > 2) return "low";
  if (source === "analytics_event_facts" || source === "transactions" || source === "daily_task_events") return "high";
  if (source === "task_lifecycle_logs" || source === "unlocks" || source === "notifications" || source === "onboarding_steps") {
    return "medium";
  }
  if (source === "ga4_intraday" || source === "analytics_guest_batches" || source === "backend_rollup") return "directional";
  if (source === "ga4_daily" || source === "bigquery_export") return "medium";
  return "unknown";
}

function inferSourceLane(input: LegacyAnalyticsRecordInput): AnalyticsEventSourceLane {
  const source = input.legacySource;
  if (source === "ga4_daily") return "ga4_daily";
  if (source === "ga4_intraday") return "ga4_intraday";
  if (source === "bigquery_export") return "bigquery_daily";
  if (source === "analytics_guest_batches") return "guest_batch";
  if (source === "admin_audit_logs" || source === "backend_rollup") return "legacy_firestore";
  if (source === "presence") return "legacy_rtdb";
  return "legacy_firestore";
}

function inferObjectTypeAndId(input: LegacyAnalyticsRecordInput) {
  const record = input.record;
  const objectId =
    stringValue(record, ["objectId", "dropId", "taskId", "notificationId", "purchaseId", "transactionId", "assetId", "stepId"]) ??
    null;

  if (record.dropId) return { objectType: "drop", objectId };
  if (record.taskId) return { objectType: "task", objectId };
  if (record.notificationId) return { objectType: "notification", objectId };
  if (record.purchaseId || record.transactionId) return { objectType: "purchase", objectId };
  if (record.assetId) return { objectType: "viewer_asset", objectId };
  if (record.stepId) return { objectType: "onboarding", objectId };
  return { objectType: stringValue(record, ["objectType"]) ?? "unknown", objectId };
}

export function mapLegacyAnalyticsRecordToCanonical(input: LegacyAnalyticsRecordInput): LegacyMappingResult {
  const warnings: string[] = [];
  const eventName = inferEventName(input);
  const legacyId =
    input.legacyId ??
    stringValue(input.record, ["id", "eventId", "batchId", "transactionId", "notificationId", "taskId"]) ??
    null;
  const occurredAt =
    timestampValue(input.record, ["occurredAt", "eventTimestamp", "timestamp", "createdAt", "updatedAt", "completedAt", "sentAt"]) ??
    new Date(0).toISOString();

  if (!eventName) {
    warnings.push("No event name or source-specific mapping rule exists for this legacy record.");
  }
  if (occurredAt === new Date(0).toISOString()) {
    warnings.push("Legacy record has no recoverable timestamp; epoch placeholder is mapping-only and not server truth.");
  }

  const confidence = normalizeLegacyMappingConfidence(inferLegacyConfidence(input, warnings));
  const metadata: LegacyMappingMetadata = {
    legacySource: input.legacySource,
    legacyId,
    sourcePath: input.sourcePath ?? null,
    selectedRange: input.selectedRange ?? null,
    confidence,
    serverConfirmed: false,
    mixingPolicy: "legacy_directional_only",
    warnings,
  };

  if (!eventName) {
    return {
      status: "unmapped",
      record: input.record,
      metadata,
      reason: "legacy_event_name_unmapped",
    };
  }

  const object = inferObjectTypeAndId(input);
  const actorType = inferActorType(input);
  if (actorType === "unknown") {
    warnings.push("Actor lane could not be recovered; downstream user analytics must exclude this record.");
  }

  const event = createCanonicalAnalyticsEvent({
    eventId: `legacy:${input.legacySource}:${legacyId ?? eventName}:${occurredAt}`,
    eventName,
    occurredAt,
    receivedAt: timestampValue(input.record, ["receivedAt", "ingestedAt", "updatedAt"]) ?? occurredAt,
    actorType,
    anonymousVisitorId: stringValue(input.record, ["anonymousVisitorId", "clientSubjectId", "visitorId"]),
    sessionId: stringValue(input.record, ["sessionId", "clientSessionId", "analyticsSessionId"]),
    userId: stringValue(input.record, ["userId", "uid"]),
    creatorId: stringValue(input.record, ["creatorId"]),
    adminId: stringValue(input.record, ["adminId"]),
    surface: stringValue(input.record, ["surface", "pageTitle", "module"]),
    route: stringValue(input.record, ["route", "pagePath", "page_path", "path"]),
    component: stringValue(input.record, ["component", "componentId"]),
    objectType: object.objectType,
    objectId: object.objectId,
    source: inferSourceLane(input),
    consentState: stringValue(input.record, ["consentState"]) ?? "unknown",
    legacySource: input.legacySource,
    legacyId,
    legacyConfidence: confidence,
    mappingWarnings: warnings,
    payload: {
      legacyRecord: input.record,
      selectedRange: input.selectedRange ?? null,
      sourcePath: input.sourcePath ?? null,
      serverConfirmed: false,
      mixingPolicy: "legacy_directional_only",
    },
  });

  return {
    status: "mapped",
    event,
    metadata,
  };
}

export function mapLegacyAnalyticsRecords(inputs: LegacyAnalyticsRecordInput[]) {
  const results = inputs.map(mapLegacyAnalyticsRecordToCanonical);

  return {
    mapped: results.filter((result): result is LegacyMappingSuccess => result.status === "mapped"),
    unmapped: results.filter((result): result is LegacyMappingUnmapped => result.status === "unmapped"),
    results,
  };
}
