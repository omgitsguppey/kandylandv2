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

const operationsTab = readRequired("src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx");
const journeyFunnel = readRequired("src/lib/admin-analytics-journey-funnel.ts");
const livePulse = readRequired("src/lib/admin-analytics-live-pulse.ts");
const primitives = readRequired("src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx");
const packageJson = readRequired("package.json");
const journeySpec = readRequired("tests/unit/admin-analytics-journey-funnel.spec.ts");
const livePulseSpec = readRequired("tests/unit/admin-analytics-live-pulse.spec.ts");

requireIncludes(packageJson, "check:admin-analytics-operations-mobile", "package scripts");

for (const needle of [
  "EventChainHydrationState",
  "hydrationState",
  "hasUsableEventSample",
  "canRenderStepDetails",
  "exactUserFunnelAvailable",
  "measurementMode",
  "nextSourceStep",
  "algorithmRecommendation",
  '"No sample"',
  '"No source"',
]) {
  requireIncludes(journeyFunnel, needle, "Event Chain hydration model");
}

requireNotIncludes(
  journeyFunnel,
  '!hasResponse ? input.loading ? "WAIT" : "ERROR"',
  "Event Chain no-response mode label",
);
requireNotIncludes(journeyFunnel, "input.count ?? 0} purchase events", "Event Chain purchase explanation");
requireNotIncludes(journeyFunnel, "input.priorValue ?? 0", "Event Chain prior-step explanation");
requireIncludes(journeyFunnel, "Prior-step sample unavailable. Ratio not computed.", "Event Chain prior sample guard");
requireIncludes(journeyFunnel, "has no verified event sample for this range", "Event Chain missing sample copy");
requireIncludes(journeyFunnel, "Aggregate event counts alone remain event-volume ratios, not conversion.", "Event Chain exact algorithm note");

for (const needle of [
  "eventChainHasUsableSample",
  "eventChainCanRenderDetails",
  "data-admin-analytics-hydration-state",
  "data-admin-analytics-measurement-mode",
  "data-admin-analytics-exact-user-funnel-available",
  "data-admin-analytics-next-source-step",
  "No event sample yet",
  "Next source step: generate bounded sample activity, refresh snapshots, or inspect Debug.",
  "Exact funnel unavailable until ordered actor/session transitions exist.",
]) {
  requireIncludes(operationsTab, needle, "Operations Event Chain compact state");
}

if (
  operationsTab.includes("journeyFunnelModel.steps.map")
  && !operationsTab.includes("eventChainCanRenderDetails ?")
  && !operationsTab.includes("eventChainCanRenderDetails &&")
) {
  failures.push("Event Chain step rows must be guarded by canRenderStepDetails.");
}

if (
  operationsTab.includes("journeyFunnelModel.supportingEvents.map")
  && !operationsTab.includes("eventChainHasUsableSample ?")
) {
  failures.push("Supporting Events must be hidden when no usable event sample exists.");
}

requireNotIncludes(operationsTab, "Aggregate event counts alone remain event-volume ratios", "Operations primary visible copy");
requireNotIncludes(operationsTab, "0 compared against 0", "Operations Event Chain copy");
requireNotIncludes(operationsTab, "modeLabel: input.error", "Operations primary visible copy");

requireIncludes(livePulse, 'compactChartHeightClass: "h-28 md:h-56"', "Live Pulse mobile chart height");
requireNotIncludes(livePulse, 'compactChartHeightClass: "h-36 md:h-56"', "Live Pulse mobile chart height");
requireIncludes(livePulse, "mobilePrimaryIdentitySummary", "Live Pulse mobile identity summary");
requireIncludes(livePulse, "mobileCanShowIdentityDetails", "Live Pulse mobile identity summary");
requireIncludes(livePulse, "mobileSurfaceRowsLimit: 2", "Live Pulse mobile surface limit");

for (const needle of [
  "mobileVisibleLiveSurfaces",
  "+{hiddenLiveSurfaceCount} more in Debug",
  "data-admin-analytics-mobile-can-show-identity-details",
  "hidden space-y-1.5 md:block",
  "density=\"compact\"",
]) {
  requireIncludes(operationsTab, needle, "Live Pulse compact mobile rendering");
}

requireIncludes(primitives, 'density?: "default" | "compact"', "SectionCard density prop");
requireIncludes(primitives, "density = \"default\"", "SectionCard density default");
requireIncludes(primitives, "h-7 w-7 rounded-[0.8rem]", "SectionCard compact icon density");

for (const needle of [
  "modeLabel).not.toBe(\"Failed\")",
  "fakeZeroPrevented).toBe(true)",
  "exactUserFunnelAvailable).toBe(false)",
  "measurementMode).toBe(\"event_volume_only\")",
]) {
  requireIncludes(journeySpec, needle, "Event Chain mobile truth tests");
}

for (const needle of [
  "compactChartHeightClass).toBe(\"h-28 md:h-56\")",
  "mobilePrimaryIdentitySummary",
  "mobileSurfaceRowsLimit",
]) {
  requireIncludes(livePulseSpec, needle, "Live Pulse mobile density tests");
}

if (failures.length > 0) {
  console.error("Admin Analytics operations mobile validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Admin Analytics operations mobile validation passed.");
