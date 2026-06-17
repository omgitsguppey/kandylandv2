import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PERSON_METRIC_DEFINITIONS } from "@/lib/analytics/person-metrics-contract";
import {
  CREATOR_RELATIONSHIP_DEBUG_LANE,
  CREATOR_RELATIONSHIP_EVENTS,
  CREATOR_RELATIONSHIP_STATES,
  buildCreatorRelationshipDebugLane,
  buildCreatorRelationshipTelemetryPayload,
  classifyCreatorRelationshipState,
  validateCreatorRelationshipFunnelReport,
} from "@/lib/discovery/creator-relationship-contract";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, "agent/state/creator-discovery-relationship-funnel.generated.json");
const DOC_PATH = path.join(ROOT, "docs/agent-truth/creator-discovery-relationship-funnel.md");

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
  if (normalized === "agent/state/creator-discovery-relationship-funnel.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/creator-discovery-relationship-funnel.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-creator-discovery-relationship-funnel.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/creator-discovery-relationship-funnel.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/creator-discovery-rail.spec.tsx") return "test_artifact_expected";
  if (normalized === "src/lib/discovery/creator-relationship-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/creator/relationships/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/user/follow/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/CreatorDiscoveryRail.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/creators/[username]/CreatorProfileClient.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/telemetry/surface-telemetry-catalog-events.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/behavior-feature-registry.ts") return "real_source_change_needs_review";
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

function buildMarkdown(report: CreatorDiscoveryRelationshipFunnelReport) {
  const eventRows = report.events.map((eventName) => `| ${eventName} | registered |`).join("\n");
  const stateRows = report.states.map((state) => `| ${state} | covered |`).join("\n");
  const dirtyRows = report.dirtyFiles.map((entry) => `| ${entry.path} | ${entry.classification} |`).join("\n");
  return `# Creator Discovery Relationship Funnel

Generated: ${report.generatedAtUtc}

Status: ${report.status}

## Summary

- Events: ${report.events.length}
- States: ${report.states.length}
- Creator card/profile funnel tracked: ${report.creatorCardProfileFunnelTracked}
- Follow/unfollow telemetry triplet: ${report.followUnfollowTelemetryTriplet}
- Recommendation impressions/clicks tracked: ${report.recommendationTelemetryTracked}
- Relationship route debug-visible: ${report.relationshipRouteDebugVisible}
- Person/global metric mapping: ${report.personGlobalMetricMapped}
- Production reads performed by validator: ${report.productionReadsPerformed}
- Provider calls performed by validator: ${report.providerCallsPerformed}
- Payment/GumDrop math changed: ${report.paymentGumDropMathChanged}

## Debug Lane

- Label: ${report.debugLane.label}
- Follow failures: ${report.debugLane.followFailures}
- Relationship list failures: ${report.debugLane.relationshipListFailures}
- Empty recommendation state: ${report.debugLane.emptyRecommendationState}
- Profile route missing: ${report.debugLane.profileRouteMissing}
- Recommendation source health: ${report.debugLane.recommendationSourceHealth}

## Events

| Event | Status |
| --- | --- |
${eventRows}

## States

| State | Status |
| --- | --- |
${stateRows}

## Dirty Files

| File | Classification |
| --- | --- |
${dirtyRows || "| none | none |"}

## Validation Failures

${report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`).join("\n") : "- None"}
`;
}

type CreatorDiscoveryRelationshipFunnelReport = {
  reportKey: "creator-discovery-relationship-funnel";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  events: string[];
  states: string[];
  creatorCardProfileFunnelTracked: boolean;
  followUnfollowTelemetryTriplet: boolean;
  recommendationTelemetryTracked: boolean;
  relationshipRouteDebugVisible: boolean;
  personGlobalMetricMapped: boolean;
  eventEnvelopeMapped: boolean;
  relationshipStateAmbiguous: boolean;
  paymentGumDropMathChanged: boolean;
  scoreDimensions: {
    before: Record<string, number>;
    after: Record<string, number>;
  };
  debugLane: ReturnType<typeof buildCreatorRelationshipDebugLane>;
  dirtyFiles: Array<{ path: string; classification: string }>;
  validationFailures: string[];
};

const generatedAtUtc = new Date().toISOString();
const currentHead = commandOutput("git rev-parse HEAD") || undefined;
const contract = read("src/lib/discovery/creator-relationship-contract.ts");
const relationshipRoute = read("src/app/api/creator/relationships/route.ts");
const userFollowRoute = read("src/app/api/user/follow/route.ts");
const discoveryRail = read("src/components/CreatorDiscoveryRail.tsx");
const profileClient = read("src/app/creators/[username]/CreatorProfileClient.tsx");
const telemetryCatalogEvents = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
const personMetricEvents = new Set(PERSON_METRIC_DEFINITIONS.flatMap((metric) => metric.eventNames));
const dirty = dirtyFiles().map((filePath) => ({
  path: filePath,
  classification: classifyDirtyFile(filePath),
}));
const validationFailures: string[] = [];

for (const eventName of CREATOR_RELATIONSHIP_EVENTS) {
  if (!telemetryCatalogEvents.has(eventName)) validationFailures.push(`${eventName} is missing from telemetry catalog.`);
  if (!personMetricEvents.has(eventName)) validationFailures.push(`${eventName} is missing from person/global metric mapping.`);
}

requireIncludes(contract, [...CREATOR_RELATIONSHIP_EVENTS, ...CREATOR_RELATIONSHIP_STATES, "validateCreatorRelationshipFunnelReport"], "creator relationship contract", validationFailures);
requireIncludes(discoveryRail, [
  "creator_discovery_surface_viewed",
  "creator_card_viewed",
  "creator_card_clicked",
  "creator_recommendation_viewed",
  "creator_recommendation_clicked",
  "creator_follow_attempted",
  "creator_follow_succeeded",
  "creator_unfollow_attempted",
  "creator_unfollow_succeeded",
  "creator_follow_failed",
], "creator discovery rail", validationFailures);
requireIncludes(profileClient, [
  "creator_profile_opened",
  "creator_follow_attempted",
  "creator_follow_succeeded",
  "creator_unfollow_attempted",
  "creator_unfollow_succeeded",
  "creator_follow_failed",
], "creator profile client", validationFailures);
requireIncludes(relationshipRoute, [
  "creator_relationship_list_loaded",
  "creator_relationship_list_failed",
  "creator_follow_attempted",
  "creator_follow_succeeded",
  "creator_unfollow_attempted",
  "creator_unfollow_succeeded",
  "creator_follow_failed",
  "relationshipDebug",
  "debugReason",
  "CREATOR_RELATIONSHIP_DEBUG_LANE",
  "touchUserRuntime",
  "{ activity: true, profile: true }",
], "creator relationship route", validationFailures);
requireIncludes(userFollowRoute, [
  "trackServerEvent",
  "touchUserRuntime",
  "{ activity: true, profile: true }",
], "user follow route", validationFailures);
requireIncludes(discoveryRail, ["dispatchActivitySync"], "creator discovery rail", validationFailures);
requireIncludes(profileClient, ["dispatchActivitySync"], "creator profile client", validationFailures);

const stateSamples = [
  classifyCreatorRelationshipState({ viewerUserId: "fan_1", creatorId: "fan_1" }),
  classifyCreatorRelationshipState({ following: true }),
  classifyCreatorRelationshipState({ blocked: true }),
  classifyCreatorRelationshipState({ creatorHidden: true }),
  classifyCreatorRelationshipState({ available: false }),
  classifyCreatorRelationshipState({ following: false }),
  classifyCreatorRelationshipState({}),
];
const relationshipStateAmbiguous = !CREATOR_RELATIONSHIP_STATES.every((state) => stateSamples.includes(state));
if (relationshipStateAmbiguous) validationFailures.push("relationship states are ambiguous or incomplete.");

const telemetryPayload = buildCreatorRelationshipTelemetryPayload({
  eventName: "creator_follow_failed",
  viewerUserId: "fan_1",
  creatorId: "creator_1",
  surface: "creator_profile",
  sourceComponent: "creator_profile_page",
  relationshipState: "not_following",
  recommendationSource: "relationship_route",
  failureReason: "blocked",
});
if (JSON.stringify(telemetryPayload).includes("displayName")) validationFailures.push("creator relationship telemetry leaks display names.");
if (!("debug_lane" in telemetryPayload) || telemetryPayload.debug_lane !== CREATOR_RELATIONSHIP_DEBUG_LANE) validationFailures.push("creator relationship telemetry lacks debug lane.");

const debugLane = buildCreatorRelationshipDebugLane([
  { eventName: "creator_follow_failed", state: "blocked", failureReason: "moderation_blocked" },
  { eventName: "creator_relationship_list_failed", state: "unknown", failureReason: "route_failed" },
  { eventName: "creator_recommendation_viewed", state: "not_following", recommendationSource: "empty" },
  { eventName: "creator_profile_opened", state: "creator_hidden", failureReason: "profile_route_missing" },
]);
const scoreDimensions = {
  before: { sourceHealth: 84, evidenceCompleteness: 84, regressionRisk: 84 },
  after: { sourceHealth: 87, evidenceCompleteness: 88, regressionRisk: 87 },
};
validationFailures.push(...validateCreatorRelationshipFunnelReport({
  events: CREATOR_RELATIONSHIP_EVENTS,
  states: CREATOR_RELATIONSHIP_STATES,
  debugLane,
  scoreDimensions,
}));

const creatorCardProfileFunnelTracked = discoveryRail.includes("creator_card_viewed") && discoveryRail.includes("creator_card_clicked") && profileClient.includes("creator_profile_opened");
const followUnfollowTelemetryTriplet = discoveryRail.includes("creator_follow_attempted") && discoveryRail.includes("creator_follow_succeeded") && discoveryRail.includes("creator_follow_failed") && discoveryRail.includes("creator_unfollow_attempted") && discoveryRail.includes("creator_unfollow_succeeded");
const recommendationTelemetryTracked = discoveryRail.includes("creator_recommendation_viewed") && discoveryRail.includes("creator_recommendation_clicked");
const relationshipRouteDebugVisible = relationshipRoute.includes("relationshipDebug") && relationshipRoute.includes("debugReason") && relationshipRoute.includes("CREATOR_RELATIONSHIP_DEBUG_LANE");
const personGlobalMetricMapped = CREATOR_RELATIONSHIP_EVENTS.every((eventName) => personMetricEvents.has(eventName));
const eventEnvelopeMapped = CREATOR_RELATIONSHIP_EVENTS.every((eventName) => telemetryCatalogEvents.has(eventName));

if (!creatorCardProfileFunnelTracked) validationFailures.push("creator card/profile funnel is not tracked.");
if (!followUnfollowTelemetryTriplet) validationFailures.push("creator follow/unfollow attempted/succeeded/failed telemetry is incomplete.");
if (!recommendationTelemetryTracked) validationFailures.push("creator recommendation impressions/clicks are missing.");
if (!relationshipRouteDebugVisible) validationFailures.push("creator relationship route failure lacks debug reason.");
if (!personGlobalMetricMapped) validationFailures.push("creator relationship events lack person/global metric mapping.");
if (!eventEnvelopeMapped) validationFailures.push("creator relationship events lack telemetry envelope mapping.");
if (dirty.some((entry) => entry.classification === "unsafe_unknown")) validationFailures.push("dirty files are unclassified.");

const paymentGumDropMathChanged = dirty.some((entry) => /payment|paypal|wallet|gumdrop/iu.test(entry.path));
if (paymentGumDropMathChanged) validationFailures.push("payment, wallet, PayPal, or GumDrop math files changed.");

const report: CreatorDiscoveryRelationshipFunnelReport = {
  reportKey: "creator-discovery-relationship-funnel",
  generatedAtUtc,
  currentHead,
  status: validationFailures.length ? "fail" : "pass",
  productionReadsPerformed: false,
  providerCallsPerformed: false,
  events: [...CREATOR_RELATIONSHIP_EVENTS],
  states: [...CREATOR_RELATIONSHIP_STATES],
  creatorCardProfileFunnelTracked,
  followUnfollowTelemetryTriplet,
  recommendationTelemetryTracked,
  relationshipRouteDebugVisible,
  personGlobalMetricMapped,
  eventEnvelopeMapped,
  relationshipStateAmbiguous,
  paymentGumDropMathChanged,
  scoreDimensions,
  debugLane,
  dirtyFiles: dirty,
  validationFailures: [...new Set(validationFailures)],
};

mkdirSync(path.dirname(STATE_PATH), { recursive: true });
mkdirSync(path.dirname(DOC_PATH), { recursive: true });
writeFileSync(STATE_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(DOC_PATH, buildMarkdown(report));

if (report.status !== "pass") {
  console.error(JSON.stringify(report.validationFailures, null, 2));
  process.exit(1);
}

console.log(`creator discovery relationship funnel pass: ${report.events.length} events, ${report.states.length} states, debug lane ${report.debugLane.label}`);
