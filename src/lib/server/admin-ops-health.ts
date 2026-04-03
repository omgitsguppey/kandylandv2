import "server-only";

import {
  type AdminOpsHealth,
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
    return "warn";
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
  return {
    key: input.key,
    label: input.label,
    engine: input.engine,
    status: getMaterializerStatus(input.nowMs, input.count, input.lastSeenAt),
    count: input.count,
    lastSeenAt: input.lastSeenAt,
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

function buildRouteLabel(routeKey: string) {
  return routeKey
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getNavigationSessionSigningReady() {
  return Boolean(
    process.env.NAVIGATION_COOKIE_SECRET?.trim()
    || process.env.FIREBASE_PRIVATE_KEY?.trim(),
  );
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
  commerceSummaryDoc?: FirebaseFirestore.DocumentSnapshot | null;
}) : AdminOpsHealth {
  const nowMs = input.nowMs ?? Date.now();
  const runtimeSnapshot = buildFirebaseClientRuntimeSnapshot();
  const runtimeWarnings = getFirebaseRuntimeWarnings();

  const diagnostics = input.diagnosticsDocs.map((doc) => {
    const data = getDocData(doc);
    return {
      id: doc.id,
      channel: toStringValue(data.channel) || "runtime",
      severity: (toStringValue(data.severity) || "warn") as AdminOpsHealthDiagnosticItem["severity"],
      message: toStringValue(data.message) || "Unknown diagnostic",
      timestamp: toNumber(data.createdAtMs) || toTimestampNumber(data.createdAt),
      detailPreview: buildDiagnosticPreview((data.detail as Record<string, unknown> | undefined) ?? {}),
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
      lastSeenAt: 0,
    };
    current.count += 1;
    current.lastSeenAt = Math.max(current.lastSeenAt, entry.timestamp);
    if (entry.severity === "error") current.errorCount += 1;
    else if (entry.severity === "warn") current.warnCount += 1;
    else current.infoCount += 1;
    map.set(entry.channel, current);
    return map;
  }, new Map<string, {
    key: string;
    label: string;
    count: number;
    errorCount: number;
    warnCount: number;
    infoCount: number;
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
  const lastPipelineEntry = pipelineDocs.sort((left, right) => right.lastFailureAtMs - left.lastFailureAtMs)[0];
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
  ];

  const warnMaterializers = materializers.filter((item) => item.status === "warn").length;
  const failMaterializers = materializers.filter((item) => item.status === "fail").length;
  const diagnosticsErrorCount = diagnostics.filter((entry) => entry.severity === "error").length;
  const diagnosticsWarnCount = diagnostics.filter((entry) => entry.severity === "warn").length;

  const score = Math.max(
    0,
    Math.min(
      100,
      100
        - (runtimeWarnings.length * 6)
        - (warnMaterializers * 5)
        - (failMaterializers * 14)
        - Math.min(18, pipelineFailureCount * 3)
        - Math.min(15, diagnosticsErrorCount * 2 + diagnosticsWarnCount),
    ),
  );

  return {
    score,
    runtime: {
      gaPropertyConfigured: Boolean(process.env.GA_PROPERTY_ID?.trim()),
      appCheckConfigured: runtimeSnapshot.appCheckConfigured,
      appCheckRequired: runtimeSnapshot.appCheckRequired,
      recaptchaConfigured: Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY?.trim()),
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
      lastDiagnosticAt: diagnostics[0]?.timestamp || 0,
      channels: Array.from(diagnosticsByChannel.values()).sort((left, right) => right.count - left.count),
      recent: diagnostics.slice(0, 10),
    },
    pipeline: {
      failureCount: pipelineFailureCount,
      lastFailureAt: lastPipelineEntry?.lastFailureAtMs || 0,
      lastRouteName: lastPipelineEntry?.lastRouteName || "",
      lastErrorMessage: lastPipelineEntry?.lastErrorMessage || "",
      routes: pipelineRoutes,
    },
    materializers,
  };
}
