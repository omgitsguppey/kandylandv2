import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const failures: string[] = [];

function read(path: string) {
  return readFileSync(join(repoRoot, path), "utf-8");
}

function fail(message: string) {
  failures.push(message);
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    fail(`${label} missing ${needle}`);
  }
}

function requireNotIncludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    fail(`${label} must not include ${needle}`);
  }
}

const adminStatsBar = read("src/components/Admin/AdminStatsBar.tsx");
const adminOverviewTypes = read("src/lib/admin-overview.ts");
const adminOverviewRoute = read("src/app/api/admin/overview/route.ts");
const windowHelper = read("src/lib/admin/platform-pulse-window.ts");
const compactDocPath = "docs/agent-truth/platform-pulse-compact.md";
const routeTestPath = "tests/unit/admin-overview-route.spec.ts";
const compactUiTestPath = "tests/unit/admin-stats-bar-compact.spec.ts";
const builderTestPath = "tests/unit/admin-overview-platform-pulse.spec.ts";
const windowTestPath = "tests/unit/platform-pulse-window.spec.ts";

requireIncludes(adminOverviewTypes, '"gumdropsCirculation30d"', "PlatformPulseMetric id union");
requireIncludes(adminOverviewTypes, '"supportBugs30d"', "PlatformPulseMetric id union");
requireIncludes(adminOverviewTypes, 'primaryScope: "rolling_30d"', "PlatformPulseMetric contract");
requireIncludes(adminOverviewTypes, "current30dValue: number", "PlatformPulseMetric contract");
requireIncludes(adminOverviewTypes, "prior30dValue: number", "PlatformPulseMetric contract");
requireIncludes(adminOverviewTypes, "deltaPct: number | null", "PlatformPulseMetric contract");
requireIncludes(adminOverviewTypes, "displayCombinesPaidAndRewardOnly", "GumDrops display metadata");
requireIncludes(adminOverviewTypes, "excludesAiDebugCodeInternalDiagnostics", "Support/Bugs metadata");
requireNotIncludes(adminOverviewTypes, "primaryScope: \"lifetime\"", "PlatformPulseMetric contract");
requireNotIncludes(adminOverviewTypes, "subtext:", "PlatformPulseMetric contract");
requireNotIncludes(adminOverviewTypes, "confidence:", "PlatformPulseMetric contract");

requireIncludes(windowHelper, "buildPlatformPulseWindow", "Platform pulse window helper");
requireIncludes(windowHelper, "calculatePlatformPulseDelta", "Platform pulse window helper");
requireIncludes(windowHelper, "formatPlatformPulseDelta", "Platform pulse window helper");
requireIncludes(windowHelper, "classifyPlatformPulseTrend", "Platform pulse window helper");
requireIncludes(windowHelper, "New: prior 30d was 0", "Zero-baseline delta copy");

requireIncludes(adminOverviewRoute, "buildAdminOverviewPlatformPulse", "Admin overview route");
requireIncludes(adminOverviewRoute, "analytics_task_daily", "GumDrops reward summary source");
requireIncludes(adminOverviewRoute, "paidGd30d", "GumDrops paid summary source");
requireIncludes(adminOverviewRoute, "paidBonusGd30d", "GumDrops paid bonus summary source");
requireIncludes(adminOverviewRoute, "SUPPORT_BUG_USER_CHANNELS", "Support/Bugs support source");
requireIncludes(adminOverviewRoute, "ADMIN_HOT_CACHE_COLLECTION", "Admin overview hot-cache source");
requireIncludes(adminOverviewRoute, "OVERVIEW_SNAPSHOT_ID", "Admin overview snapshot owner");
requireIncludes(adminOverviewRoute, "summary_missing", "Missing platform pulse source label");
requireIncludes(adminOverviewRoute, "Page load did not run broad Firestore fallback reads.", "No broad fallback reads contract");
requireNotIncludes(adminOverviewRoute, "buildPlatformPulseFromTruthSnapshot", "stale platform pulse builder");
requireNotIncludes(adminOverviewRoute, "materialized_snapshot", "stale platform pulse source label");

requireIncludes(adminStatsBar, 'data-admin-platform-pulse-grid="compact-six"', "Compact grid marker");
requireIncludes(adminStatsBar, "grid-cols-2", "Mobile compact grid");
requireIncludes(adminStatsBar, "md:grid-cols-3", "Wide compact grid");
requireIncludes(adminStatsBar, "metricNeedsIssueBadge", "Issue-only badge gate");
requireIncludes(adminStatsBar, "AdminReviewBadge", "Issue badge visibility");
requireIncludes(adminStatsBar, "AdminMetricCard", "Shared metric primitive");
requireIncludes(adminStatsBar, "showTruthBadge={shouldRenderIssue}", "Issue-only truth badge gate");
requireIncludes(adminStatsBar, "AdminTruthBadge", "Overall overview truth badge");
requireNotIncludes(adminStatsBar, "metric.subtext", "Platform pulse subtext");
requireNotIncludes(adminStatsBar, "formatConfidence", "Platform pulse confidence text");
requireNotIncludes(adminStatsBar, "truncate\">{label}", "Purchases label truncation pattern");

for (const testPath of [windowTestPath, compactUiTestPath, builderTestPath, routeTestPath]) {
  if (!existsSync(join(repoRoot, testPath))) {
    fail(`${testPath} missing non-regression proof`);
  }
}

if (!existsSync(join(repoRoot, compactDocPath))) {
  fail(`${compactDocPath} missing`);
} else {
  const doc = read(compactDocPath);
  requireIncludes(doc, "Compact Platform pulse", compactDocPath);
  requireIncludes(doc, "rolling 30-day", compactDocPath);
  requireIncludes(doc, "paid/reward split", compactDocPath);
  requireIncludes(doc, "user-reported", compactDocPath);
}

const report = {
  generatedAt: new Date().toISOString(),
  check: "platform-pulse-compact",
  passed: failures.length === 0,
  failures,
  evidence: {
    sixMetricBuilder: adminOverviewTypes.includes("buildAdminOverviewPlatformPulse"),
    compactGrid: adminStatsBar.includes('data-admin-platform-pulse-grid="compact-six"'),
    okLiveBadgesRemoved: adminStatsBar.includes("showTruthBadge={shouldRenderIssue}"),
    sharedMetricPrimitive: adminStatsBar.includes("AdminMetricCard"),
    gumdropSplitPreserved: adminOverviewTypes.includes("paidGd30d") && adminOverviewTypes.includes("rewardGd30d"),
    supportBugsUserReportedOnly: adminOverviewRoute.includes("SUPPORT_BUG_USER_CHANNELS"),
    hotCacheOnlyForPageLoad: adminOverviewRoute.includes("OVERVIEW_SNAPSHOT_ID") && adminOverviewRoute.includes("Page load did not run broad Firestore fallback reads."),
  },
};

mkdirSync(join(repoRoot, "agent/state"), { recursive: true });
writeFileSync(
  join(repoRoot, "agent/state/platform-pulse-compact.generated.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

if (failures.length > 0) {
  console.error(`Platform pulse compact validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Platform pulse compact validation passed: six rolling-30-day cards, issue-only badges, summary-first sources.");
