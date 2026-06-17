import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  const absolutePath = path.join(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function includes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function notIncludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

function parseJson<T>(relativePath: string): T | null {
  const source = read(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source) as T;
  } catch (error) {
    failures.push(`${relativePath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

type FinalizationReport = {
  status?: string;
  surfaces?: Array<{ key?: string; fixedInThisPass?: boolean }>;
  validationGates?: Array<{ command?: string; status?: string }>;
};

const report = parseJson<FinalizationReport>("agent/state/admin-analytics-finalization.generated.json");
const launchDoc = read("docs/agent-truth/admin-analytics-launch-final.md");
const copyGuide = read("docs/agent-truth/admin-copy-style-guide.md");
const humanCopyDoc = read("docs/agent-truth/human-readable-admin-truth.md");
const packageJson = read("package.json");
const analyticsPage = read("src/app/admin/analytics/page.tsx");
const analyticsHook = read("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const analyticsDisplayState = read("src/lib/analytics/admin-analytics-display-state.ts");
const adminMetricSnapshotContract = read("src/lib/analytics/admin-metric-snapshot.ts");
const analyticsOperations = read("src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx");
const analyticsComponents = [
  analyticsPage,
  analyticsHook,
  analyticsOperations,
  read("src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx"),
  read("src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx"),
  read("src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx"),
  read("src/components/Admin/Analytics/AdminOnboardingAnalyticsModules.tsx"),
  read("src/components/Admin/Analytics/AdminTaskAndNotificationModules.tsx"),
].join("\n");
const adminOverviewPage = read("src/app/admin/page.tsx");
const adminOverviewHook = read("src/hooks/useAdminOverviewRealtime.ts");
const debugRoute = read("src/app/api/admin/debug/route.ts");
const commerceSnapshot = read("src/lib/admin-analytics-commerce-snapshot.ts");
const taskPipeline = read("src/lib/admin-task-pipeline.ts");
const notificationFunnel = read("src/lib/admin-notification-funnel.ts");
const adminCopyRegistry = read("src/lib/admin-copy/admin-copy-registry.ts");
const adminTruthCopy = read("src/lib/admin-copy/admin-truth-copy.ts");
const auditLedger = read("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = read("REPO_MEMORY_LEDGER.md");
const checklist = read("EVERY_FILE_FUNCTION_CHECKLIST.md");

for (const scriptName of [
  "check:admin-analytics-finalization",
  "check:admin-analytics-hot-cache",
  "check:admin-analytics-no-pure-realtime",
  "check:admin-analytics-snapshot-migration",
  "check:analytics-legacy-recovery",
  "check:human-readable-admin-copy",
  "check:refresh-based-hot-cache",
]) {
  includes(packageJson, `"${scriptName}"`, "package validation scripts");
}

if (!report) {
  failures.push("Finalization report could not be parsed.");
} else {
  if (report.status !== "launch_ready_with_targeted_warnings") {
    failures.push("Finalization report must record launch_ready_with_targeted_warnings.");
  }
  const surfaceKeys = new Set((report.surfaces ?? []).map((surface) => surface.key));
  for (const key of [
    "admin_overview",
    "admin_analytics_platform_pulse",
    "admin_analytics_audience_snapshot",
    "admin_analytics_commerce_snapshot",
    "admin_analytics_live_pulse",
    "admin_analytics_journey_event_chain",
    "admin_analytics_auth_outcomes",
    "admin_analytics_onboarding_performance",
    "admin_analytics_daily_task_pipeline",
    "admin_analytics_notification_funnel",
    "admin_analytics_event_mix",
    "admin_analytics_live_interaction_stream",
    "admin_analytics_data_health_summary",
    "admin_debug",
  ]) {
    if (!surfaceKeys.has(key)) {
      failures.push(`Finalization report is missing surface: ${key}`);
    }
  }
}

for (const docNeedle of [
  "Verified snapshot first",
  "Realtime is an upgrade",
  "Refresh never clears current data",
  "No generic Waiting",
  "No fake zeros",
  "Operator copy in Analytics",
  "Technical evidence in Debug",
  "Data Validation belongs in Debug",
  "Guest estimates are labeled",
  "Authenticated-only data is not total audience",
  "Revenue means completed real-money purchases",
  "Event Mix is a ranked list",
  "Notification dedupe/read truth",
  "Live Pulse uses snapshot when realtime is missing",
]) {
  includes(launchDoc, docNeedle, "Admin Analytics launch final doc");
}

includes(copyGuide, "Launch Finalization Addendum", "Admin copy style guide");
includes(humanCopyDoc, "Launch Finalization Addendum", "Human-readable admin truth doc");
includes(adminCopyRegistry, "analytics_delayed", "admin copy registry");
includes(adminTruthCopy, "buildOperatorStatusCopy", "admin truth copy mapper");
includes(adminMetricSnapshotContract, "AdminMetricSnapshot", "Canonical admin analytics snapshot contract");

for (const codeNeedle of [
  "snapshotRevenueValue",
  "snapshotPurchasesValue",
  "snapshotMobileShareValue",
  "snapshotLiveActiveValue",
  "blocksOnRealtime: false",
  "blocksOnRefresh: false",
  "fakeZeroPrevented",
  "visibleDegradedCopy",
]) {
  includes(analyticsHook, codeNeedle, "Admin Analytics state hook");
}

includes(analyticsPage, "...sourceStatusItems", "Admin Analytics degraded title");
includes(analyticsPage, "liveFeedDetail ? formatAdminAnalyticsSourceNote(liveFeedDetail) : null", "Admin Analytics degraded title");
notIncludes(analyticsPage, 'title={backgroundAnalyticsIssues.join(" | ")}', "Admin Analytics degraded title");
includes(analyticsDisplayState, "Realtime delayed. Showing last verified snapshot.", "Display state realtime failure copy");
includes(analyticsDisplayState, "No verified snapshot yet.", "Display state no-snapshot copy");
includes(commerceSnapshot, "Promo and bonus GD are excluded from revenue.", "Commerce visible revenue rule");
includes(debugRoute, "canonicalRevenueRule", "Admin Debug commerce evidence");
includes(debugRoute, "guestAuthenticatedCreatorAdminSystemSeparated", "Admin Debug actor lane evidence");
includes(debugRoute, "dataValidationFullListLocation", "Admin Debug data validation location");
includes(debugRoute, "adminAnalyticsLegacyParity", "Admin Debug legacy parity");
includes(debugRoute, "duplicatePushPreventedCount", "Admin Debug notification dedupe evidence");
includes(debugRoute, "readPersistenceRule", "Admin Debug notification read evidence");
includes(taskPipeline, "lifecycle", "Task pipeline lifecycle truth");
includes(notificationFunnel, "duplicatePrevented", "Notification funnel dedupe truth");
includes(notificationFunnel, "readCount", "Notification funnel read truth");
includes(analyticsOperations, "Ranked event activity", "Event Mix ranked list");
includes(analyticsOperations, "Surface context unavailable", "Event Mix context truth");
notIncludes(analyticsOperations, "BarChart", "Event Mix module");
notIncludes(analyticsComponents, "Data Validation", "Admin Analytics primary UI");

for (const bannedVisible of [
  "Waiting for analytics",
  "Realtime analytics is delayed",
  "last validated backend snapshot",
  "Graph source unavailable",
  "failed closed",
  "polled route snapshot",
  "canonical authenticated events",
  "truth score",
  "pipeline health fail",
  "module coverage fail",
]) {
  notIncludes(analyticsComponents, bannedVisible, "Admin Analytics primary UI");
}

for (const oldOverviewCopy of [
  "Waiting for server truth",
  "Live server truth",
  "Realtime warming up",
  "Server rollup only",
  "Fallback active",
]) {
  notIncludes(adminOverviewPage + adminOverviewHook, oldOverviewCopy, "Admin Overview operator copy");
}
includes(adminOverviewPage + adminOverviewHook, "Waiting for first overview snapshot", "Admin Overview no-snapshot copy");
includes(adminOverviewHook, "Showing last verified data", "Admin Overview snapshot copy");
includes(adminOverviewHook, "Snapshot refresh delayed", "Admin Overview delayed copy");

for (const ledgerNeedle of [
  "Admin Analytics launch finalization",
  "Admin Analytics and Debug launch finalization",
]) {
  if (!auditLedger.includes(ledgerNeedle) && !repoLedger.includes(ledgerNeedle) && !checklist.includes(ledgerNeedle)) {
    failures.push(`Governance ledgers must include ${ledgerNeedle}.`);
  }
}

if (failures.length > 0) {
  console.error("Admin Analytics finalization validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin Analytics finalization validation passed.");
