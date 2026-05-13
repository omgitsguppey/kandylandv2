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

function requireNotIncludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include visible/backend jargon "${needle}".`);
  }
}

const displayStateHelper = readRequired("src/lib/analytics/admin-analytics-display-state.ts");
const adminMetricSnapshotContract = readRequired("src/lib/analytics/admin-metric-snapshot.ts");
const operationsTab = readRequired("src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx");
const stateHook = readRequired("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const livePulseModel = readRequired("src/lib/admin-analytics-live-pulse.ts");
const debugRoute = readRequired("src/app/api/admin/debug/route.ts");
const realtimeRoute = readRequired("src/app/api/admin/analytics/realtime/route.ts");
const auditReport = readRequired("agent/state/admin-analytics-realtime-dependency-audit.generated.json");
const auditDoc = readRequired("docs/agent-truth/admin-analytics-realtime-to-hot-cache-audit.md");
const hotCacheDoc = readRequired("docs/agent-truth/admin-analytics-hot-cache.md");
const truthDoc = readRequired("docs/agent-truth/analytics-truth-layer-v2.md");

for (const helperNeedle of [
  "resolveAdminAnalyticsDisplayState",
  "latestVerifiedSnapshot",
  "realtimeState",
  "refreshState",
  "errorState",
  "visibleValueSource",
  "shouldRenderSnapshot",
  "shouldRenderRealtimeUpgrade",
  "shouldShowUnavailable",
  "fakeZeroPrevented",
]) {
  requireIncludes(displayStateHelper, helperNeedle, "Admin Analytics display state helper");
}

requireIncludes(adminMetricSnapshotContract, "AdminMetricSnapshot", "Canonical admin analytics snapshot contract");

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
  requireIncludes(auditReport, `"moduleKey": "${moduleKey}"`, "Realtime dependency audit report");
}

for (const auditField of [
  "current primary source",
  "realtimeDependencyFound",
  "realtimeBlocksFirstRender",
  "missingRealtimeCausesUnavailable",
  "cacheFallbackPathFound",
  "manualRefreshPathFound",
  "fakeZeroRisk",
  "fixedInThisPass",
]) {
  requireIncludes(auditReport, auditField, "Realtime dependency audit report");
}

for (const codeNeedle of [
  "resolveAdminAnalyticsDisplayState",
  "livePulseDisplayState",
  "!historicalOverviewResponse",
  "realtimeBlocksFirstRender: false",
  "displayStatePolicyApplied: true",
  "pureRealtimeDependencyRemoved: true",
  "ADMIN_ANALYTICS_RAW_REALTIME_LISTENERS_DISABLED_FOR_COST",
  "rawDisplayFallbackDisabled: true",
  "sourceUse: \"snapshot_first_route\"",
]) {
  requireIncludes(stateHook + livePulseModel, codeNeedle, "Admin Analytics Live Pulse source-order policy");
}

requireNotIncludes(stateHook, "from \"./useAdminAnalyticsRealtime\"", "Admin Analytics state hook");
requireNotIncludes(stateHook, "useAdminAnalyticsRealtime(", "Admin Analytics state hook");

for (const livePulseNeedle of [
  "Graph awaiting live upgrade.",
  "Surface detail has no verified live upgrade yet.",
  "Showing last verified snapshot.",
]) {
  requireIncludes(operationsTab + livePulseModel + displayStateHelper, livePulseNeedle, "Live Pulse snapshot-first visible state");
}

for (const debugNeedle of [
  "primaryDisplaySource",
  "latestVerifiedSnapshotExists",
  "latestVerifiedSnapshotAgeMs",
  "realtimeListenerState",
  "fallbackSnapshotUsed",
  "displayStatePolicyApplied",
  "pureRealtimeDependencyRemoved",
  "laneFailures",
]) {
  requireIncludes(debugRoute + livePulseModel, debugNeedle, "Admin Debug realtime dependency metadata");
}

for (const guestSnapshotNeedle of [
  "guestAnalyticsSnapshot",
  "normalizeGuestAnalyticsSnapshotFromCache",
  "guestSamplesAvailable",
  "sourceSampleCounts",
  "guestTruthState",
]) {
  requireIncludes(realtimeRoute + livePulseModel, guestSnapshotNeedle, "Admin guest snapshot-first display metadata");
}

requireIncludes(livePulseModel, "Guest unavailable", "Admin guest display unavailable state");
requireIncludes(livePulseModel, "Guest snapshot stale", "Admin guest display stale state");
requireIncludes(livePulseModel, "guestSnapshotTruthState", "Admin guest display truth state");
requireIncludes(debugRoute, "guestSnapshotTruthState", "Admin debug guest snapshot truth field");

for (const docNeedle of [
  "Realtime is an upgrade",
  "verified snapshot",
  "Debug",
  "No fake zero",
  "live_pulse",
]) {
  requireIncludes(auditDoc, docNeedle, "Realtime-to-hot-cache audit doctrine");
}

requireIncludes(hotCacheDoc, "realtime is an upgrade", "Hot-cache doctrine");
requireIncludes(truthDoc, "realtime is an upgrade", "Analytics truth doctrine");

for (const bannedVisibleCopy of [
  "Live Pulse is unavailable.",
  "Graph waiting for live data.",
  "Graph source unavailable",
  "Surface detail waiting for live data.",
  "Realtime surfaces are waiting for presence rows.",
  "observer failed closed",
  "polled route snapshot",
  "realtime lane fell back to polled data",
]) {
  requireNotIncludes(operationsTab + livePulseModel, bannedVisibleCopy, "Admin Analytics visible module copy");
}

if (!/realtimeBlocksFirstRender"\s*:\s*false/.test(auditReport)) {
  failures.push("Realtime dependency audit must record realtimeBlocksFirstRender=false for fixed modules.");
}

if (failures.length > 0) {
  console.error("Admin Analytics no-pure-realtime validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin Analytics no-pure-realtime validation passed.");
