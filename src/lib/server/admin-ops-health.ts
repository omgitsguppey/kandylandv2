import "server-only";

import {
  type AdminOpsHealth,
  type AdminOpsHealthDiagnosticCluster,
  type AdminOpsHealthDiagnosticItem,
  type AdminOpsHealthMaterializerItem,
  type AdminOpsHealthStatus,
} from "@/lib/admin-ops-health";
import {
  buildFirebaseClientRuntimeSnapshot,
  getFirebaseRuntimeWarnings,
} from "@/lib/firebase-runtime";
import { toNumber, toStringValue } from "./admin-analytics-shared";

const STALE_WARN_MS = 1000 * 60 * 60 * 24 * 3;
const STALE_FAIL_MS = 1000 * 60 * 60 * 24 * 14;
const ACTIVE_DIAGNOSTIC_WINDOW_MS = 1000 * 60 * 60;
const RECENT_DIAGNOSTIC_WINDOW_MS = 1000 * 60 * 60 * 4;
const ACTIVE_PIPELINE_WINDOW_MS = 1000 * 60 * 60;
const RECENT_PIPELINE_WINDOW_MS = 1000 * 60 * 60 * 4;

function toTimestampNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    try {
      return Number((value as { toMillis: () => number }).toMillis()) || 0;
    } catch {
      return 0;
    }
  }

  return 0;
}

function getDocData(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
) {
  return (doc.data() as Record<string, unknown> | undefined) ?? {};
}

function readLatestTimestamp(
  docs: Array<FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot>,
  keys: string[],
) {
  return docs.reduce((latest, doc) => {
    const data = getDocData(doc);
    const value = keys.reduce((current, key) => current || toTimestampNumber(data[key]), 0);
    return Math.max(latest, value);
  }, 0);
}

function getMaterializerStatus(nowMs: number, count: number, lastSeenAt: number): AdminOpsHealthStatus {
  if (count <= 0 && lastSeenAt <= 0) {
    return "healthy";
  }

  if (lastSeenAt > 0) {
    const ageMs = Math.max(0, nowMs - lastSeenAt);
    if (ageMs >= STALE_FAIL_MS) {
      return "fail";
    }
    if (ageMs >= STALE_WARN_MS) {
      return "warn";
    }
  }

  return "healthy";
}

function buildMaterializer(input: {
  nowMs: number;
  key: string;
  label: string;
  engine: string;
  count: number;
  lastSeenAt: number;
  detail: string;
}): AdminOpsHealthMaterializerItem {
  const ageMs = input.lastSeenAt > 0 ? Math.max(0, input.nowMs - input.lastSeenAt) : null;
  return {
    key: input.key,
    label: input.label,
    engine: input.engine,
    status: getMaterializerStatus(input.nowMs, input.count, input.lastSeenAt),
    count: input.count,
    lastSeenAt: input.lastSeenAt,
    ageMs,
    detail: input.detail,
  };
}

function readRouteFailureCount(
  pipelineDocs: Array<{
    routeCounts: Record<string, unknown>;
    lastFailureAtMs: number;
    lastRouteName: string;
  }>,
  routeKey: string,
) {
  return pipelineDocs.reduce((sum, entry) => sum + toNumber(entry.routeCounts[routeKey]), 0);
}

function readRouteFailureLastSeenAt(
  pipelineDocs: Array<{
    routeCounts: Record<string, unknown>;
    lastFailureAtMs: number;
    lastRouteName: string;
  }>,
  routeKey: string,
  routeName: string,
) {
  return pipelineDocs.reduce((latest, entry) => {
    const hasRouteFailures = toNumber(entry.routeCounts[routeKey]) > 0;
    const routeMatched = entry.lastRouteName === routeName || entry.lastRouteName === routeKey;
    if (!hasRouteFailures && !routeMatched) {
      return latest;
    }

    return Math.max(latest, entry.lastFailureAtMs);
  }, 0);
}

function buildChannelLabel(channel: string) {
  if (channel === "admin") return "Admin";
  if (channel === "analytics") return "Analytics";
  if (channel === "auth") return "Auth";
  if (channel === "commerce") return "Commerce";
  if (channel === "cron") return "Cron";
  if (channel === "creator_onboarding") return "Creator Onboarding";
  if (channel === "firebase") return "Firebase";
  if (channel === "middleware") return "Middleware";
  if (channel === "notifications") return "Notifications";
  if (channel === "runtime") return "Runtime";
  return channel || "Unknown";
}

function buildDiagnosticPreview(detail: Record<string, unknown>) {
  const entries = Object.entries(detail).slice(0, 2);
  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" | ");
}

function getDiagnosticSuggestedValidator(channel: string, message: string) {
  const normalized = `${channel} ${message}`.toLowerCase();
  if (normalized.includes("auth") || normalized.includes("route") || normalized.includes("permission")) {
    return "npm run check:speed-security";
  }
  if (normalized.includes("cost") || normalized.includes("storage") || normalized.includes("media")) {
    return "npm run check:google-cost";
  }
  if (normalized.includes("telemetry") || normalized.includes("analytics")) {
    return "npm run check:telemetry-parity-score";
  }
  if (normalized.includes("firebase") || normalized.includes("runtime")) {
    return "npm run check:firebase-runtime";
  }
  return "npm run check:admin-debug-control-tower";
}

function buildRouteLabel(routeKey: string) {
  return routeKey
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getNavigationSessionSigningReady() {
  return Boolean(process.env.NAVIGATION_COOKIE_SECRET?.trim());
}

function countDiagnosticsWithinWindow(
  diagnostics: AdminOpsHealthDiagnosticItem[],
  nowMs: number,
  windowMs: number,
  severity: AdminOpsHealthDiagnosticItem["severity"],
) {
  return diagnostics.filter((entry) => entry.severity === severity && entry.timestamp >= nowMs - windowMs).length;
}

function countDiagnosticIssueClustersWithinWindow(
  diagnostics: AdminOpsHealthDiagnosticItem[],
  nowMs: number,
  windowMs: number,
) {
  return new Set(
    diagnostics
      .filter((entry) => entry.timestamp >= nowMs - windowMs)
      .map((entry) => `${entry.channel}|${entry.severity}|${entry.message}`),
  ).size;
}

function buildDiagnosticIssueClustersWithinWindow(
  diagnostics: AdminOpsHealthDiagnosticItem[],
  nowMs: number,
  windowMs: number,
): AdminOpsHealthDiagnosticCluster[] {
  const clusters = diagnostics
    .filter((entry) => entry.timestamp >= nowMs - windowMs)
    .reduce((map, entry) => {
      const fingerprint = `${entry.channel}|${entry.severity}|${entry.message}`;
      const existing = map.get(fingerprint);
      const sourceRouteOrComponent = entry.route || entry.component || entry.channel || "unknown";
      if (existing) {
        existing.count += 1;
        existing.lastSeenAt = Math.max(existing.lastSeenAt, entry.timestamp);
        if (existing.sourceRouteOrComponent === "unknown" && sourceRouteOrComponent !== "unknown") {
          existing.sourceRouteOrComponent = sourceRouteOrComponent;
        }
        return map;
      }

      map.set(fingerprint, {
        id: `diagnostic:${entry.channel}:${entry.severity}:${Math.abs(hashString(entry.message)).toString(36)}`,
        fingerprint,
        severity: entry.severity,
        count: 1,
        lastSeenAt: entry.timestamp,
        source: entry.channel,
        sourceRouteOrComponent,
        message: entry.message,
        suggestedValidator: getDiagnosticSuggestedValidator(entry.channel, entry.message),
      });
      return map;
    }, new Map<string, AdminOpsHealthDiagnosticCluster>());

  return Array.from(clusters.values())
    .sort((left, right) => (
      severityRank(right.severity) - severityRank(left.severity)
      || right.count - left.count
      || right.lastSeenAt - left.lastSeenAt
    ))
    .slice(0, 6);
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return hash;
}

function severityRank(severity: AdminOpsHealthDiagnosticItem["severity"]) {
  if (severity === "error") return 3;
  if (severity === "warn") return 2;
  return 1;
}

function getPipelineStatus(nowMs: number, lastFailureAt: number): AdminOpsHealthStatus {
  if (lastFailureAt <= 0) {
    return "healthy";
  }

  const ageMs = Math.max(0, nowMs - lastFailureAt);
  if (ageMs <= ACTIVE_PIPELINE_WINDOW_MS) {
    return "fail";
  }
  if (ageMs <= RECENT_PIPELINE_WINDOW_MS) {
    return "warn";
  }

  return "healthy";
}

export function buildAdminOpsHealth(input: {
  nowMs?: number;
  diagnosticsDocs: Array<FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot>;
  pipelineDocs: Array<FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot>;
  eventStatsDocs: Array<FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot>;
  taskRollupDocs: Array<FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot>;
  guestBatchDocs: Array<FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot>;
  securityEventDocs: Array<FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot>;
  watchSessionDocs?: Array<FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot>;
  watchAssetDocs?: Array<FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot>;
  exportStatusDocs?: Array<FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot>;
  commerceSummaryDoc?: FirebaseFirestore.DocumentSnapshot | null;
}) : AdminOpsHealth {
  const nowMs = input.nowMs ?? Date.now();
  const runtimeSnapshot = buildFirebaseClientRuntimeSnapshot();
  const runtimeWarnings = getFirebaseRuntimeWarnings();

  const diagnostics = input.diagnosticsDocs.map((doc) => {
    const data = getDocData(doc);
    const detail = (data.detail as Record<string, unknown> | undefined) ?? {};
    return {
      id: doc.id,
      channel: toStringValue(data.channel) || "runtime",
      severity: (toStringValue(data.severity) || "warn") as AdminOpsHealthDiagnosticItem["severity"],
      message: toStringValue(data.message) || "Unknown diagnostic",
      timestamp: toNumber(data.createdAtMs) || toTimestampNumber(data.createdAt),
      detailPreview: buildDiagnosticPreview(detail),
      route: toStringValue(data.route ?? data.routeName ?? data.path ?? detail.route ?? detail.routeName ?? detail.path),
      component: toStringValue(data.component ?? detail.component),
    };
  }).sort((left, right) => right.timestamp - left.timestamp);

  const diagnosticsByChannel = diagnostics.reduce((map, entry) => {
    const current = map.get(entry.channel) || {
      key: entry.channel,
      label: buildChannelLabel(entry.channel),
      count: 0,
      errorCount: 0,
      warnCount: 0,
      infoCount: 0,
      activeErrorCount: 0,
      activeWarnCount: 0,
      recentErrorCount: 0,
      recentWarnCount: 0,
      lastSeenAt: 0,
    };
    current.count += 1;
    current.lastSeenAt = Math.max(current.lastSeenAt, entry.timestamp);
    if (entry.severity === "error") current.errorCount += 1;
    else if (entry.severity === "warn") current.warnCount += 1;
    else current.infoCount += 1;
    if (entry.timestamp >= nowMs - ACTIVE_DIAGNOSTIC_WINDOW_MS) {
      if (entry.severity === "error") current.activeErrorCount += 1;
      if (entry.severity === "warn") current.activeWarnCount += 1;
    }
    if (entry.timestamp >= nowMs - RECENT_DIAGNOSTIC_WINDOW_MS) {
      if (entry.severity === "error") current.recentErrorCount += 1;
      if (entry.severity === "warn") current.recentWarnCount += 1;
    }
    map.set(entry.channel, current);
    return map;
  }, new Map<string, {
    key: string;
    label: string;
    count: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
    activeErrorCount: number;
    activeWarnCount: number;
    recentErrorCount: number;
    recentWarnCount: number;
    lastSeenAt: number;
  }>());

  const pipelineDocs = input.pipelineDocs.map((doc) => {
    const data = getDocData(doc);
    const routeCounts = ((data.routeCounts as Record<string, unknown> | undefined) ?? {});
    return {
      failureCount: toNumber(data.failureCount),
      lastFailureAtMs: toNumber(data.lastFailureAtMs),
      lastRouteName: toStringValue(data.lastRouteName),
      lastErrorMessage: toStringValue(data.lastErrorMessage),
      routeCounts,
    };
  });

  const routeCountMap = pipelineDocs.reduce((map, entry) => {
    Object.entries(entry.routeCounts).forEach(([routeKey, count]) => {
      map.set(routeKey, (map.get(routeKey) || 0) + toNumber(count));
    });
    return map;
  }, new Map<string, number>());

  const pipelineRoutes = Array.from(routeCountMap.entries())
    .map(([routeKey, count]) => ({
      routeKey,
      label: buildRouteLabel(routeKey),
      count,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 8);

  const pipelineFailureCount = pipelineDocs.reduce((sum, entry) => sum + entry.failureCount, 0);
  const activePipelineFailureCount = pipelineDocs
    .filter((entry) => entry.lastFailureAtMs > 0 && entry.lastFailureAtMs >= nowMs - ACTIVE_PIPELINE_WINDOW_MS)
    .reduce((sum, entry) => sum + entry.failureCount, 0);
  const recentPipelineFailureCount = pipelineDocs
    .filter((entry) => entry.lastFailureAtMs > 0 && entry.lastFailureAtMs >= nowMs - RECENT_PIPELINE_WINDOW_MS)
    .reduce((sum, entry) => sum + entry.failureCount, 0);
  const lastPipelineEntry = [...pipelineDocs].sort((left, right) => right.lastFailureAtMs - left.lastFailureAtMs)[0];
  const guestIngestFailureCount = readRouteFailureCount(pipelineDocs, "analytics_ingest");
  const guestIngestFailureLastSeenAt = readRouteFailureLastSeenAt(
    pipelineDocs,
    "analytics_ingest",
    "analytics/ingest",
  );

  const commerceSummaryData = input.commerceSummaryDoc?.exists ? getDocData(input.commerceSummaryDoc) : {};
  const commerceCount = toNumber(commerceSummaryData.transactionCount) || toNumber(commerceSummaryData.purchaseCount);
  const commerceLastSeenAt = toNumber(commerceSummaryData.lastTransactionAt) || toTimestampNumber(commerceSummaryData.updatedAt);
  const guestBatchCount = input.guestBatchDocs.length;
  const guestBatchLastSeenAt = readLatestTimestamp(input.guestBatchDocs, ["receivedAtMs", "createdAt", "updatedAt"]);
  const watchSessionDocs = input.watchSessionDocs ?? [];
  const watchAssetDocs = input.watchAssetDocs ?? [];
  const watchSessionCount = watchSessionDocs.length;
  const watchSessionLastSeenAt = readLatestTimestamp(watchSessionDocs, ["lastSeenAtMs", "updatedAt", "createdAt"]);
  const watchAssetCount = watchAssetDocs.length;
  const watchAssetLastSeenAt = readLatestTimestamp(watchAssetDocs, ["lastSeenAtMs", "updatedAt", "createdAt"]);
  const bigQueryExportData = (input.exportStatusDocs ?? [])
    .map((doc) => getDocData(doc))
    .find((data) => toStringValue(data.writer).includes("BigQueryExport") || toStringValue(data.datasetId) || toStringValue(data.tableId))
    ?? {};
  const bigQueryLastExportedAt = toNumber(bigQueryExportData.lastExportedAtMs) || toTimestampNumber(bigQueryExportData.updatedAt);
  const bigQueryLastFailedAt = toNumber(bigQueryExportData.lastFailedAtMs);
  const bigQueryStatusValue = toStringValue(bigQueryExportData.status);
  const bigQueryExportStatus: AdminOpsHealthStatus = Object.keys(bigQueryExportData).length === 0
    ? "warn"
    : bigQueryStatusValue === "fail" && bigQueryLastFailedAt > bigQueryLastExportedAt
      ? (bigQueryLastFailedAt >= nowMs - STALE_FAIL_MS ? "fail" : "warn")
      : getMaterializerStatus(nowMs, toNumber(bigQueryExportData.successCount), bigQueryLastExportedAt);
  const bigQueryExportDetail = Object.keys(bigQueryExportData).length === 0
    ? "BigQuery raw-event export is configured but no exporter heartbeat is loaded, so warehouse delivery is not evidenced."
    : bigQueryExportStatus === "fail"
      ? `BigQuery raw-event export last failed: ${toStringValue(bigQueryExportData.lastErrorMessage) || "no error detail recorded"}.`
      : "BigQuery raw-event export heartbeat confirms first-party analytics facts are reaching the warehouse lane.";
  const guestBatchesStatus: AdminOpsHealthStatus = guestBatchCount > 0
    ? getMaterializerStatus(nowMs, guestBatchCount, guestBatchLastSeenAt)
    : guestIngestFailureCount > 0
      ? (guestIngestFailureLastSeenAt && nowMs - guestIngestFailureLastSeenAt >= STALE_FAIL_MS ? "fail" : "warn")
      : "healthy";
  const guestBatchesDetail = guestBatchCount > 0
    ? "Guest interaction batches are the canonical raw source for anonymous browse telemetry."
    : guestIngestFailureCount > 0
      ? "No recent guest batches landed and the anonymous ingest route has recorded failures. Check guest tracking and route diagnostics."
      : "No recent anonymous traffic landed in the current window, but the guest ingest pipeline has no recorded failures.";

  const materializers = [
    buildMaterializer({
      nowMs,
      key: "analytics_event_stats",
      label: "Event Stats",
      engine: "functions",
      count: input.eventStatsDocs.length,
      lastSeenAt: readLatestTimestamp(input.eventStatsDocs, ["lastSeenAt", "updatedAt"]),
      detail: "Functions keep catalog event counters and last-seen timestamps current.",
    }),
    buildMaterializer({
      nowMs,
      key: "analytics_task_rollup",
      label: "Task Rollups",
      engine: "functions",
      count: input.taskRollupDocs.length,
      lastSeenAt: readLatestTimestamp(input.taskRollupDocs, ["lastEventAt", "updatedAt"]),
      detail: "Task lifecycle materializers summarize assignment, progress, and reward outcomes.",
    }),
    buildMaterializer({
      nowMs,
      key: "analytics_commerce_rollup",
      label: "Commerce Rollup",
      engine: "functions",
      count: commerceCount,
      lastSeenAt: commerceLastSeenAt,
      detail: "Commerce rollups mirror completed transactions into revenue, unlock, and bundle summaries.",
    }),
    buildMaterializer({
      nowMs,
      key: "analytics_watch_sessions",
      label: "Watch Sessions",
      engine: "route",
      count: watchSessionCount,
      lastSeenAt: watchSessionLastSeenAt,
      detail: "Canonical viewer watch sessions capture per-session watch accuracy for unwrapped drops.",
    }),
    buildMaterializer({
      nowMs,
      key: "analytics_watch_assets",
      label: "Watch Assets",
      engine: "route",
      count: watchAssetCount,
      lastSeenAt: watchAssetLastSeenAt,
      detail: "Per-asset watch snapshots back session-level viewer analytics with asset completion and load details.",
    }),
    {
      key: "analytics_guest_batches",
      label: "Guest Batches",
      engine: "route",
      status: guestBatchesStatus,
      count: guestBatchCount,
      lastSeenAt: guestBatchLastSeenAt,
      detail: guestBatchesDetail,
    },
    buildMaterializer({
      nowMs,
      key: "security_events",
      label: "Security Events",
      engine: "route",
      count: input.securityEventDocs.length,
      lastSeenAt: readLatestTimestamp(input.securityEventDocs, ["timestamp", "updatedAt"]),
      detail: "Security attempts feed admin alerting, user violation history, and analytics parity checks.",
    }),
    buildMaterializer({
      nowMs,
      key: "server_diagnostics",
      label: "Server Diagnostics",
      engine: "route",
      count: input.diagnosticsDocs.length,
      lastSeenAt: readLatestTimestamp(input.diagnosticsDocs, ["createdAtMs", "createdAt"]),
      detail: "Route-level diagnostics surface ingest, auth, runtime, and middleware failures for debugging.",
    }),
    buildMaterializer({
      nowMs,
      key: "analytics_pipeline_daily",
      label: "Pipeline Health",
      engine: "route",
      count: pipelineFailureCount,
      lastSeenAt: lastPipelineEntry?.lastFailureAtMs || 0,
      detail: "Pipeline health captures route failures that would otherwise disappear behind soft analytics responses.",
    }),
    {
      key: "analytics_bigquery_raw_events",
      label: "BigQuery Raw Events",
      engine: "functions",
      status: bigQueryExportStatus,
      count: toNumber(bigQueryExportData.successCount),
      lastSeenAt: bigQueryLastExportedAt,
      ageMs: bigQueryLastExportedAt > 0 ? Math.max(0, nowMs - bigQueryLastExportedAt) : null,
      detail: bigQueryExportDetail,
    },
  ];

  const diagnosticsErrorCount = diagnostics.filter((entry) => entry.severity === "error").length;
  const diagnosticsWarnCount = diagnostics.filter((entry) => entry.severity === "warn").length;
  const activeDiagnosticsErrorCount = countDiagnosticsWithinWindow(diagnostics, nowMs, ACTIVE_DIAGNOSTIC_WINDOW_MS, "error");
  const activeDiagnosticsWarnCount = countDiagnosticsWithinWindow(diagnostics, nowMs, ACTIVE_DIAGNOSTIC_WINDOW_MS, "warn");
  const recentDiagnosticsErrorCount = countDiagnosticsWithinWindow(diagnostics, nowMs, RECENT_DIAGNOSTIC_WINDOW_MS, "error");
  const recentDiagnosticsWarnCount = countDiagnosticsWithinWindow(diagnostics, nowMs, RECENT_DIAGNOSTIC_WINDOW_MS, "warn");
  const activeDiagnosticIssueClusterCount = countDiagnosticIssueClustersWithinWindow(diagnostics, nowMs, ACTIVE_DIAGNOSTIC_WINDOW_MS);
  const recentDiagnosticIssueClusterCount = countDiagnosticIssueClustersWithinWindow(diagnostics, nowMs, RECENT_DIAGNOSTIC_WINDOW_MS);
  const activeDiagnosticIssueClusters = buildDiagnosticIssueClustersWithinWindow(diagnostics, nowMs, ACTIVE_DIAGNOSTIC_WINDOW_MS);
  const pipelineStatus = getPipelineStatus(nowMs, lastPipelineEntry?.lastFailureAtMs || 0);
  const materializerSummary = {
    total: materializers.length,
    healthy: materializers.filter((item) => item.status === "healthy").length,
    warn: materializers.filter((item) => item.status === "warn").length,
    fail: materializers.filter((item) => item.status === "fail").length,
  };

  let canonicalStatus: "Live" | "Degraded" | "Partial" | "Unavailable" = "Live";
  let canonicalReason: string | undefined = undefined;

  if (pipelineStatus === "fail" || materializerSummary.fail > 0 || runtimeWarnings.length > 2) {
    canonicalStatus = "Degraded";
    canonicalReason = `Pipeline failing, ${materializerSummary.fail} writers failed, or critical runtime warnings.`;
  } else if (pipelineStatus === "warn" || materializerSummary.warn > 0 || activeDiagnosticIssueClusterCount > 5) {
    canonicalStatus = "Partial";
    canonicalReason = `Pipeline degraded, ${materializerSummary.warn} writers warning, or elevated active issues.`;
  } else if (runtimeWarnings.length > 0) {
    canonicalStatus = "Partial";
    canonicalReason = `Minor runtime configuration warnings detected.`;
  } else if (activeDiagnosticIssueClusterCount > 0) {
    canonicalStatus = "Live";
    canonicalReason = `Live with ${activeDiagnosticIssueClusterCount} active issue clusters.`;
  }

  // ---------------------------------------------------------------------------
  // Canonical Ops Health Score (0–100)
  // ---------------------------------------------------------------------------
  // This is the single source of truth for the dashboard "Score" pill and the
  // AI debug assistant.  It is computed from the same signals that determine
  // canonicalStatus, materializerSummary, and active diagnostics.
  // ---------------------------------------------------------------------------
  let score = 100;

  // Pipeline penalties
  if (pipelineStatus === "fail") score -= 30;
  else if (pipelineStatus === "warn") score -= 15;

  // Materializer penalties (per writer)
  score -= materializerSummary.fail * 10;
  score -= materializerSummary.warn * 5;

  // Active diagnostic penalties (capped at -20)
  score -= Math.min(20, activeDiagnosticsErrorCount * 2 + activeDiagnosticsWarnCount);

  // Runtime warning penalties (capped at -15)
  score -= Math.min(15, runtimeWarnings.length * 5);

  const scoreBeforeStatusCeiling = score;

  // Enforce canonical status ceiling to prevent false-green.
  if (canonicalStatus === "Degraded") score = Math.min(score, 40);
  else if (canonicalStatus === "Partial") score = Math.min(score, 80);

  score = Math.max(0, Math.min(100, score));

  const scorePenalties = [
    pipelineStatus === "fail"
      ? {
        id: "pipeline-active-failures",
        label: "Active route pipeline failures",
        points: 30,
        source: "opsHealth.pipeline",
        truthState: "failed" as const,
      }
      : pipelineStatus === "warn"
        ? {
          id: "pipeline-recent-failures",
          label: "Recent route pipeline failures",
          points: 15,
          source: "opsHealth.pipeline",
          truthState: "degraded" as const,
        }
        : null,
    materializerSummary.fail > 0
      ? {
        id: "writer-failures",
        label: `${materializerSummary.fail} downstream writer failure${materializerSummary.fail === 1 ? "" : "s"}`,
        points: materializerSummary.fail * 10,
        source: "opsHealth.materializers",
        truthState: "failed" as const,
      }
      : null,
    materializerSummary.warn > 0
      ? {
        id: "writer-warnings",
        label: `${materializerSummary.warn} downstream writer warning${materializerSummary.warn === 1 ? "" : "s"}`,
        points: materializerSummary.warn * 5,
        source: "opsHealth.materializers",
        truthState: "degraded" as const,
      }
      : null,
    activeDiagnosticsErrorCount > 0 || activeDiagnosticsWarnCount > 0
      ? {
        id: "active-diagnostics",
        label: `${activeDiagnosticsErrorCount + activeDiagnosticsWarnCount} active diagnostic${activeDiagnosticsErrorCount + activeDiagnosticsWarnCount === 1 ? "" : "s"} across ${activeDiagnosticIssueClusterCount} cluster${activeDiagnosticIssueClusterCount === 1 ? "" : "s"}`,
        points: Math.min(20, activeDiagnosticsErrorCount * 2 + activeDiagnosticsWarnCount),
        source: "opsHealth.diagnostics",
        truthState: activeDiagnosticsErrorCount > 0 ? "failed" as const : "degraded" as const,
      }
      : null,
    runtimeWarnings.length > 0
      ? {
        id: "runtime-warnings",
        label: `${runtimeWarnings.length} runtime warning${runtimeWarnings.length === 1 ? "" : "s"}`,
        points: Math.min(15, runtimeWarnings.length * 5),
        source: "opsHealth.runtime",
        truthState: runtimeWarnings.length > 2 ? "failed" as const : "degraded" as const,
      }
      : null,
    scoreBeforeStatusCeiling > score
      ? {
        id: "canonical-status-ceiling",
        label: `${canonicalStatus} status caps the health score`,
        points: scoreBeforeStatusCeiling - score,
        source: "opsHealth.canonicalState",
        truthState: canonicalStatus === "Degraded" ? "failed" as const : "degraded" as const,
      }
      : null,
  ].filter((penalty): penalty is {
    id: string;
    label: string;
    points: number;
    source: string;
    truthState: "failed" | "degraded";
  } => penalty !== null)
    .filter((penalty) => penalty.points > 0)
    .sort((left, right) => right.points - left.points)
    .slice(0, 3);

  return {
    score,
    scorePenalties,
    canonicalState: {
      status: canonicalStatus,
      reason: canonicalReason,
    },
    runtime: {
      gaPropertyConfigured: Boolean(process.env.GA_PROPERTY_ID?.trim()),
      vapidConfigured: Boolean(runtimeSnapshot.vapidKey),
      databaseUrlConfigured: Boolean(runtimeSnapshot.databaseURL),
      projectId: runtimeSnapshot.projectId || "",
      navigationSessionSigningReady: getNavigationSessionSigningReady(),
      warnings: runtimeWarnings,
    },
    diagnostics: {
      total: diagnostics.length,
      errorCount: diagnosticsErrorCount,
      warnCount: diagnosticsWarnCount,
      infoCount: diagnostics.filter((entry) => entry.severity === "info").length,
      activeErrorCount: activeDiagnosticsErrorCount,
      activeWarnCount: activeDiagnosticsWarnCount,
      recentErrorCount: recentDiagnosticsErrorCount,
      recentWarnCount: recentDiagnosticsWarnCount,
      activeIssueClusterCount: activeDiagnosticIssueClusterCount,
      recentIssueClusterCount: recentDiagnosticIssueClusterCount,
      activeWindowMs: ACTIVE_DIAGNOSTIC_WINDOW_MS,
      recentWindowMs: RECENT_DIAGNOSTIC_WINDOW_MS,
      lastDiagnosticAt: diagnostics[0]?.timestamp || 0,
      channels: Array.from(diagnosticsByChannel.values()).sort((left, right) => (
        (right.activeErrorCount + right.activeWarnCount) - (left.activeErrorCount + left.activeWarnCount)
        || (right.recentErrorCount + right.recentWarnCount) - (left.recentErrorCount + left.recentWarnCount)
        || right.count - left.count
      )),
      recent: diagnostics.slice(0, 10),
      activeIssueClusters: activeDiagnosticIssueClusters,
    },
    pipeline: {
      status: pipelineStatus,
      failureCount: pipelineFailureCount,
      activeFailureCount: activePipelineFailureCount,
      recentFailureCount: recentPipelineFailureCount,
      sampleFailureCount: pipelineFailureCount,
      lastFailureAt: lastPipelineEntry?.lastFailureAtMs || 0,
      lastRouteName: lastPipelineEntry?.lastRouteName || "",
      lastErrorMessage: lastPipelineEntry?.lastErrorMessage || "",
      activeWindowMs: ACTIVE_PIPELINE_WINDOW_MS,
      recentWindowMs: RECENT_PIPELINE_WINDOW_MS,
      routes: pipelineRoutes,
    },
    materializers,
    materializerSummary,
  };
}
