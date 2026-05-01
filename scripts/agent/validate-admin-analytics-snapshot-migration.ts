import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
    failures.push(`${label} must not include "${needle}".`);
  }
}

function readFilesUnder(relativePath: string, extensions = new Set([".tsx", ".ts"])) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing directory: ${relativePath}`);
    return "";
  }

  const chunks: string[] = [];
  const visit = (pathName: string) => {
    for (const entry of readdirSync(pathName)) {
      const child = join(pathName, entry);
      const stats = statSync(child);
      if (stats.isDirectory()) {
        visit(child);
      } else if ([...extensions].some((extension) => child.endsWith(extension))) {
        chunks.push(readFileSync(child, "utf8"));
      }
    }
  };
  visit(fullPath);
  return chunks.join("\n");
}

const page = readRequired("src/app/admin/analytics/page.tsx");
const stateHook = readRequired("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const snapshotHook = readRequired("src/hooks/useAdminAnalyticsSnapshot.ts");
const snapshotRegistry = readRequired("src/hooks/useAdminAnalyticsSnapshotRegistry.ts");
const snapshotStorage = readRequired("src/lib/server/admin-analytics-snapshots.ts");
const debugRoute = readRequired("src/app/api/admin/debug/route.ts");
const materializerRegistry = readRequired("src/lib/server/admin-analytics-materializers.ts");
const snapshotContract = readRequired("src/lib/analytics/admin-metric-snapshot.ts");
const hotCacheDoc = readRequired("docs/agent-truth/admin-analytics-hot-cache.md");
const truthLayerDoc = readRequired("docs/agent-truth/analytics-truth-layer-v2.md");
const parityDoc = readRequired("docs/agent-truth/analytics-ecosystem-parity.md");
const actorDoc = readRequired("docs/agent-truth/analytics-actor-taxonomy.md");
const analyticsUi = [
  page,
  stateHook,
  readFilesUnder("src/app/admin/analytics/components"),
  readFilesUnder("src/components/Admin/Analytics"),
].join("\n");

const moduleKeys = [
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
] as const;

const sectionKeys = [
  "platformPulse",
  "audienceSnapshot",
  "commerceSnapshot",
  "livePulse",
  "journeyFunnel",
  "authOutcomeSplit",
  "onboardingVelocity",
  "dailyTaskPipeline",
  "notificationFunnel",
  "eventMix",
  "liveInteractionStream",
  "dataHealthSummary",
] as const;

for (const moduleKey of moduleKeys) {
  requireIncludes(materializerRegistry, `"${moduleKey}"`, "Admin analytics materializer registry");
  requireIncludes(snapshotRegistry, `"${moduleKey}"`, "Snapshot registry hook");
}

for (const sectionKey of sectionKeys) {
  requireIncludes(snapshotRegistry, sectionKey, "Snapshot registry section map");
  requireIncludes(stateHook, sectionKey, "Admin analytics state snapshot ranges");
}

for (const registryNeedle of [
  "useAdminAnalyticsSnapshot",
  "firstSnapshotMs",
  "refreshStatus",
  "sourceMode",
  "truthState",
  "lastVerifiedAt",
  "debugPath",
  "verifiedSnapshotFirstRenderPath",
  "manualRefreshEnabled",
  "noBlankLoadingWhenSnapshotExists",
  "realtimeUpgradeOptional",
]) {
  requireIncludes(snapshotRegistry, registryNeedle, "Snapshot registry hook");
}

for (const stateNeedle of [
  "useAdminAnalyticsSnapshotRegistry",
  "analyticsSnapshotRegistry",
  "analyticsSnapshotMigrationDebug",
  "SnapshotRefreshControl",
  "SNAPSHOT_SOURCE_LABELS",
  "Refresh",
]) {
  requireIncludes(stateHook, stateNeedle, "Admin analytics state hook");
}

for (const snapshotNeedle of [
  "firstSnapshotMs",
  "refreshStatus",
  "sourceMode",
  "duplicateRefreshPrevented",
  "fakeZeroPrevented",
]) {
  requireIncludes(snapshotHook + snapshotContract, snapshotNeedle, "Snapshot-first contract and hook");
}

requireIncludes(snapshotStorage, "getLatestVerifiedSnapshot", "Snapshot storage helper");

for (const debugNeedle of [
  "adminAnalyticsSnapshotMigration",
  "adminAnalyticsHotCache",
  "adminAnalyticsLegacyParity",
  "adminDataValidation",
  "manualRefreshRoute",
  "actorLaneRules",
  "adminExcludedFromUserGuestBehavior",
  "dataValidationFullListLocation",
]) {
  requireIncludes(debugRoute, debugNeedle, "Admin Debug snapshot migration metadata");
}

requireIncludes(page, "__KANDYDROPS_ADMIN_ANALYTICS_SNAPSHOT_MIGRATION_DEBUG__", "Admin Analytics page debug bridge");
requireIncludes(page, "state.analyticsSnapshotMigrationDebug", "Admin Analytics page debug bridge");

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
  requireIncludes(snapshotContract, `"${sourceMode}"`, "Snapshot source modes");
}

for (const actorNeedle of ["guest", "authenticated user", "creator", "admin", "system", "unknown"]) {
  requireIncludes(actorDoc, actorNeedle, "Actor taxonomy");
}

for (const docNeedle of [
  "verified",
  "hot cache",
  "manual refresh",
  "realtime",
  "fake zero",
  "Admin Debug",
]) {
  requireIncludes(hotCacheDoc + truthLayerDoc, docNeedle, "Hot-cache doctrine docs");
}

for (const parityNeedle of ["parity", "legacy", "Admin Debug", "confidence"]) {
  requireIncludes(parityDoc, parityNeedle, "Ecosystem parity doctrine");
}

for (const moduleDoc of [
  "docs/agent-truth/admin-analytics-audience-snapshot.md",
  "docs/agent-truth/admin-analytics-commerce-snapshot.md",
  "docs/agent-truth/admin-analytics-live-pulse.md",
  "docs/agent-truth/admin-analytics-journey-funnel.md",
  "docs/agent-truth/admin-analytics-auth-outcome-split.md",
  "docs/agent-truth/admin-analytics-onboarding-performance.md",
  "docs/agent-truth/admin-analytics-daily-task-pipeline.md",
  "docs/agent-truth/notification-pipeline.md",
  "docs/agent-truth/admin-analytics-event-mix.md",
  "docs/agent-truth/admin-analytics-live-interaction-stream.md",
  "docs/agent-truth/admin-data-validation.md",
]) {
  const doc = readRequired(moduleDoc);
  requireIncludes(doc, "Phase 5", moduleDoc);
  requireIncludes(doc, "snapshot", moduleDoc);
  requireIncludes(doc, "Debug", moduleDoc);
}

requireIncludes(analyticsUi, "Ranked event activity", "Event Mix compact ranked list");
requireIncludes(analyticsUi, "Surface context unavailable", "Event Mix compact context state");
requireIncludes(analyticsUi, "Task leaderboard", "Daily Task Pipeline consolidated leaderboard");
requireIncludes(analyticsUi, "Completion speed", "Daily Task Pipeline consolidated speed");
requireIncludes(analyticsUi, "Prev", "Task leaderboard inline pagination");
requireIncludes(analyticsUi, "Next", "Task leaderboard inline pagination");
requireIncludes(analyticsUi, "Onboarding Performance", "Consolidated onboarding module");
requireIncludes(analyticsUi, "Notification Funnel", "Compact notification funnel module");
requireIncludes(analyticsUi, "journeyFunnelModel.visibleTitle", "Journey/Event Chain module");
requireIncludes(analyticsUi, "Auth Outcomes", "Auth Outcomes module");

for (const bannedVisible of [
  "polled route snapshot",
  "failed closed",
  "canonical purchase rollups",
  "canonical authenticated events",
  "truth score",
]) {
  requireNotIncludes(analyticsUi, bannedVisible, "Visible Admin Analytics UI");
}

requireNotIncludes(analyticsUi, "Data Validation", "Admin Analytics UI");
requireNotIncludes(analyticsUi, "Task Completion Speed", "Admin Analytics UI");
requireNotIncludes(analyticsUi, "Task Leaderboard", "Admin Analytics UI");

if (failures.length > 0) {
  console.error("Admin Analytics snapshot migration validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin Analytics snapshot migration validation passed.");
