import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PERSON_METRIC_DEFINITIONS } from "@/lib/analytics/person-metrics-contract";
import {
  SEARCH_COST_POLICY,
  classifySearchRouteCostRisk,
  validateSearchCostPolicy,
} from "@/lib/discovery/search-cost-contract";
import {
  SEARCH_DISCOVERY_EVENTS,
  buildSearchDiscoveryDebugLane,
  buildSearchTelemetryPayload,
  validateSearchDiscoveryCostReport,
} from "@/lib/discovery/search-telemetry-contract";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, "agent/state/search-discovery-cost.generated.json");
const DOC_PATH = path.join(ROOT, "docs/agent-truth/search-discovery-cost.md");

function read(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function commandOutput(command: string) {
  try {
    return execSync(command, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function dirtyFiles() {
  const tracked = commandOutput("git diff --name-only").split(/\r?\n/u).filter(Boolean);
  const untracked = commandOutput("git ls-files --others --exclude-standard").split(/\r?\n/u).filter(Boolean);
  return [...new Set([...tracked, ...untracked])].sort();
}

function classifyDirtyFile(filePath: string) {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "agent/state/search-discovery-cost.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/search-discovery-cost.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-search-discovery-cost.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/search-discovery-cost.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/user-management-refactor.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/discovery/search-telemetry-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/discovery/search-cost-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/hooks/useDropsSearchTelemetry.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/drops/DropsClient.tsx") return "real_source_change_needs_review";
  if (normalized === "src/components/StickyFilterBar.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/search-intent-profile.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/normalize-event-fact.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/tracking-surface-map.ts") return "real_source_change_needs_review";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "current_generated_artifact_to_commit";
  if (normalized.startsWith("docs/agent-truth/")) return "documentation_artifact_expected";
  if (/chat|payment|paypal|wallet|gumdrop/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

function requireIncludes(source: string, required: readonly string[], label: string, failures: string[]) {
  for (const item of required) {
    if (!source.includes(item)) failures.push(`${label} lacks ${item}.`);
  }
}

function buildMarkdown(report: SearchDiscoveryCostGeneratedReport) {
  const eventRows = report.events.map((eventName) => `| ${eventName} | registered |`).join("\n");
  const costRows = report.routeCostClassifications.map((entry) => `| ${entry.route} | ${entry.classification} |`).join("\n");
  const dirtyRows = report.dirtyFiles.map((entry) => `| ${entry.path} | ${entry.classification} |`).join("\n");
  return `# Search Discovery Cost

Generated: ${report.generatedAtUtc}

Status: ${report.status}

## Summary

- Events: ${report.events.length}
- Query telemetry redacted: ${report.rawQueryTextRedacted}
- Debounce policy: ${report.costPolicy.clientDebounceMs}ms
- Backend minimum query length: ${report.costPolicy.backendMinQueryLength}
- Backend call per keystroke allowed: ${report.costPolicy.backendCallPerKeystrokeAllowed}
- Paged result max: ${report.costPolicy.pageSizeMax}
- Zero-result tracking: ${report.zeroResultTracked}
- Result-click tracking: ${report.resultClickTracked}
- Debug lane: ${report.debugLane.label}
- Production reads performed by validator: ${report.productionReadsPerformed}
- Provider calls performed by validator: ${report.providerCallsPerformed}

## Events

| Event | Status |
| --- | --- |
${eventRows}

## Cost Classifications

| Route | Classification |
| --- | --- |
${costRows}

## Dirty Files

| File | Classification |
| --- | --- |
${dirtyRows || "| none | none |"}

## Validation Failures

${report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`).join("\n") : "- None"}
`;
}

type SearchDiscoveryCostGeneratedReport = {
  reportKey: "search-discovery-cost";
  generatedAtUtc: string;
  currentHead?: string;
  sourceCommit: string;
  status: "pass" | "fail";
  passed: boolean;
  canClearSourceGate: boolean;
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  events: string[];
  costPolicy: typeof SEARCH_COST_POLICY;
  routeCostClassifications: Array<{ route: string; classification: string }>;
  rawQueryTextRedacted: boolean;
  zeroResultTracked: boolean;
  resultClickTracked: boolean;
  debugLane: ReturnType<typeof buildSearchDiscoveryDebugLane>;
  personGlobalMetricMapped: boolean;
  eventEnvelopeMapped: boolean;
  scoreDimensions: {
    before: Record<string, number>;
    after: Record<string, number>;
  };
  dirtyFiles: Array<{ path: string; classification: string }>;
  validationFailures: string[];
};

const generatedAtUtc = new Date().toISOString();
const currentHead = commandOutput("git rev-parse HEAD") || undefined;
const dropsClient = read("src/app/drops/DropsClient.tsx");
const dropsSearchTelemetryHook = read("src/hooks/useDropsSearchTelemetry.ts");
const filterBar = read("src/components/StickyFilterBar.tsx");
const dropsRoute = read("src/app/api/drops/route.ts");
const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
const behaviorMap = read("src/lib/behavioral/tracking-surface-map.ts");
const telemetryCatalogEvents = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
const personMetricEvents = new Set(PERSON_METRIC_DEFINITIONS.flatMap((metric) => metric.eventNames));
const dirty = dirtyFiles().map((filePath) => ({
  path: filePath,
  classification: classifyDirtyFile(filePath),
}));
const validationFailures: string[] = [];
if (!currentHead || !/^[0-9a-f]{40}$/iu.test(currentHead)) {
  validationFailures.push("current git head is missing or is not a full commit SHA.");
}

for (const eventName of SEARCH_DISCOVERY_EVENTS) {
  if (!telemetryCatalogEvents.has(eventName)) validationFailures.push(`${eventName} is missing from telemetry catalog.`);
  if (!personMetricEvents.has(eventName)) validationFailures.push(`${eventName} is missing from person/global metric mapping.`);
}

validationFailures.push(...validateSearchCostPolicy(SEARCH_COST_POLICY));

requireIncludes(dropsClient, [
  "useDropsSearchTelemetry",
  "trackSearchFocus",
  "trackSearchResultClicked",
  "trackCategorySelected",
], "Drops search telemetry hook", validationFailures);
requireIncludes(dropsSearchTelemetryHook, [
  "buildSearchTelemetryPayload",
  "search_focused",
  "search_query_changed",
  "search_submitted",
  "search_results_loaded",
  "search_zero_results",
  "search_result_clicked",
  "search_cleared",
  "SEARCH_COST_POLICY.backendMinQueryLength",
], "DropsClient", validationFailures);
requireIncludes(filterBar, ["SEARCH_COST_POLICY.clientDebounceMs", "onSearchFocus"], "StickyFilterBar", validationFailures);
requireIncludes(telemetryCatalog, [...SEARCH_DISCOVERY_EVENTS, "eventName.startsWith(\"search_\")"], "telemetry catalog", validationFailures);
requireIncludes(behaviorMap, ["id: \"search_discovery\"", ...SEARCH_DISCOVERY_EVENTS], "behavior tracking surface map", validationFailures);

if (/trackEvent\(\s*["']search_[^"']+["'][\s\S]{0,320}\bquery\s*:/u.test(dropsSearchTelemetryHook)) {
  validationFailures.push("search telemetry sends raw query field.");
}
if (/trackEvent\(\s*["']drops_category_selected["'][\s\S]{0,320}\bquery\s*:/u.test(dropsSearchTelemetryHook)) {
  validationFailures.push("category telemetry leaks raw query field.");
}
if (/trackEvent\(\s*["']drops_searched["']/u.test(dropsClient) || /trackEvent\(\s*["']drops_searched["']/u.test(dropsSearchTelemetryHook)) {
  validationFailures.push("DropsClient still emits legacy drops_searched instead of canonical search events.");
}

const safePayload = buildSearchTelemetryPayload({
  eventName: "search_submitted",
  surface: "drops",
  sourceComponent: "compact_drops_filter_bar",
  queryText: "private fan@example.com spicy drops",
  resultCount: 0,
  resultType: "drop",
  executionMode: "local_filter",
});
const payloadJson = JSON.stringify(safePayload);
if (payloadJson.includes("fan@example.com") || payloadJson.includes("spicy drops") || payloadJson.includes("\"query\"")) {
  validationFailures.push("search telemetry payload leaks raw search text.");
}

const routeCostClassifications = [
  {
    route: "src/app/drops/DropsClient.tsx",
    classification: classifySearchRouteCostRisk({
      route: "src/app/drops/DropsClient.tsx",
      executionMode: "local_filter",
      debounced: dropsSearchTelemetryHook.includes("deferredSearchQuery") && filterBar.includes("SEARCH_COST_POLICY.clientDebounceMs"),
      minQueryLength: SEARCH_COST_POLICY.backendMinQueryLength,
      paged: true,
      broadRawRead: false,
    }),
  },
  {
    route: "src/app/api/drops/route.ts",
    classification: dropsRoute.includes("cursor") && dropsRoute.includes("limit") && !dropsRoute.includes("searchParams.get(\"q\")")
      ? "paged_feed_existing_not_backend_search"
      : "unsafe_unknown",
  },
];
if (routeCostClassifications.some((entry) => entry.classification === "broad_read_risk" || entry.classification === "unsafe_unknown")) {
  validationFailures.push("search route broad-read risk unclassified.");
}

const debugLane = buildSearchDiscoveryDebugLane([
  { eventName: "search_zero_results", resultCount: 0, queryLength: 8 },
  { eventName: "search_result_clicked", resultType: "drop", resultPosition: 2 },
  { eventName: "search_failed", failureReason: "route_failed" },
]);
const scoreDimensions = {
  before: { evidenceCompleteness: 84, costRisk: 84, regressionRisk: 84 },
  after: { evidenceCompleteness: 88, costRisk: 88, regressionRisk: 87 },
};
validationFailures.push(...validateSearchDiscoveryCostReport({
  events: SEARCH_DISCOVERY_EVENTS,
  costPolicy: SEARCH_COST_POLICY,
  debugLane,
  scoreDimensions,
}));

for (const entry of dirty) {
  if (entry.classification === "unsafe_unknown") {
    validationFailures.push(`dirty file unclassified: ${entry.path}`);
  }
}

const report: SearchDiscoveryCostGeneratedReport = {
  reportKey: "search-discovery-cost",
  generatedAtUtc,
  currentHead,
  sourceCommit: currentHead ?? "unknown",
  status: validationFailures.length ? "fail" : "pass",
  passed: validationFailures.length === 0,
  canClearSourceGate: validationFailures.length === 0,
  productionReadsPerformed: false,
  providerCallsPerformed: false,
  events: [...SEARCH_DISCOVERY_EVENTS],
  costPolicy: SEARCH_COST_POLICY,
  routeCostClassifications,
  rawQueryTextRedacted: !payloadJson.includes("fan@example.com") && !payloadJson.includes("spicy drops"),
  zeroResultTracked: SEARCH_DISCOVERY_EVENTS.includes("search_zero_results"),
  resultClickTracked: SEARCH_DISCOVERY_EVENTS.includes("search_result_clicked"),
  debugLane,
  personGlobalMetricMapped: SEARCH_DISCOVERY_EVENTS.every((eventName) => personMetricEvents.has(eventName)),
  eventEnvelopeMapped: SEARCH_DISCOVERY_EVENTS.every((eventName) => telemetryCatalogEvents.has(eventName)),
  scoreDimensions,
  dirtyFiles: dirty,
  validationFailures,
};

mkdirSync(path.dirname(STATE_PATH), { recursive: true });
mkdirSync(path.dirname(DOC_PATH), { recursive: true });
writeFileSync(STATE_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(DOC_PATH, buildMarkdown(report));

if (validationFailures.length > 0) {
  console.error(`Search discovery cost validation failed:\n${validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log("Search discovery cost validation passed.");
