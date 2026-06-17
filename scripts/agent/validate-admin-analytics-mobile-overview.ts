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
    failures.push(`${label} must not include "${needle}".`);
  }
}

const page = readRequired("src/app/admin/analytics/page.tsx");
const stateHook = readRequired("src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx");
const primitives = readRequired("src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx");
const operationsTab = readRequired("src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx");
const displayState = readRequired("src/lib/analytics/admin-analytics-display-state.ts");
const pageSpec = readRequired("tests/unit/admin-analytics-page.spec.tsx");
const displayStateSpec = readRequired("tests/unit/admin-analytics-display-state.spec.ts");
const livePulseSpec = readRequired("tests/unit/admin-analytics-live-pulse.spec.ts");

for (const needle of [
  "AdminAnalyticsOverviewDisplayMetric",
  "analyticsOverviewDisplayMetrics",
  "compactFreshnessLine",
  "debugReason",
  "debugSource",
  "resolveAdminAnalyticsOverviewMetricState",
]) {
  requireIncludes(stateHook + displayState, needle, "Overview display contract");
}

for (const needle of [
  "isKnownOverviewSnapshotUnavailable",
  "Overview snapshot unavailable. Showing available confirmed metrics.",
  "primaryBlockingAnalyticsError",
  "analyticsOverviewDisplayMetrics.revenue.displayValue",
  "analyticsOverviewDisplayMetrics.purchases.displayValue",
  "badgePlacement={analyticsOverviewDisplayMetrics.revenue.showBadgeInPrimary ? \"footer\" : \"hidden\"}",
  "md:sticky md:top-24",
]) {
  requireIncludes(page, needle, "Admin Analytics overview page");
}

requireNotIncludes(page, "{blockingAnalyticsError.message", "Admin Analytics overview page");
requireNotIncludes(page, "top-[8.6rem]", "Admin Analytics overview mobile tabs");
requireNotIncludes(page, "analyticsOverviewCards.revenue.displayValue", "Admin Analytics overview top card rendering");
requireNotIncludes(page, "analyticsOverviewCards.purchases.displayValue", "Admin Analytics overview top card rendering");

for (const needle of [
  "badgePlacement?: \"header\" | \"footer\" | \"hidden\"",
  "compactPrimary?: boolean",
  "badgePlacement === \"header\"",
  "badgePlacement === \"footer\"",
  "data-admin-analytics-truth-state",
]) {
  requireIncludes(primitives, needle, "MetricCard compact badge contract");
}

for (const needle of [
  "defaultExpanded={false}",
  "data-admin-analytics-live-pulse-default-expanded=\"false\"",
  "livePulseCompactStatusLine",
  "livePulseCompactIssueLine",
]) {
  requireIncludes(operationsTab, needle, "Live Pulse mobile overview contract");
}

for (const bannedPrimaryCopy of [
  "raw logs stay Debug-only",
  "raw logs stay",
  "Verified snapshot or refresh-due verified snapshot drives display",
]) {
  requireNotIncludes(operationsTab, bannedPrimaryCopy, "Live Pulse primary copy");
}

if (/id:\s*"revenue"[\s\S]{0,700}displayValue:\s*historicalOverviewWaitingLabel/.test(stateHook)) {
  failures.push("Revenue top-card value must not use historicalOverviewWaitingLabel as the giant metric value.");
}

if (/id:\s*"purchases"[\s\S]{0,700}displayValue:\s*historicalOverviewWaitingLabel/.test(stateHook)) {
  failures.push("Purchases top-card value must not use historicalOverviewWaitingLabel as the giant metric value.");
}

for (const testNeedle of [
  "platform_pulse:30d",
  "Overview snapshot unavailable. Showing available confirmed metrics.",
  "not.toContain(\"Waiting for first snapshot\")",
  "resolveAdminAnalyticsOverviewMetricState",
  "defaultExpanded={false}",
]) {
  requireIncludes(pageSpec + displayStateSpec + livePulseSpec, testNeedle, "Focused Admin Analytics mobile overview tests");
}

if (page.includes("platform_pulse:30d") || operationsTab.includes("platform_pulse:30d")) {
  failures.push("Primary Admin Analytics UI must not render raw platform_pulse:30d.");
}

if (failures.length > 0) {
  console.error("Admin Analytics mobile overview validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin Analytics mobile overview validation passed.");
