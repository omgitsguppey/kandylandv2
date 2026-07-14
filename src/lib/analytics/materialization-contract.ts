import { ANALYTICS_INGEST_EVENT_TYPES, type AnalyticsIngestEventType } from "@/lib/analytics/ingest-contract";
import { TELEMETRY_DEPENDENCY_GRAPH, type TelemetryLaneId } from "@/lib/analytics/telemetry-dependency-graph";

export const MATERIALIZATION_CONTRACT_VERSION = "event_facts_materializer_closure_v1";

export type MaterializationDownstreamClassification =
  | "event_fact"
  | "materialized_summary"
  | "admin_evidence"
  | "bigquery_candidate"
  | "archive_debug_only";

export type MaterializationCadence = "immediate" | "minute" | "hour" | "day" | "deferred" | "manual";
export type MaterializationLowPriorityBehavior =
  | "not_applicable"
  | "deferred_minute_batch"
  | "bounded_batch_rollup"
  | "summary_only"
  | "archive_only";
export type MaterializationLegacyState = "current" | "unknown_legacy" | "debug_archive";

export interface MaterializationCollectionClassification {
  collection: string;
  producer: string;
  inputCollections: string[];
  eventFactOutputs: string[];
  rollupOutputs: string[];
  dedupeKeys: string[];
  materializerCadence: MaterializationCadence[];
  adminConsumers: string[];
  bigQueryExportEligible: boolean;
  downstreamClassification: MaterializationDownstreamClassification;
  lowPriorityBehavior: MaterializationLowPriorityBehavior;
  currentTruth: boolean;
  legacyState: MaterializationLegacyState;
  notes: string;
}

export interface IngestEventMaterializationRule {
  eventType: AnalyticsIngestEventType;
  dedupeKey: "session_batch";
  outputCollections: string[];
  priority: "priority" | "supporting";
  lowPriorityBehavior: MaterializationLowPriorityBehavior;
}

export interface MaterializationContractValidation {
  ok: boolean;
  findings: string[];
  unclassifiedCollections: string[];
}

export interface MaterializationContract {
  version: typeof MATERIALIZATION_CONTRACT_VERSION;
  rollupCadence: MaterializationCadence[];
  producerCollectionMap: Record<TelemetryLaneId, string[]>;
  collections: MaterializationCollectionClassification[];
  ingestEventMaterialization: Record<AnalyticsIngestEventType, IngestEventMaterializationRule>;
  archiveDebugOnlyCollections: string[];
}

const PRIORITY_INGEST_EVENTS = new Set<AnalyticsIngestEventType>(["page_view", "page_leave", "click"]);

const producerCollectionMap: Record<TelemetryLaneId, string[]> = {
  page_view: ["analytics_guest_batches", "analytics_sessions", "analytics_event_facts", "behavioral_timeline_facts"],
  session: ["analytics_sessions", "analytics_guest_batches", "analytics_event_facts"],
  guest_event: ["analytics_guest_batches", "analytics_sessions", "behavioral_timeline_facts", "analytics_page_daily", "analytics_semantic_daily"],
  auth_transition: ["analytics_event_facts", "behavioral_timeline_facts", "analytics_semantic_daily"],
  identity_link: ["analytics_identity_links", "analytics_event_facts", "identity_lineage_indexes"],
  purchase: ["analytics_event_facts", "transactions", "analytics_rollups_daily", "analytics_event_stats"],
  gumdrop_balance: ["analytics_event_facts", "daily_task_events", "analytics_rollups_daily"],
  creator_experience: ["analytics_event_facts", "behavioral_timeline_facts", "analytics_semantic_daily"],
  creator_subscription: ["analytics_event_facts", "creator_subscriptions"],
  creator_drop_submission: ["analytics_event_facts", "creator_drop_submissions"],
  runtime_watch: ["analytics_watch_sessions", "analytics_watch_observations", "analytics_event_facts", "analytics_session_facts"],
  behavior_signal: ["analytics_guest_batches", "analytics_event_facts", "behavioral_timeline_facts", "user_tracking_indexes", "guest_tracking_indexes"],
  admin_evidence: ["analytics_event_facts", "analytics_admin_metric_snapshots", "server_diagnostics"],
  external_ga4_evidence: ["ga4_daily", "analytics_admin_metric_snapshots"],
};

function classification(input: MaterializationCollectionClassification): MaterializationCollectionClassification {
  return input;
}

export const MATERIALIZATION_CONTRACT: MaterializationContract = {
  version: MATERIALIZATION_CONTRACT_VERSION,
  rollupCadence: ["immediate", "minute", "hour", "day", "deferred", "manual"],
  producerCollectionMap,
  archiveDebugOnlyCollections: [
    "legacy_page_duration_events",
    "ga4_daily",
    "server_diagnostics",
  ],
  ingestEventMaterialization: Object.fromEntries(
    ANALYTICS_INGEST_EVENT_TYPES.map((eventType) => [eventType, {
      eventType,
      dedupeKey: "session_batch",
      outputCollections: [
        "analytics_guest_batches",
        "analytics_sessions",
        "behavioral_timeline_facts",
        "analytics_page_daily",
        "analytics_semantic_daily",
      ],
      priority: PRIORITY_INGEST_EVENTS.has(eventType) ? "priority" : "supporting",
      lowPriorityBehavior: PRIORITY_INGEST_EVENTS.has(eventType) ? "not_applicable" : "bounded_batch_rollup",
    } satisfies IngestEventMaterializationRule]),
  ) as Record<AnalyticsIngestEventType, IngestEventMaterializationRule>,
  collections: [
    classification({
      collection: "analytics_event_facts",
      producer: "identified ingest, server trackServerEvent, callable ingestAnalyticsEvent",
      inputCollections: ["analytics_event_facts"],
      eventFactOutputs: ["analytics_event_facts"],
      rollupOutputs: [
        "analytics_rollups_daily",
        "analytics_event_stats",
        "analytics_users_rollup",
        "analytics_user_daily",
        "analytics_drops_rollup",
        "analytics_drop_daily",
        "analytics_session_facts",
        "analytics_semantic_daily",
        "analytics_event_rollup_batches",
      ],
      dedupeKeys: ["analytics_dedupe/{eventId}", "eventId", "idempotencyKey"],
      materializerCadence: ["immediate", "minute", "day", "deferred"],
      adminConsumers: ["Admin Analytics snapshots", "Admin Debug telemetry evidence", "BigQuery export candidates"],
      bigQueryExportEligible: true,
      downstreamClassification: "event_fact",
      lowPriorityBehavior: "deferred_minute_batch",
      currentTruth: true,
      legacyState: "current",
      notes: "Priority event facts roll up immediately; non-priority event facts enqueue minute batches before summary materialization.",
    }),
    classification({
      collection: "analytics_guest_batches",
      producer: "DeepTracker anonymous ingest",
      inputCollections: ["analytics_guest_batches"],
      eventFactOutputs: ["behavioral_timeline_facts"],
      rollupOutputs: ["analytics_page_daily", "analytics_semantic_daily", "behavioral_timeline_facts"],
      dedupeKeys: ["guest_batch:{sessionKey}:{batchId}", "session_batch"],
      materializerCadence: ["minute", "day", "deferred"],
      adminConsumers: ["Admin Analytics audience snapshot", "Guest analytics cutover", "Admin Debug guest evidence"],
      bigQueryExportEligible: true,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "bounded_batch_rollup",
      currentTruth: true,
      legacyState: "current",
      notes: "Guest batches are bounded batches and must not hot-write one rollup per hover/scroll/visibility signal.",
    }),
    classification({
      collection: "analytics_sessions",
      producer: "anonymous ingest session snapshots and identity/session helpers",
      inputCollections: ["analytics_guest_batches", "analytics_sessions"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_admin_metric_snapshots", "identity_lineage_indexes"],
      dedupeKeys: ["sessionKey", "clientSessionId"],
      materializerCadence: ["minute", "hour", "day"],
      adminConsumers: ["Admin Analytics audience/live pulse", "Identity transfer evidence"],
      bigQueryExportEligible: false,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "Session records support audience and identity summaries; missing sessions are unavailable evidence, not zero users.",
    }),
    classification({
      collection: "behavioral_timeline_facts",
      producer: "analytics ingest and identified event fact normalizers",
      inputCollections: ["analytics_guest_batches", "analytics_event_facts"],
      eventFactOutputs: ["behavioral_timeline_facts"],
      rollupOutputs: ["user_tracking_indexes", "guest_tracking_indexes", "analytics_admin_metric_snapshots"],
      dedupeKeys: ["eventId", "session_batch_event_index"],
      materializerCadence: ["minute", "hour", "day", "deferred"],
      adminConsumers: ["Recommendation ranker", "Admin Analytics event mix", "Behavioral evidence reports"],
      bigQueryExportEligible: true,
      downstreamClassification: "event_fact",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "Canonical behavioral timeline facts feed the user_index_materializer_requests v3 worker, which publishes bounded user and guest tracking indexes with explicit ephemeral-record retention metadata; admin/projection/synthetic activity remains excluded from user behavior metrics.",
    }),
    classification({
      collection: "analytics_watch_sessions",
      producer: "viewer watch-session route",
      inputCollections: ["analytics_watch_sessions", "analytics_watch_observations"],
      eventFactOutputs: ["analytics_event_facts"],
      rollupOutputs: ["analytics_session_facts", "analytics_admin_metric_snapshots", "behavioral intelligence watch rollups"],
      dedupeKeys: ["watchSessionId", "actorUserId:dropId:assetId"],
      materializerCadence: ["immediate", "minute", "day"],
      adminConsumers: ["Runtime watch-time v2", "Admin Analytics watch-time health", "Beta analytics/watch-time evidence"],
      bigQueryExportEligible: true,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "not_applicable",
      currentTruth: true,
      legacyState: "current",
      notes: "Watch-time truth comes from foreground runtime media/session intervals, not page duration.",
    }),
    classification({
      collection: "analytics_watch_observations",
      producer: "viewer watch-session route observation writes",
      inputCollections: ["analytics_watch_observations"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_watch_sessions", "analytics_session_facts"],
      dedupeKeys: ["observationId", "watchSessionId:sequence"],
      materializerCadence: ["immediate", "minute"],
      adminConsumers: ["Runtime watch-time v2 diagnostics"],
      bigQueryExportEligible: false,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "not_applicable",
      currentTruth: true,
      legacyState: "current",
      notes: "Observation rows support watch-session rollups and should stay bounded to runtime media observations.",
    }),
    classification({
      collection: "analytics_event_rollup_batches",
      producer: "onAnalyticsEventFactCreated non-priority queue",
      inputCollections: ["analytics_event_facts"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_rollups_daily", "analytics_event_stats", "analytics_admin_metric_snapshots"],
      dedupeKeys: ["minuteKey"],
      materializerCadence: ["minute", "deferred"],
      adminConsumers: ["Admin Analytics event mix", "analytics materializer health"],
      bigQueryExportEligible: false,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "This queue prevents low-priority event facts from hot-writing every downstream aggregate.",
    }),
    classification({
      collection: "analytics_rollups_daily",
      producer: "analytics event fact materializer",
      inputCollections: ["analytics_event_facts", "analytics_event_rollup_batches"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_admin_metric_snapshots"],
      dedupeKeys: ["dayKey"],
      materializerCadence: ["day", "deferred"],
      adminConsumers: ["Admin Analytics platform pulse", "Admin Debug analytics truth"],
      bigQueryExportEligible: true,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "Daily rollups are current summaries only when source timestamps and materializer status are fresh.",
    }),
    classification({
      collection: "analytics_event_stats",
      producer: "analytics event fact materializer",
      inputCollections: ["analytics_event_facts"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_admin_metric_snapshots"],
      dedupeKeys: ["eventName"],
      materializerCadence: ["minute", "day", "deferred"],
      adminConsumers: ["Admin Analytics event mix"],
      bigQueryExportEligible: true,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "Event stats summarize observed event facts and cannot invent event totals detached from source facts.",
    }),
    classification({
      collection: "analytics_users_rollup",
      producer: "analytics event fact materializer",
      inputCollections: ["analytics_event_facts"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_admin_metric_snapshots", "user_tracking_indexes"],
      dedupeKeys: ["userId"],
      materializerCadence: ["minute", "day", "deferred"],
      adminConsumers: ["Admin user analytics", "behavioral intelligence"],
      bigQueryExportEligible: true,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "User rollups must keep linked guest lineage separate to prevent double counting.",
    }),
    classification({
      collection: "analytics_user_daily",
      producer: "analytics event fact materializer",
      inputCollections: ["analytics_event_facts"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_admin_metric_snapshots", "user_tracking_indexes"],
      dedupeKeys: ["dayKey:userId"],
      materializerCadence: ["day", "deferred"],
      adminConsumers: ["Admin user analytics"],
      bigQueryExportEligible: true,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "User daily rows are summary outputs, not raw truth replacements.",
    }),
    classification({
      collection: "analytics_drops_rollup",
      producer: "analytics event fact materializer",
      inputCollections: ["analytics_event_facts", "analytics_watch_sessions"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_admin_metric_snapshots"],
      dedupeKeys: ["dropId"],
      materializerCadence: ["minute", "day", "deferred"],
      adminConsumers: ["Admin top drops", "Drop behavior evidence"],
      bigQueryExportEligible: true,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "Drop rollups summarize source facts and server entitlement/watch records.",
    }),
    classification({
      collection: "analytics_drop_daily",
      producer: "analytics event fact materializer",
      inputCollections: ["analytics_event_facts", "analytics_watch_sessions"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_admin_metric_snapshots"],
      dedupeKeys: ["dayKey:dropId"],
      materializerCadence: ["day", "deferred"],
      adminConsumers: ["Admin top drops", "Drop behavior evidence"],
      bigQueryExportEligible: true,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "Drop daily rows are source-backed summaries only.",
    }),
    classification({
      collection: "analytics_session_facts",
      producer: "analytics event fact and watch-session materializers",
      inputCollections: ["analytics_event_facts", "analytics_watch_sessions"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_admin_metric_snapshots", "behavioral intelligence watch rollups"],
      dedupeKeys: ["sessionId:dropId"],
      materializerCadence: ["minute", "day", "deferred"],
      adminConsumers: ["Admin Analytics session health", "Runtime watch-time evidence"],
      bigQueryExportEligible: true,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "Session facts must label legacy page-duration watch scores as low confidence.",
    }),
    classification({
      collection: "analytics_semantic_daily",
      producer: "analytics semantic rollup materializer",
      inputCollections: ["analytics_event_facts", "analytics_guest_batches"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_admin_metric_snapshots"],
      dedupeKeys: ["dayKey:category:scopeKey"],
      materializerCadence: ["day", "deferred"],
      adminConsumers: ["Admin Analytics semantic scopes", "source truth evidence"],
      bigQueryExportEligible: true,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "Semantic daily rows summarize normalized source scopes and should not be treated as raw events.",
    }),
    classification({
      collection: "analytics_page_daily",
      producer: "guest batch page materializer",
      inputCollections: ["analytics_guest_batches"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_admin_metric_snapshots"],
      dedupeKeys: ["dayKey:pagePath"],
      materializerCadence: ["day", "deferred"],
      adminConsumers: ["Admin Analytics audience/page evidence"],
      bigQueryExportEligible: true,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "bounded_batch_rollup",
      currentTruth: true,
      legacyState: "current",
      notes: "Page daily records derive from bounded guest batches, not raw hover spam.",
    }),
    classification({
      collection: "analytics_admin_metric_snapshots",
      producer: "admin analytics materializer registry",
      inputCollections: ["analytics_event_facts", "analytics_guest_batches", "analytics_watch_sessions", "analytics_rollups_daily"],
      eventFactOutputs: [],
      rollupOutputs: [],
      dedupeKeys: ["moduleKey:rangeKey"],
      materializerCadence: ["manual", "deferred"],
      adminConsumers: ["Admin Analytics default display", "Admin Debug source truth"],
      bigQueryExportEligible: false,
      downstreamClassification: "admin_evidence",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "Default Admin Analytics should read snapshots/summaries first and keep raw ledgers as debug input only.",
    }),
    classification({
      collection: "analytics_identity_links",
      producer: "identity-link route and identified ingest identity_linked event",
      inputCollections: ["analytics_identity_links", "analytics_event_facts"],
      eventFactOutputs: ["analytics_event_facts"],
      rollupOutputs: ["identity_lineage_indexes"],
      dedupeKeys: ["userId:anonymousVisitorId:sessionId"],
      materializerCadence: ["immediate", "deferred"],
      adminConsumers: ["Identity transfer evidence", "Guest-user analytics cutover"],
      bigQueryExportEligible: true,
      downstreamClassification: "event_fact",
      lowPriorityBehavior: "not_applicable",
      currentTruth: true,
      legacyState: "current",
      notes: "Identity links join lineage without rewriting or duplicating guest events.",
    }),
    classification({
      collection: "identity_lineage_indexes",
      producer: "identity transfer materializer",
      inputCollections: ["analytics_identity_links", "analytics_guest_batches", "analytics_event_facts"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_admin_metric_snapshots"],
      dedupeKeys: ["userId"],
      materializerCadence: ["deferred"],
      adminConsumers: ["Individual user telemetry and linked-user evidence"],
      bigQueryExportEligible: false,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "Linked guest history remains lineage and must not double count as new user events.",
    }),
    classification({
      collection: "user_tracking_indexes",
      producer: "behavioral materializers",
      inputCollections: ["analytics_event_facts", "behavioral_timeline_facts", "analytics_watch_sessions"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_admin_metric_snapshots"],
      dedupeKeys: ["userId"],
      materializerCadence: ["deferred"],
      adminConsumers: ["Recommendations", "Admin user behavior", "behavioral evidence"],
      bigQueryExportEligible: false,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "Tracking indexes are serving models over source facts, not independent truth.",
    }),
    classification({
      collection: "guest_tracking_indexes",
      producer: "behavioral materializers",
      inputCollections: ["analytics_guest_batches", "behavioral_timeline_facts"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_admin_metric_snapshots"],
      dedupeKeys: ["anonymousVisitorId"],
      materializerCadence: ["deferred"],
      adminConsumers: ["Guest analytics evidence", "recommendation context"],
      bigQueryExportEligible: false,
      downstreamClassification: "materialized_summary",
      lowPriorityBehavior: "summary_only",
      currentTruth: true,
      legacyState: "current",
      notes: "Guest indexes remain separate from linked user indexes until identity transfer joins lineage.",
    }),
    classification({
      collection: "transactions",
      producer: "server payment capture and ledger routes",
      inputCollections: ["transactions"],
      eventFactOutputs: ["analytics_event_facts"],
      rollupOutputs: ["analytics_admin_metric_snapshots", "analytics_rollups_daily"],
      dedupeKeys: ["transactionId", "providerCaptureId"],
      materializerCadence: ["immediate", "day"],
      adminConsumers: ["Admin revenue truth", "commerce snapshot"],
      bigQueryExportEligible: true,
      downstreamClassification: "event_fact",
      lowPriorityBehavior: "not_applicable",
      currentTruth: true,
      legacyState: "current",
      notes: "Payment transaction truth outranks telemetry; this contract only classifies downstream analytics use.",
    }),
    classification({
      collection: "daily_task_events",
      producer: "daily task/reward server routes",
      inputCollections: ["daily_task_events"],
      eventFactOutputs: ["analytics_event_facts"],
      rollupOutputs: ["analytics_admin_metric_snapshots"],
      dedupeKeys: ["eventId", "userId:taskId:dayKey"],
      materializerCadence: ["immediate", "day"],
      adminConsumers: ["Daily task pipeline", "economy evidence"],
      bigQueryExportEligible: true,
      downstreamClassification: "event_fact",
      lowPriorityBehavior: "not_applicable",
      currentTruth: true,
      legacyState: "current",
      notes: "Task events are server facts and cannot be replaced by client-only telemetry.",
    }),
    classification({
      collection: "creator_subscriptions",
      producer: "creator subscription server routes",
      inputCollections: ["creator_subscriptions"],
      eventFactOutputs: ["analytics_event_facts"],
      rollupOutputs: ["analytics_admin_metric_snapshots"],
      dedupeKeys: ["subscriptionId"],
      materializerCadence: ["immediate", "day"],
      adminConsumers: ["Fan Pass CRM", "creator monetization evidence"],
      bigQueryExportEligible: true,
      downstreamClassification: "event_fact",
      lowPriorityBehavior: "not_applicable",
      currentTruth: true,
      legacyState: "current",
      notes: "Creator subscription state is product truth; telemetry is companion evidence.",
    }),
    classification({
      collection: "creator_drop_submissions",
      producer: "creator drop submission and admin review routes",
      inputCollections: ["creator_drop_submissions"],
      eventFactOutputs: ["analytics_event_facts"],
      rollupOutputs: ["analytics_admin_metric_snapshots"],
      dedupeKeys: ["dropId", "submissionId"],
      materializerCadence: ["immediate", "day"],
      adminConsumers: ["Creator drop management approval", "Admin Drops CMS evidence"],
      bigQueryExportEligible: true,
      downstreamClassification: "event_fact",
      lowPriorityBehavior: "not_applicable",
      currentTruth: true,
      legacyState: "current",
      notes: "Pending creator submissions are excluded from public discovery until admin review changes server truth.",
    }),
    classification({
      collection: "ga4_daily",
      producer: "external GA4 evidence refresh when configured",
      inputCollections: ["ga4_daily"],
      eventFactOutputs: [],
      rollupOutputs: ["analytics_admin_metric_snapshots"],
      dedupeKeys: ["propertyId:date"],
      materializerCadence: ["manual"],
      adminConsumers: ["GA4 recovery truth", "Admin Analytics external evidence"],
      bigQueryExportEligible: false,
      downstreamClassification: "archive_debug_only",
      lowPriorityBehavior: "archive_only",
      currentTruth: false,
      legacyState: "debug_archive",
      notes: "GA4 is external evidence only and never first-party product truth.",
    }),
    classification({
      collection: "server_diagnostics",
      producer: "bounded diagnostics and debug evidence",
      inputCollections: ["server_diagnostics"],
      eventFactOutputs: [],
      rollupOutputs: ["admin debug evidence"],
      dedupeKeys: ["fingerprint:hour"],
      materializerCadence: ["deferred", "manual"],
      adminConsumers: ["Admin Debug"],
      bigQueryExportEligible: false,
      downstreamClassification: "archive_debug_only",
      lowPriorityBehavior: "archive_only",
      currentTruth: false,
      legacyState: "debug_archive",
      notes: "Diagnostics support debugging and must not become current behavior or revenue truth.",
    }),
    classification({
      collection: "legacy_page_duration_events",
      producer: "legacy analytics adapters",
      inputCollections: ["legacy_page_duration_events"],
      eventFactOutputs: [],
      rollupOutputs: [],
      dedupeKeys: ["legacyEventId"],
      materializerCadence: ["manual"],
      adminConsumers: ["Admin Debug legacy archive only"],
      bigQueryExportEligible: false,
      downstreamClassification: "archive_debug_only",
      lowPriorityBehavior: "archive_only",
      currentTruth: false,
      legacyState: "unknown_legacy",
      notes: "Legacy page duration is not watch-time or current user behavior truth.",
    }),
  ],
};

export function getMaterializationClassification(collection: string) {
  return MATERIALIZATION_CONTRACT.collections.find((entry) => entry.collection === collection);
}

export function listBigQueryExportCandidates() {
  return MATERIALIZATION_CONTRACT.collections
    .filter((entry) => entry.bigQueryExportEligible)
    .map((entry) => entry.collection)
    .sort();
}

function collectionsFromProducerMap() {
  return Array.from(new Set(Object.values(MATERIALIZATION_CONTRACT.producerCollectionMap).flat())).sort();
}

export function validateMaterializationContractClosure(): MaterializationContractValidation {
  const findings: string[] = [];
  const collectionIds = new Set<string>();

  for (const collection of MATERIALIZATION_CONTRACT.collections) {
    if (collectionIds.has(collection.collection)) {
      findings.push(`duplicate collection classification: ${collection.collection}`);
    }
    collectionIds.add(collection.collection);

    if (collection.adminConsumers.length === 0) {
      findings.push(`${collection.collection} missing admin consumer or explicit archive consumer`);
    }
    if (collection.dedupeKeys.length === 0) {
      findings.push(`${collection.collection} missing dedupe keys`);
    }
    if (collection.currentTruth && collection.legacyState !== "current") {
      findings.push(`${collection.collection} cannot be current truth with legacy state ${collection.legacyState}`);
    }
    if (!collection.currentTruth && collection.downstreamClassification !== "archive_debug_only") {
      findings.push(`${collection.collection} non-current records must be archive/debug-only`);
    }
    if (collection.lowPriorityBehavior === "deferred_minute_batch" && !collection.rollupOutputs.includes("analytics_event_rollup_batches")) {
      findings.push(`${collection.collection} deferred minute batches must write analytics_event_rollup_batches`);
    }
  }

  for (const eventType of ANALYTICS_INGEST_EVENT_TYPES) {
    const rule = MATERIALIZATION_CONTRACT.ingestEventMaterialization[eventType];
    if (!rule) {
      findings.push(`ingest event missing materialization rule: ${eventType}`);
      continue;
    }
    if (rule.dedupeKey !== "session_batch") {
      findings.push(`${eventType} missing session_batch dedupe`);
    }
    if (!rule.outputCollections.includes("analytics_guest_batches") || !rule.outputCollections.includes("behavioral_timeline_facts")) {
      findings.push(`${eventType} missing guest batch or behavioral timeline output`);
    }
    if (rule.priority === "supporting" && rule.lowPriorityBehavior === "not_applicable") {
      findings.push(`${eventType} supporting event lacks low-priority rollup behavior`);
    }
  }

  const unclassifiedCollections = collectionsFromProducerMap().filter((collection) => !getMaterializationClassification(collection));
  if (unclassifiedCollections.length > 0) {
    findings.push(`unclassified producer collections: ${unclassifiedCollections.join(", ")}`);
  }

  const graphLaneIds = new Set(TELEMETRY_DEPENDENCY_GRAPH.map((lane) => lane.id));
  for (const laneId of Object.keys(MATERIALIZATION_CONTRACT.producerCollectionMap) as TelemetryLaneId[]) {
    if (!graphLaneIds.has(laneId)) {
      findings.push(`producer map references unknown telemetry lane: ${laneId}`);
    }
  }

  const eventFacts = getMaterializationClassification("analytics_event_facts");
  if (eventFacts?.lowPriorityBehavior !== "deferred_minute_batch") {
    findings.push("analytics_event_facts must defer non-priority rollups through minute batches");
  }
  const legacy = getMaterializationClassification("legacy_page_duration_events");
  if (legacy?.currentTruth !== false || legacy?.legacyState !== "unknown_legacy") {
    findings.push("legacy page-duration records must be unknown_legacy and not current truth");
  }

  return {
    ok: findings.length === 0,
    findings,
    unclassifiedCollections,
  };
}
