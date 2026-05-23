import "server-only";

import { summarizeRouteRuntimeHealth } from "@/lib/route-runtime-health";
import { buildServerAdminModuleVerification } from "@/lib/server/admin-source-verification";
import { listAdminMetricSnapshotDebugMetadata } from "@/lib/server/admin-analytics-snapshots";
import { getBehavioralSnapshotStatus } from "@/lib/server/behavioral-intelligence";
import { buildBigQueryExportEvidenceState, type BigQueryExportEnv } from "@/lib/analytics/bigquery-export-contract";
import { buildExternalAnalyticsTruthState } from "@/lib/analytics/external-analytics-truth";
import { buildAdminTelemetryHealth } from "@/lib/server/admin-telemetry-health";
import { buildEventTranslationBridgeReport } from "@/lib/analytics/event-translation-bridge";
import { buildDebugPanelTrackingSummary } from "@/lib/debug/debug-panel-tracking-summary";
import { buildIdentityHandoffDebugSummary } from "@/lib/server/admin-debug/identity-handoff-summary";
import { buildEventEnvelopeDebugSummary } from "@/lib/server/admin-debug/event-envelope-summary";
import { buildLegacyRecoveryDebugSummary } from "@/lib/server/admin-debug/legacy-recovery-summary";
import { listRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import {
  listNotificationDispatchOutcomes,
  listQueueJobHeartbeats,
  listRuntimeWarnings,
} from "@/lib/server/runtime-warning-store";
import { QUEUE_RUNTIME_WARNING_CODES } from "../../../../shared/runtime/runtime-warning-contract";

import {
  ADMIN_DEBUG_DEFAULT_SECTION,
  ADMIN_DEBUG_INITIAL_LOAD_COST_GUARD,
  ADMIN_DEBUG_QUEUE_HEARTBEAT_LIMIT,
  readAdminDebugSummaryPayloadStatus,
} from "./truth-state";

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toTimestampNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return toNumber(value.toMillis());
  }
  return 0;
}

export async function buildAdminDebugSummaryPayload(input: {
  nowMs: number;
  infrastructure: unknown;
}) {
  const { nowMs, infrastructure } = input;
  const summaryPayloadStatus = readAdminDebugSummaryPayloadStatus();
  const [
    routeRuntimeHealth,
    runtimeWarnings,
    queueJobHeartbeats,
    notificationDispatchOutcomes,
    behavioralSnapshotStatus,
    adminMetricSnapshots,
  ] = await Promise.all([
    listRouteRuntimeHealth(),
    listRuntimeWarnings(40),
    listQueueJobHeartbeats(ADMIN_DEBUG_QUEUE_HEARTBEAT_LIMIT),
    listNotificationDispatchOutcomes(40),
    getBehavioralSnapshotStatus(),
    listAdminMetricSnapshotDebugMetadata({ limit: 60 }),
  ]);
  const routeRuntimeHealthSummary = summarizeRouteRuntimeHealth(routeRuntimeHealth);
  const telemetryHealth = buildAdminTelemetryHealth({
    nowMs,
    routeRuntimeHealth: routeRuntimeHealth as Array<Record<string, unknown>>,
    runtimeWarnings: runtimeWarnings as Array<Record<string, unknown>>,
    adminMetricSnapshots: adminMetricSnapshots as Array<Record<string, unknown>>,
    behavioralSnapshotStatus: behavioralSnapshotStatus as Record<string, unknown> | null,
    externalAnalyticsState: buildExternalAnalyticsTruthState({
      ga4ClientCodePresent: true,
      ga4ClientMeasurementIdPresent: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
      ga4ServerPropertyIdPresent: Boolean(process.env.GA_PROPERTY_ID),
      ga4ServerDataApiDependencyPresent: true,
      posthogClientCodePresent: true,
      posthogKeyPresent: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
      explicitRefreshRequired: true,
    }),
    bigQueryEvidenceState: buildBigQueryExportEvidenceState({
      env: process.env as BigQueryExportEnv,
      firstPartySummariesActive: adminMetricSnapshots.length > 0,
    }),
  });
  const runtimeWarningSummary = runtimeWarnings.reduce<{
    total: number;
    failed: number;
    degraded: number;
    fallback: number;
    legacyAdapterUses: number;
    queueDriftWarnings: number;
  }>((summary, entry) => {
    const code = toStringValue(entry.code);
    return {
      total: summary.total + 1,
      failed: summary.failed + (toStringValue(entry.status) === "failed" ? 1 : 0),
      degraded: summary.degraded + (toStringValue(entry.status) === "degraded" ? 1 : 0),
      fallback: summary.fallback + (toStringValue(entry.status) === "fallback" ? 1 : 0),
      legacyAdapterUses: summary.legacyAdapterUses + (code === QUEUE_RUNTIME_WARNING_CODES.legacyAdapterInvoked ? 1 : 0),
      queueDriftWarnings: summary.queueDriftWarnings + (code === QUEUE_RUNTIME_WARNING_CODES.queueMembershipDrift ? 1 : 0),
    };
  }, {
    total: 0,
    failed: 0,
    degraded: 0,
    fallback: 0,
    legacyAdapterUses: 0,
    queueDriftWarnings: 0,
  });
  const queueJobHeartbeatSummary = queueJobHeartbeats.reduce((summary, entry) => {
    const lastTouch = Math.max(
      toNumber(entry.completedAt),
      toNumber(entry.startedAt),
      toNumber(entry.updatedAt),
    );
    const stale = lastTouch <= 0 || (toNumber(entry.staleAfterMs) > 0 && nowMs - lastTouch > toNumber(entry.staleAfterMs));
    return {
      total: summary.total + 1,
      stale: summary.stale + (stale ? 1 : 0),
      failed: summary.failed + (entry.status === "failed" ? 1 : 0),
      running: summary.running + (entry.status === "running" ? 1 : 0),
    };
  }, {
    total: 0,
    stale: 0,
    failed: 0,
    running: 0,
  });
  const deferredSections = [
    "creator subscriptions",
    "creator requests",
    "creator bookings",
    "creator threads/messages",
    "transactions",
    "onboarding history",
    "orchestration details",
    "analytics truth drilldowns",
  ];
  const costControls = {
    guard: ADMIN_DEBUG_INITIAL_LOAD_COST_GUARD,
    defaultSection: ADMIN_DEBUG_DEFAULT_SECTION,
    fullDebugRequiresSection: "all",
    queueHeartbeatLimit: ADMIN_DEBUG_QUEUE_HEARTBEAT_LIMIT,
    status: "bounded_initial_summary",
    deferredSections,
  };
  const identityHandoff = buildIdentityHandoffDebugSummary();
  const eventEnvelope = buildEventEnvelopeDebugSummary();
  const eventTranslationBridge = buildEventTranslationBridgeReport({
    generatedAtUtc: new Date(nowMs).toISOString(),
  });
  const legacyRecovery = buildLegacyRecoveryDebugSummary();
  const trackingSummary = buildDebugPanelTrackingSummary({
    identityHandoff,
    eventEnvelope,
    eventTranslationBridge,
    legacyRecovery,
    telemetryHealth,
    behavioralSnapshotStatus,
    routeRuntimeHealthSummary,
    runtimeWarningSummary,
    costControls,
  });

  return {
    success: true,
    section: summaryPayloadStatus.defaultSection,
    generatedAtUtc: new Date(nowMs).toISOString(),
    sourceFreshness: "stale_known",
    truthState: summaryPayloadStatus.truthState,
    deferredSections,
    routeRuntimeHealth,
    routeRuntimeHealthSummary,
    runtimeWarnings,
    runtimeWarningSummary,
    queueJobHeartbeats,
    queueJobHeartbeatSummary,
    notificationDispatchOutcomes,
    behavioralSnapshotStatus,
    adminMetricSnapshots,
    telemetryHealth,
    identityHandoff,
    eventEnvelope,
    eventTranslationBridge,
    legacyRecovery,
    trackingSummary,
    costControls,
    verification: buildServerAdminModuleVerification({
      module: "admin_debug_summary",
      canonicalSource: "route_runtime_health+runtime_warning_records+admin_metric_snapshots",
      fallbackSource: null,
      freshnessTimestamp: Math.max(
        routeRuntimeHealth.reduce((latest, item) => Math.max(latest, Number(item.updatedAtMs) || 0), 0),
        adminMetricSnapshots.reduce((latest, item) => Math.max(latest, toTimestampNumber(item.generatedAt)), 0),
      ),
      degradedReason: routeRuntimeHealthSummary.fail > 0
        ? `${routeRuntimeHealthSummary.fail} route runtime checks are failed`
        : runtimeWarningSummary.failed > 0
          ? `${runtimeWarningSummary.failed} runtime warnings are failed`
          : deferredSections.length > 0
            ? "High-cost debug sections are deferred until explicit drilldown."
            : null,
      status: routeRuntimeHealthSummary.fail > 0
        ? "failed"
        : routeRuntimeHealthSummary.warn > 0 || runtimeWarningSummary.failed > 0 || deferredSections.length > 0
          ? "degraded"
          : routeRuntimeHealthSummary.stale > 0
            ? "stale"
            : "live",
      countComposition: {
        routeWarnings: routeRuntimeHealthSummary.warn,
        routeFailures: routeRuntimeHealthSummary.fail,
        runtimeWarnings: runtimeWarningSummary.total,
        deferredSections: deferredSections.length,
      },
    }),
    infrastructure,
  };
}
