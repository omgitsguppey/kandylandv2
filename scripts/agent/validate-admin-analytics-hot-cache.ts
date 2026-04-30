import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

const contract = readRequired("src/lib/analytics/admin-metric-snapshot.ts");
const helper = readRequired("src/lib/server/admin-analytics-snapshots.ts");
const refreshRoute = readRequired("src/app/api/admin/analytics/refresh/route.ts");
const registry = readRequired("src/lib/server/admin-analytics-materializers.ts");
const hook = readRequired("src/hooks/useAdminAnalyticsSnapshot.ts");
const debugRoute = readRequired("src/app/api/admin/debug/route.ts");
const hotCacheDoc = readRequired("docs/agent-truth/admin-analytics-hot-cache.md");
const truthDoc = readRequired("docs/agent-truth/analytics-truth-layer-v2.md");
const sourceDoc = readRequired("docs/agent-truth/analytics-source-hierarchy.md");

for (const contractName of [
  "AdminMetricSnapshot",
  "AdminMetricSnapshotRange",
  "AdminMetricSnapshotSourceMode",
  "AdminMetricSnapshotTruthState",
  "SnapshotWarning",
  "SnapshotParityResult",
  "SnapshotRefreshState",
]) {
  requireIncludes(contract, contractName, "Snapshot contract");
}

for (const sourceMode of [
  "live",
  "verified_cache",
  "stale_cache",
  "intraday",
  "estimated",
  "fallback",
  "unavailable",
  "mixed",
]) {
  requireIncludes(contract, `"${sourceMode}"`, "Snapshot source modes");
  requireIncludes(hotCacheDoc, sourceMode, "Hot-cache doctrine");
}

for (const rangeKey of ["24h", "7d", "14d", "30d", "all"]) {
  requireIncludes(contract, `"${rangeKey}"`, "Snapshot range keys");
}

for (const helperName of [
  "getLatestVerifiedSnapshot",
  "writeVerifiedSnapshot",
  "markSnapshotRefreshStarted",
  "markSnapshotRefreshCompleted",
  "markSnapshotRefreshFailed",
  "getSnapshotDebugMetadata",
  "runSnapshotRefreshWithDedupe",
]) {
  requireIncludes(helper, helperName, "Snapshot storage helper");
}

for (const routeNeedle of [
  "moduleKey",
  "rangeKey",
  "force",
  "guardApiRequest",
  "materializeAdminAnalyticsSnapshot",
  "duplicate_prevented",
  "metadata",
  "refreshStatus",
]) {
  requireIncludes(refreshRoute, routeNeedle, "Manual refresh route");
}

for (const moduleKey of [
  "platform_pulse",
  "audience_snapshot",
  "commerce_snapshot",
  "live_pulse",
  "journey_funnel",
  "auth_outcomes",
  "onboarding_performance",
  "daily_task_pipeline",
  "notification_funnel",
  "event_mix",
  "live_interaction_stream",
  "data_health_summary",
]) {
  requireIncludes(registry, `"${moduleKey}"`, "Materializer registry");
}

for (const registryNeedle of [
  "supportedRanges",
  "canonicalSources",
  "parityChecksRequired",
  "legacySupportStatus",
  "currentImplementationStatus",
  "createUnavailableAdminMetricSnapshot",
]) {
  requireIncludes(registry, registryNeedle, "Materializer registry");
}

for (const hookNeedle of [
  "firstSnapshotMs",
  "refreshStatus",
  "sourceMode",
  "refreshOnMount",
  "/api/admin/analytics/refresh",
  "duplicateRefreshPrevented",
]) {
  requireIncludes(hook, hookNeedle, "Snapshot-first client helper");
}

for (const debugNeedle of [
  "adminAnalyticsHotCache",
  "analytics_admin_metric_snapshots",
  "snapshotMetadata",
  "lastVerifiedAt",
  "sourceBreakdown",
  "parity",
  "unavailableReason",
]) {
  requireIncludes(debugRoute, debugNeedle, "Admin Debug snapshot metadata");
}

for (const docNeedle of [
  "verified backend snapshots first",
  "Manual refresh",
  "Stale Cache Rule",
  "Fake Zero Rule",
  "Realtime Upgrade Rule",
  "Module Registry",
  "Admin Debug Responsibilities",
]) {
  requireIncludes(hotCacheDoc, docNeedle, "Hot-cache doctrine");
}

requireIncludes(truthDoc, "Phase 3 Verified Hot-Cache Snapshots", "Analytics truth layer doc");
requireIncludes(sourceDoc, "Phase 3 Hot-Cache Snapshot Placement", "Analytics source hierarchy doc");
requireIncludes(contract, "Metric ${key} renders a zero while unavailable.", "Fake zero prevention validation");
requireIncludes(hotCacheDoc, "A blank loading screen is allowed only when no verified snapshot exists.", "No blank loading doctrine");

if (failures.length > 0) {
  console.error("Admin analytics hot-cache validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin analytics hot-cache validation passed.");
