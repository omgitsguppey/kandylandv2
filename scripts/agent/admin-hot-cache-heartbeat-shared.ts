import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

import { ADMIN_HEARTBEAT_INTERVAL_SECONDS } from "../../src/lib/admin/admin-heartbeat-contract";
import { ADMIN_HOT_CACHE_SNAPSHOTS } from "../../src/lib/admin/admin-hot-cache-contract";
import { buildAdminHotCacheCostEstimate } from "../../src/lib/admin/admin-hot-cache-cost-estimator";
import { ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION, validateAdminRealtimeMigrationEntries } from "../../src/lib/admin/admin-realtime-to-hot-cache-migration";

export const repoRoot = process.cwd();

export function read(path: string) {
  return readFileSync(join(repoRoot, path), "utf-8");
}

export function writeJson(path: string, value: unknown) {
  const target = join(repoRoot, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeMarkdown(path: string, lines: string[]) {
  const target = join(repoRoot, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${lines.join("\n")}\n`);
}

export function buildAdminHotCacheHeartbeatReport() {
  const overviewRoute = read("src/app/api/admin/overview/route.ts");
  const overviewHook = read("src/hooks/useAdminOverviewRealtime.ts");
  const analyticsRealtime = existsSync(join(repoRoot, "src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts"))
    ? read("src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts")
    : "";
  const debugRealtime = existsSync(join(repoRoot, "src/app/admin/debug/hooks/useAdminDebugRealtime.ts"))
    ? read("src/app/admin/debug/hooks/useAdminDebugRealtime.ts")
    : "";
  const costEstimate = buildAdminHotCacheCostEstimate();
  const onSnapshotBefore = 4 + 4 + 1;
  const onSnapshotAfterDefaultAdminOverview = (overviewHook.match(/onSnapshot/g) ?? []).length;
  const forceNoStoreBefore = 1;
  const forceNoStoreAfter = overviewRoute.includes('fetchCache = "force-no-store"') ? 1 : 0;
  const dynamicRoutesBefore = 1;
  const dynamicRoutesAfter = overviewRoute.includes('dynamic = "force-dynamic"') ? 1 : 0;

  return {
    adminSurfacesScanned: [
      "admin_overview",
      "admin_analytics",
      "admin_debug",
      "admin_users",
      "admin_roster",
      "admin_queue",
      "admin_settings",
      "admin_creator",
      "admin_support_bug",
      "admin_runtime",
    ],
    openPrClassifications: [
      { number: 293, classification: "security_source_change_outside_admin_hot_cache; do_not_merge_generated_churn_wholesale" },
      { number: 292, classification: "admin_debug_cost_perf_relevant; source_only_manual_port_candidate" },
      { number: 291, classification: "creator_ui_accessibility_outside_admin_hot_cache; do_not_merge_wholesale" },
    ],
    realtimeListenersBefore: onSnapshotBefore,
    realtimeListenersAfter: onSnapshotAfterDefaultAdminOverview,
    remainingAdminRealtimeReferences: {
      analyticsRealtimeHook: (analyticsRealtime.match(/onSnapshot/g) ?? []).length,
      debugRealtimeHook: (debugRealtime.match(/onSnapshot/g) ?? []).length,
      classification: "non_default_or_exception_required",
    },
    allowedRealtimeExceptions: ADMIN_REALTIME_TO_HOT_CACHE_MIGRATION.filter((entry) => entry.exception).map((entry) => ({
      surface: entry.surface,
      owner: entry.exception?.owner,
      reason: entry.exception?.reason,
      maxQuerySize: entry.exception?.maxQuerySize,
      detachBehavior: entry.exception?.detachBehavior,
      fallbackHotCachePath: entry.exception?.fallbackHotCachePath,
    })),
    forceNoStoreRoutesBefore: forceNoStoreBefore,
    forceNoStoreRoutesAfter: forceNoStoreAfter,
    dynamicAdminRoutesBefore: dynamicRoutesBefore,
    dynamicAdminRoutesAfter: dynamicRoutesAfter,
    hotCacheSnapshotsDefined: ADMIN_HOT_CACHE_SNAPSHOTS.map((snapshot) => snapshot.snapshotId),
    heartbeatCadenceSeconds: ADMIN_HEARTBEAT_INTERVAL_SECONDS,
    adminOverviewReadsBefore: costEstimate.oldReadPaths,
    adminOverviewReadsAfter: costEstimate.newReadPaths,
    estimatedReadReductionPct: costEstimate.estimatedReadReductionPct,
    estimatedPollingReductionPct: costEstimate.estimatedPollingReductionPct,
    hydrationStatesDefined: [
      "snapshot_ready",
      "snapshot_stale",
      "snapshot_missing",
      "refreshing",
      "failed",
      "unauthorized",
      "no_access",
    ],
    staleSnapshotBehavior: "stale snapshot values remain visible with review freshness.",
    missingSnapshotBehavior: "missing snapshot returns source-missing state and does not trigger broad fallback reads.",
    costEstimateStatus: "operation_estimate_only_no_dollar_claim",
    remainingGaps: [
      "Admin analytics/debug live hooks remain inventoried as explicit migration/exception surfaces, not overview defaults.",
      "Recent transactions panel still has a separate live-feed listener and needs a follow-up snapshot/drilldown split.",
    ],
    nextExactSteps: [
      "Port PR #292 source-only Map lookup into admin debug route if still applicable.",
      "Move remaining admin analytics/debug live pulse hooks behind explicit operator drilldown flags.",
      "Create scheduler/operator refresh route that writes admin_overview_snapshot outside page load.",
    ],
  };
}

export function validateAdminHotCacheHeartbeatReport(report = buildAdminHotCacheHeartbeatReport()) {
  const failures: string[] = [];
  const overviewRoute = read("src/app/api/admin/overview/route.ts");
  const overviewHook = read("src/hooks/useAdminOverviewRealtime.ts");
  const heartbeatWriter = read("src/lib/server/admin-heartbeat-writer.ts");
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };

  if (overviewHook.includes("onSnapshot")) failures.push("Admin overview hook still contains onSnapshot.");
  if (overviewHook.includes("realtime_firestore")) failures.push("Admin overview hook still emits realtime_firestore source scope.");
  if (overviewRoute.includes("ADMIN_OVERVIEW_USER_LIMIT") || overviewRoute.includes("ADMIN_OVERVIEW_DROP_LIMIT")) failures.push("Admin overview route still defines old broad limits.");
  if (overviewRoute.includes('fetchCache = "force-no-store"') || overviewRoute.includes("revalidate = 0")) failures.push("Admin overview route still disables cache globally.");
  if (!overviewRoute.includes("snapshot_doc_plus_heartbeat_doc")) failures.push("Admin overview route does not expose snapshot-only page-load model.");
  if (!overviewRoute.includes("broadFallbackReadsRun: false")) failures.push("Admin overview route missing broad fallback block evidence.");
  if (!heartbeatWriter.includes("writeAdminHeartbeatRecord")) failures.push("Admin heartbeat writer is missing.");
  if (overviewRoute.includes("writeAdminHeartbeatRecord")) failures.push("Admin overview page load can write heartbeat.");
  if (report.heartbeatCadenceSeconds < 3600) failures.push("Admin heartbeat cadence is below one hour.");
  if (report.hotCacheSnapshotsDefined.length !== 10) failures.push("Admin hot-cache snapshot registry is incomplete.");
  if (report.realtimeListenersAfter !== 0) failures.push("Admin overview default realtime listeners remain.");
  if (report.forceNoStoreRoutesAfter !== 0) failures.push("Admin overview force-no-store route remains.");
  if (report.costEstimateStatus !== "operation_estimate_only_no_dollar_claim") failures.push("Cost estimate status is not operation-only.");
  for (const script of [
    "check:admin-heartbeat-contract",
    "check:admin-realtime-hot-cache-migration",
    "check:admin-overview-hot-cache",
    "check:admin-surface-hydration",
    "check:admin-hot-cache-cost-estimate",
    "check:admin-hot-cache-heartbeat-refactor",
  ]) {
    if (!packageJson.scripts?.[script]) failures.push(`package.json missing ${script}.`);
  }
  failures.push(...validateAdminRealtimeMigrationEntries());
  return failures;
}

export function writeAdminHotCacheHeartbeatArtifacts() {
  const report = buildAdminHotCacheHeartbeatReport();
  writeJson("agent/state/admin-hot-cache-heartbeat-refactor.generated.json", report);
  writeMarkdown("docs/agent-truth/admin-hot-cache-heartbeat-refactor.md", [
    "# Admin Hot Cache Heartbeat Refactor",
    "",
    `- Heartbeat cadence: ${report.heartbeatCadenceSeconds} seconds.`,
    `- Overview reads before: ${report.adminOverviewReadsBefore.length} paths, estimated ${buildAdminHotCacheCostEstimate().oldEstimatedReadsPerLoad} operations.`,
    `- Overview reads after: ${report.adminOverviewReadsAfter.join(", ")}.`,
    `- Estimated read reduction: ${report.estimatedReadReductionPct}%.`,
    `- Estimated polling reduction: ${report.estimatedPollingReductionPct}%.`,
    `- Missing snapshot behavior: ${report.missingSnapshotBehavior}`,
    `- Stale snapshot behavior: ${report.staleSnapshotBehavior}`,
    "",
    "Remaining gaps:",
    ...report.remainingGaps.map((gap) => `- ${gap}`),
  ]);
  return report;
}
