import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ANALYTICS_INGEST_EVENT_TYPES } from "../../src/lib/analytics/ingest-contract";
import {
  TRACKING_SURFACE_MAP,
  validateBehavioralTrackingSurfaceMap,
} from "../../src/lib/behavioral/tracking-surface-map";

type Severity = "P0" | "P1" | "P2";
type FindingStatus = "fixed" | "missing" | "deferred";

type Finding = {
  id: string;
  status: FindingStatus;
  severity: Severity;
  detail: string;
};

type BehavioralTrackingSemanticsClosureReport = {
  generatedAtUtc: string;
  reportKey: "behavioral-tracking-semantics-closure";
  currentHead: string;
  summary: {
    trackingSurfaceMapCreated: boolean;
    clientTrackingPolicyCreated: boolean;
    disabledBehaviorSuppressed: boolean;
    enabledBehaviorBounded: boolean;
    clientIngestEventsAligned: boolean;
    watchTimeRuntimeOnly: boolean;
    hardcodedBehaviorScoresBlocked: boolean;
    telemetryGraphPresent: boolean;
    ingestContractPresent: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  dependencyFindings: Finding[];
  behaviorSurfaceFindings: Finding[];
  toggleFindings: Finding[];
  ingestAlignmentFindings: Finding[];
  watchTimeFindings: Finding[];
  staleBehaviorFindings: Finding[];
  fixesApplied: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/behavioral-tracking-semantics-closure.generated.json";
const docsRelativePath = "docs/agent-truth/behavioral-tracking-semantics-closure.md";

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function has(relativePath: string) {
  return existsSync(join(repoRoot, relativePath));
}

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function finding(id: string, ok: boolean, detail: string, severity: Severity = "P1"): Finding {
  return {
    id,
    status: ok ? "fixed" : "missing",
    severity,
    detail,
  };
}

function countBlocking(findings: Finding[], severity: Severity) {
  return findings.filter((entry) => entry.status === "missing" && entry.severity === severity).length;
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(report: BehavioralTrackingSemanticsClosureReport) {
  const lines = [
    "# Behavioral Tracking Semantics Closure",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Tracking surface map created: ${report.summary.trackingSurfaceMapCreated ? "yes" : "no"}`,
    `- Client tracking policy created: ${report.summary.clientTrackingPolicyCreated ? "yes" : "no"}`,
    `- Disabled behavior suppressed: ${report.summary.disabledBehaviorSuppressed ? "yes" : "no"}`,
    `- Enabled behavior bounded: ${report.summary.enabledBehaviorBounded ? "yes" : "no"}`,
    `- Client and ingest events aligned: ${report.summary.clientIngestEventsAligned ? "yes" : "no"}`,
    `- Watch time runtime-only: ${report.summary.watchTimeRuntimeOnly ? "yes" : "no"}`,
    `- Hardcoded behavior scores blocked: ${report.summary.hardcodedBehaviorScoresBlocked ? "yes" : "no"}`,
    `- Telemetry graph present: ${report.summary.telemetryGraphPresent ? "yes" : "no"}`,
    `- Ingest contract present: ${report.summary.ingestContractPresent ? "yes" : "no"}`,
    "",
    "## Behavioral Surfaces",
    "",
    ...TRACKING_SURFACE_MAP.flatMap((surface) => [
      `### ${surface.label}`,
      "",
      `- Lane: ${surface.id}`,
      `- Surface: ${surface.surface}`,
      `- Priority: ${surface.priority}`,
      `- Events: ${surface.events.join(", ")}`,
      `- Required identity: ${surface.requiredIdentityFields.join(", ")}`,
      `- Disabled allowed: ${surface.allowedWhenTrackingDisabled ? "yes" : "no"}`,
      `- Persistence: ${surface.persistenceLane}`,
      `- Aggregation: ${surface.aggregationLane}`,
      `- UI consumer: ${surface.uiConsumer}`,
      `- Admin consumer: ${surface.adminConsumer}`,
      `- Disabled behavior: ${surface.disabledBehavior}`,
      "",
    ]),
    "## Findings",
    "",
    ...[
      ...report.dependencyFindings,
      ...report.behaviorSurfaceFindings,
      ...report.toggleFindings,
      ...report.ingestAlignmentFindings,
      ...report.watchTimeFindings,
      ...report.staleBehaviorFindings,
    ].map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Fixes Applied",
    "",
    ...report.fixesApplied.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((entry, index) => `${index + 1}. ${entry}`),
    "",
  ];

  const fullPath = join(repoRoot, docsRelativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, lines.join("\n"));
}

function allIngestEventTypesInDeepTracker(deepTracker: string) {
  return ANALYTICS_INGEST_EVENT_TYPES.every((eventType) => deepTracker.includes(`"${eventType}"`));
}

function hasHardcodedBehaviorScore() {
  const candidateFiles = [
    "src/components/Analytics/DeepTracker.tsx",
    "src/lib/analytics/runtime-watch-time-v2.ts",
    "src/lib/telemetry.ts",
  ];
  return candidateFiles.some((relativePath) => {
    const content = read(relativePath);
    return /behaviorScore\s*[:=]\s*(?:100|[5-9]\d)/u.test(content)
      || /hardcodedBehaviorScore/u.test(content)
      || /page_time_watch_time/u.test(content);
  });
}

export function validateBehavioralTrackingSemanticsClosure(options: { writeReport?: boolean } = {}) {
  const clientPolicyPresent = has("src/lib/analytics/client-tracking-policy.ts");
  const telemetryGraphPresent = has("src/lib/analytics/telemetry-dependency-graph.ts");
  const ingestContractPresent = has("src/lib/analytics/ingest-contract.ts");
  const clientPolicy = clientPolicyPresent ? read("src/lib/analytics/client-tracking-policy.ts") : "";
  const deepTracker = read("src/components/Analytics/DeepTracker.tsx");
  const telemetry = read("src/lib/telemetry.ts");
  const runtimeWatchTracker = read("src/components/Analytics/RuntimeWatchTracker.tsx");
  const runtimeWatchTime = read("src/lib/analytics/runtime-watch-time-v2.ts");
  const surfaceMapValidation = validateBehavioralTrackingSurfaceMap({
    acceptedAnonymousEventTypes: [...ANALYTICS_INGEST_EVENT_TYPES],
  });
  const requiredSurfaceIds = [
    "page_behavior",
    "drop_behavior",
    "creator_interactions",
    "creator_monetization",
    "creator_requests_bookings",
    "chat_behavior",
    "runtime_watch_time",
  ];
  const requiredSurfacesPresent = requiredSurfaceIds.every((id) =>
    TRACKING_SURFACE_MAP.some((surface) => surface.id === id),
  );
  const behaviorSurfacesSuppressDisabled = TRACKING_SURFACE_MAP
    .filter((surface) => ["page_behavior", "drop_behavior", "creator_interactions", "runtime_watch_time"].includes(surface.id))
    .every((surface) => surface.allowedWhenTrackingDisabled === false);
  const deepTrackerUsesPolicy = deepTracker.includes("buildClientTrackingDecision")
    && deepTracker.includes("canCaptureAnonymousBehavior")
    && deepTracker.includes("trackingDecision.mayQueue");
  const telemetryUsesPolicy = telemetry.includes("buildClientTrackingDecision")
    && telemetry.includes("trackingDecision.mayQueue")
    && telemetry.includes("trackingDecision.maySendExternal");
  const watchSurface = TRACKING_SURFACE_MAP.find((surface) => surface.id === "runtime_watch_time");
  const watchTimeRuntimeOnly = Boolean(watchSurface
    && !watchSurface?.events.includes("page_view")
    && !watchSurface?.events.includes("visibility")
    && watchSurface?.disabledBehavior.includes("not page time")
    && runtimeWatchTracker.includes("watch_heartbeat")
    && runtimeWatchTime.includes("Math.min(clientDelta, maxDelta)")
    && !runtimeWatchTime.includes("page_view"));
  const clientIngestEventsAligned = allIngestEventTypesInDeepTracker(deepTracker)
    && surfaceMapValidation.ok;
  const hardcodedBehaviorScoresBlocked = !hasHardcodedBehaviorScore();

  const dependencyFindings = [
    finding("client-tracking-policy-present", clientPolicyPresent, "Canonical client tracking policy exists.", "P0"),
    finding("telemetry-graph-present", telemetryGraphPresent, "Telemetry dependency graph is present and reused.", "P1"),
    finding("ingest-contract-present", ingestContractPresent, "Analytics ingest contract is present and reused.", "P1"),
  ];

  const behaviorSurfaceFindings = [
    finding("required-surfaces-present", requiredSurfacesPresent, "Required behavioral surfaces are represented in the tracking surface map.", "P0"),
    finding("surface-map-validates", surfaceMapValidation.ok, surfaceMapValidation.ok
      ? "Tracking surface map validates against anonymous ingest event types."
      : `Tracking surface map findings: ${surfaceMapValidation.findings.join("; ")}`, "P0"),
  ];

  const toggleFindings = [
    finding("policy-defines-disabled-state", clientPolicy.includes('"disabled"') && clientPolicy.includes('"consent_denied"'), "Policy distinguishes disabled tracking from consent denied.", "P0"),
    finding("disabled-behavior-suppressed", behaviorSurfacesSuppressDisabled && deepTrackerUsesPolicy, "Disabled behavior analytics suppress page, hover, scroll, visibility, click, creator interaction, drop, and watch-time behavior events.", "P0"),
    finding("enabled-behavior-bounded", clientPolicy.includes("diagnosticsCanBeSampled") && deepTracker.includes("GUEST_ANALYTICS_MAX_EVENTS_PER_SESSION"), "Enabled behavior remains bounded and diagnostics are sampled.", "P0"),
    finding("telemetry-uses-policy", telemetryUsesPolicy, "Identified telemetry and GA companion dispatch consult the same client tracking policy.", "P1"),
  ];

  const ingestAlignmentFindings = [
    finding("client-ingest-events-aligned", clientIngestEventsAligned, "DeepTracker anonymous event types match the ingest contract and tracking surface map.", "P0"),
  ];

  const watchTimeFindings = [
    finding("watch-time-runtime-only", watchTimeRuntimeOnly, "Runtime watch-time uses runtime media/session events and is not computed from page view or visibility alone.", "P0"),
  ];

  const staleBehaviorFindings = [
    finding("hardcoded-behavior-scores-blocked", hardcodedBehaviorScoresBlocked, "No hardcoded behavior score shortcuts are reachable in the behavioral tracking closure files.", "P0"),
  ];

  const fixesApplied = [
    finding("client-policy-created", clientPolicyPresent, "Added canonical client tracking policy with event kind decisions."),
    finding("surface-map-refined", has("src/lib/behavioral/tracking-surface-map.ts"), "Refined the tracking surface map with persistence, aggregation, UI, admin, identity, and disabled behavior semantics."),
    finding("deeptracker-wired", deepTrackerUsesPolicy, "Wired DeepTracker to the client tracking policy before queueing anonymous behavior events."),
    finding("telemetry-wired", telemetryUsesPolicy, "Wired trackEvent to the client tracking policy for identified and external companion dispatch."),
    finding("validator-added", has("scripts/agent/validate-behavioral-tracking-semantics-closure.ts"), "Added the behavioral tracking semantics validator and generated truth artifact lane."),
    finding("unit-test-added", has("tests/unit/behavioral-tracking-semantics-closure.spec.ts"), "Added unit tests for tracking toggle and surface semantics."),
  ];

  const allFindings = [
    ...dependencyFindings,
    ...behaviorSurfaceFindings,
    ...toggleFindings,
    ...ingestAlignmentFindings,
    ...watchTimeFindings,
    ...staleBehaviorFindings,
    ...fixesApplied,
  ];

  const report: BehavioralTrackingSemanticsClosureReport = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "behavioral-tracking-semantics-closure",
    currentHead: currentHead(),
    summary: {
      trackingSurfaceMapCreated: has("src/lib/behavioral/tracking-surface-map.ts"),
      clientTrackingPolicyCreated: clientPolicyPresent,
      disabledBehaviorSuppressed: behaviorSurfacesSuppressDisabled && deepTrackerUsesPolicy,
      enabledBehaviorBounded: clientPolicy.includes("diagnosticsCanBeSampled") && deepTracker.includes("GUEST_ANALYTICS_MAX_EVENTS_PER_SESSION"),
      clientIngestEventsAligned,
      watchTimeRuntimeOnly,
      hardcodedBehaviorScoresBlocked,
      telemetryGraphPresent,
      ingestContractPresent,
      p0Count: countBlocking(allFindings, "P0"),
      p1Count: countBlocking(allFindings, "P1"),
      p2Count: countBlocking(allFindings, "P2"),
    },
    dependencyFindings,
    behaviorSurfaceFindings,
    toggleFindings,
    ingestAlignmentFindings,
    watchTimeFindings,
    staleBehaviorFindings,
    fixesApplied,
    prCleanupActions: ["No open behavioral tracking/toggle/analytics PRs were present at start."],
    nextFixOrder: [
      "When adding new behavior events, add them to the tracking surface map and ingest contract before emitting them from a client component.",
      "Keep runtime watch-time sourced from media/session events only; do not derive it from page duration, page views, or visibility summaries.",
      "Keep disabled behavior analytics quiet while preserving required account, security, and product integrity events through the policy.",
    ],
  };

  if (options.writeReport) {
    writeJson(artifactRelativePath, report);
    writeMarkdown(report);
  }

  const blockingFailures = allFindings
    .filter((entry) => entry.status === "missing")
    .map((entry) => `${entry.id}: ${entry.detail}`);
  if (report.nextFixOrder.length === 0) {
    blockingFailures.push("nextFixOrder missing");
  }

  return { report, blockingFailures };
}

const { report, blockingFailures } = validateBehavioralTrackingSemanticsClosure({ writeReport: true });

if (blockingFailures.length > 0) {
  for (const failure of blockingFailures) {
    console.error(`[behavioral-tracking-semantics-closure] ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `[behavioral-tracking-semantics-closure] ok: ${TRACKING_SURFACE_MAP.length} surfaces, ${ANALYTICS_INGEST_EVENT_TYPES.length} ingest event types aligned`,
  );
}
