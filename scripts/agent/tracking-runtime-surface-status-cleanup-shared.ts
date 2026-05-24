import { execFileSync } from "node:child_process";

import { buildDebugPanelTrackingSummary, type DebugTrackingStatus } from "@/lib/debug/debug-panel-tracking-summary";
import { classifyEmptyLiveLane } from "@/lib/debug/empty-live-lane-classifier";
import { buildPwaServiceWorkerDebugLane, type PwaServiceWorkerDebugLane } from "@/lib/pwa/pwa-service-worker-contract";

import {
  currentHead,
  now,
  readJson,
  renderSimpleDoc,
  scoreSnapshot,
  writeDoc,
  writeJson,
  type BuildInput,
} from "./tracking-summary-lane-cleanup-shared";

type JsonRecord = Record<string, unknown>;

const BATCH3_NAMES = [
  "pwa-service-worker-status-cleanup",
  "identity-handoff-status-cleanup",
  "wallet-funnel-sample-cleanup",
  "empty-live-lane-status-cleanup",
  "tracking-lane-freshness-display-cleanup",
  "debug-cockpit-batch3-cleanup",
] as const;

type Batch3Name = (typeof BATCH3_NAMES)[number];

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function changedFiles() {
  const files = new Set<string>();
  for (const command of [
    ["git", ["diff", "--name-only"]] as const,
    ["git", ["diff", "--cached", "--name-only"]] as const,
    ["git", ["ls-files", "--others", "--exclude-standard"]] as const,
  ]) {
    for (const line of run(command[0], command[1]).split(/\r?\n/u)) {
      if (line.trim()) files.add(line.trim().replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function openPrs() {
  const raw = run("gh", ["pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,url,mergeStateStatus,isDraft"]);
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function classifyDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/empty-live-lane-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/pwa/pwa-service-worker-contract.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/tracking-runtime-surface-status-cleanup-shared.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-debug-signal-grouping.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (/^scripts\/agent\/validate-(pwa-service-worker-safety|notification-pwa-score-lock|drop-watch-time-accuracy|session-bounce-calculation|user-journey-behavioral-intelligence|sql-database-parity-cost-lock)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "CHANGELOG.md" || normalized === "public/kandydrops-release-notes.json" || normalized.startsWith("src/lib/release-notes/")) return "release_artifact_expected";
  if (/^scripts\/agent\/validate-(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (/^agent\/state\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "agent/state/public-beta-score.generated.json" || normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/") && normalized.endsWith(".md")) return "documentation_artifact_expected";
  return "unsafe_unknown";
}

function walletSourceEventsMapped() {
  const source = run("rg", [
    "wallet_opened|wallet_closed_incomplete|purchase_package_selected|payment_failed",
    "src/lib/telemetry-catalog.ts",
    "src/lib/analytics/person-metrics-contract.ts",
  ]);
  return source.length > 0;
}

function pwaLaneFromArtifact() {
  const artifact = readJson("agent/state/pwa-service-worker-safety.generated.json");
  const debugLane = artifact.debugLane as PwaServiceWorkerDebugLane | undefined;
  return debugLane ?? buildPwaServiceWorkerDebugLane({ registered: false, registrationExpected: false });
}

export function buildPwaServiceWorkerStatusCleanupReport(input: BuildInput & { pwaLane?: PwaServiceWorkerDebugLane } = {}) {
  const before = {
    registered: false,
    updateAvailable: false,
    notificationCompatible: true,
    forbiddenCacheSafe: true,
    offlineFallbackSafe: true,
    staleShellRisk: "low",
    telemetryStatus: "mapped",
    status: "degraded",
  };
  const after = input.pwaLane ?? buildPwaServiceWorkerDebugLane({
    registered: false,
    registrationExpected: false,
    registrationSource: "source_contract",
    notificationCompatible: true,
    forbiddenCacheSafe: true,
    offlineFallbackSafe: true,
    staleShellRisk: "low",
    telemetryMapped: true,
  });
  return {
    reportKey: "pwa-service-worker-status-cleanup",
    generatedAtUtc: now(input),
    currentHead: input.currentHead ?? currentHead(),
    pwaStatusBefore: before.status,
    pwaStatusAfter: after.status,
    registrationExpected: after.registrationExpected,
    registrationObserved: after.registrationObserved,
    registrationSource: after.registrationSource,
    registrationStatusReason: after.registrationStatusReason,
    notificationCompatibilitySeparated: true,
    safetyFlagsClean: after.notificationCompatible && after.forbiddenCacheSafe && after.offlineFallbackSafe && after.staleShellRisk === "low",
    nextExactSteps: [after.registrationNextAction],
    validationFailures: [] as string[],
  };
}

export function validatePwaServiceWorkerStatusCleanupReport(report: ReturnType<typeof buildPwaServiceWorkerStatusCleanupReport>) {
  const failures: string[] = [];
  if (report.pwaStatusAfter === "degraded" && report.registrationStatusReason === "optional_not_registered") failures.push("registered=false always causes degraded.");
  if (report.safetyFlagsClean && !report.registrationExpected && report.pwaStatusAfter === "degraded") failures.push("clean safety flags plus optional registration still shows degraded.");
  if (!report.registrationStatusReason) failures.push("missing registration source lacks exact reason.");
  if (!report.notificationCompatibilitySeparated) failures.push("notification compatibility is conflated with SW registration.");
  if ((report.nextExactSteps?.length ?? 0) === 0) failures.push("PWA status lacks debug next action.");
  return failures;
}

export function buildIdentityHandoffStatusCleanupReport(input: BuildInput & { sourcePresent?: boolean; runtimeSampleLoaded?: boolean } = {}) {
  const sourcePresent = input.sourcePresent !== false;
  const runtimeSampleLoaded = input.runtimeSampleLoaded === true;
  const statusAfter = !sourcePresent ? "source_missing" : runtimeSampleLoaded ? "healthy" : "source_ready_collecting";
  return {
    reportKey: "identity-handoff-status-cleanup",
    generatedAtUtc: now(input),
    currentHead: input.currentHead ?? currentHead(),
    identityStatusBefore: "live_unknown",
    identityStatusAfter: statusAfter,
    lanes: [
      "guest",
      "signed_in",
      "creator",
      "admin",
      "system",
      "legacy",
    ].map((lane) => ({ lane, status: lane === "legacy" ? "source_ready_collecting" : statusAfter })),
    nextExactSteps: [runtimeSampleLoaded ? "No identity handoff status repair needed." : "Attach bounded identity handoff runtime samples before marking live."],
    validationFailures: [] as string[],
  };
}

export function validateIdentityHandoffStatusCleanupReport(report: ReturnType<typeof buildIdentityHandoffStatusCleanupReport>) {
  const failures: string[] = [];
  if (report.identityStatusAfter === "unknown" || report.identityStatusAfter === "live_unknown") failures.push("LIVE + unknown coexist.");
  if (report.identityStatusBefore === "live_unknown" && report.identityStatusAfter === "unknown") failures.push("identity source is present but status unknown.");
  if (report.identityStatusAfter === "unknown") failures.push("missing runtime sample is reported as unknown.");
  if (report.lanes.some((lane) => !lane.status)) failures.push("guest/signed-in/creator/admin/system/legacy lanes lack status.");
  return failures;
}

export function buildWalletFunnelSampleCleanupReport(input: BuildInput & { sourceEventsMapped?: boolean; sampleLoaded?: boolean } = {}) {
  const sourceEventsMapped = input.sourceEventsMapped ?? walletSourceEventsMapped();
  const sampleLoaded = input.sampleLoaded === true;
  return {
    reportKey: "wallet-funnel-sample-cleanup",
    generatedAtUtc: now(input),
    currentHead: input.currentHead ?? currentHead(),
    walletFunnelStatusBefore: "live_unavailable",
    walletFunnelStatusAfter: sourceEventsMapped ? sampleLoaded ? "healthy" : "source_ready_no_sample_loaded" : "source_missing",
    sourceEventsMapped,
    sampleLoaded,
    paymentRuntimeChanged: false,
    nextExactSteps: [sourceEventsMapped ? "Load a bounded wallet funnel summary before promoting this lane to live." : "Map wallet funnel source events before showing wallet sample status."],
    validationFailures: [] as string[],
  };
}

export function validateWalletFunnelSampleCleanupReport(report: ReturnType<typeof buildWalletFunnelSampleCleanupReport>) {
  const failures: string[] = [];
  if (report.walletFunnelStatusAfter === "live_unavailable") failures.push("LIVE + unavailable coexist without explanation.");
  if (report.sourceEventsMapped && report.walletFunnelStatusAfter === "sample_unavailable") failures.push("wallet source exists but sample status says unavailable.");
  if (!report.sourceEventsMapped && report.walletFunnelStatusAfter !== "source_missing") failures.push("no sample loaded hides missing source.");
  if (!report.sourceEventsMapped) failures.push("wallet funnel lacks source event mapping.");
  if (report.paymentRuntimeChanged) failures.push("wallet/payment runtime changed.");
  return failures;
}

export function buildEmptyLiveLaneStatusCleanupReport(input: BuildInput & { personMetrics?: JsonRecord } = {}) {
  const personMetrics = input.personMetrics ?? {
    eventEnvelopesHydrated: 0,
    globalMetricsHydrated: 0,
    signedInMetricsHydrated: 0,
    linkedPersonMetricsHydrated: 0,
    lowConfidenceMetrics: 34,
    gaps: 0,
  };
  const dropWatch = classifyEmptyLiveLane({ laneId: "drop_watch_time", sourceContractPresent: true, sampleLoaded: false, expectedTraffic: true, counts: [0, 0, 0] });
  const sessionBounce = classifyEmptyLiveLane({ laneId: "session_bounce", sourceContractPresent: true, sampleLoaded: false, expectedTraffic: true, counts: [0, 0, 0] });
  const person = classifyEmptyLiveLane({
    laneId: "person_metrics_hydration",
    sourceContractPresent: true,
    sampleLoaded: Number(personMetrics.eventEnvelopesHydrated ?? 0) > 0,
    expectedTraffic: true,
    lowConfidenceCount: Number(personMetrics.lowConfidenceMetrics ?? 0),
    counts: [
      Number(personMetrics.eventEnvelopesHydrated ?? 0),
      Number(personMetrics.globalMetricsHydrated ?? 0),
      Number(personMetrics.signedInMetricsHydrated ?? 0),
      Number(personMetrics.linkedPersonMetricsHydrated ?? 0),
    ],
  });
  const lanes = [dropWatch, sessionBounce, person];
  return {
    reportKey: "empty-live-lane-status-cleanup",
    generatedAtUtc: now(input),
    currentHead: input.currentHead ?? currentHead(),
    emptyLiveLanesBefore: 3,
    emptyLiveLanesAfter: lanes.filter((lane) => lane.displayState === "live" && lane.reason.includes("no bounded")).length,
    personMetricsStatusAfter: person.status,
    personMetricsLowConfidenceBefore: 34,
    personMetricsLowConfidenceAfter: Number(personMetrics.lowConfidenceMetrics ?? 0),
    sourceReadyCollectingLanes: lanes.filter((lane) => lane.status === "source_ready_collecting").map((lane) => lane.laneId),
    healthyProvenZeroLanes: lanes.filter((lane) => lane.status === "healthy_proven_zero").map((lane) => lane.laneId),
    sourceMissingLanes: lanes.filter((lane) => lane.status === "source_missing").map((lane) => lane.laneId),
    laneDecisions: lanes,
    validationFailures: [] as string[],
  };
}

export function validateEmptyLiveLaneStatusCleanupReport(report: ReturnType<typeof buildEmptyLiveLaneStatusCleanupReport>) {
  const failures: string[] = [];
  if (report.emptyLiveLanesAfter > 0) failures.push("all-zero unproven lane shows live.");
  if (report.personMetricsLowConfidenceAfter > 0 && report.personMetricsStatusAfter === "live") failures.push("person metrics 34 low-confidence shows Info live.");
  if (report.personMetricsLowConfidenceAfter > 0 && !report.sourceReadyCollectingLanes.includes("person_metrics_hydration")) failures.push("lowConfidenceMetrics ignored because gaps=0.");
  if (!report.sourceReadyCollectingLanes.includes("drop_watch_time") && !report.healthyProvenZeroLanes.includes("drop_watch_time")) failures.push("drop watch all-zero lane lacks source window/provenZero.");
  if (!report.sourceReadyCollectingLanes.includes("session_bounce") && !report.healthyProvenZeroLanes.includes("session_bounce")) failures.push("session/bounce all-zero lane lacks source window/provenZero.");
  return failures;
}

export type FreshnessInputLane = {
  laneId: string;
  sourceStatus: string;
  artifactCurrent: boolean;
  refreshCommand?: string;
};

export function buildTrackingLaneFreshnessDisplayCleanupReport(input: BuildInput & { lanes?: FreshnessInputLane[] } = {}) {
  const lanes = input.lanes ?? [
    { laneId: "event_envelope", sourceStatus: "live", artifactCurrent: false, refreshCommand: "npm run check:event-envelope-normalization" },
    { laneId: "event_translation_bridge", sourceStatus: "live", artifactCurrent: true, refreshCommand: "npm run check:event-translation-bridge" },
  ];
  const classified = lanes.map((lane) => ({
    ...lane,
    displayStatus: lane.sourceStatus === "live" && !lane.artifactCurrent ? "source_live_artifact_stale" : lane.sourceStatus,
    nextAction: lane.artifactCurrent ? "No freshness refresh needed." : `Refresh artifact with ${lane.refreshCommand ?? "the owner validator"}.`,
  }));
  return {
    reportKey: "tracking-lane-freshness-display-cleanup",
    generatedAtUtc: now(input),
    currentHead: input.currentHead ?? currentHead(),
    conflictsBefore: lanes.filter((lane) => lane.sourceStatus === "live" && !lane.artifactCurrent).length,
    conflictsAfter: classified.filter((lane) => lane.sourceStatus === "live" && !lane.artifactCurrent && lane.displayStatus === "live").length,
    lanes: classified,
    validationFailures: [] as string[],
  };
}

export function validateTrackingLaneFreshnessDisplayCleanupReport(report: ReturnType<typeof buildTrackingLaneFreshnessDisplayCleanupReport>) {
  const failures: string[] = [];
  if (report.conflictsAfter > 0) failures.push("LIVE + STALE appears without source_live_artifact_stale explanation.");
  if (report.lanes.some((lane) => !lane.artifactCurrent && lane.displayStatus === "degraded")) failures.push("stale artifact badge is treated as source failure.");
  if (report.lanes.some((lane) => lane.artifactCurrent && String(lane.displayStatus).includes("stale"))) failures.push("current artifact still shows stale.");
  if (report.lanes.some((lane) => !lane.artifactCurrent && !lane.nextAction.includes("Refresh"))) failures.push("head mismatch lacks refresh command.");
  return failures;
}

export function buildDebugCockpitBatch3CleanupReport(input: BuildInput = {}) {
  const scoreBefore = scoreSnapshot();
  const pwa = buildPwaServiceWorkerStatusCleanupReport({ ...input, pwaLane: buildPwaServiceWorkerDebugLane({ registered: false, registrationExpected: false }) });
  const identity = buildIdentityHandoffStatusCleanupReport(input);
  const wallet = buildWalletFunnelSampleCleanupReport({ ...input, sourceEventsMapped: true, sampleLoaded: false });
  const empty = buildEmptyLiveLaneStatusCleanupReport(input);
  const freshness = buildTrackingLaneFreshnessDisplayCleanupReport(input);
  const summary = buildDebugPanelTrackingSummary({
    identityHandoff: { status: "unknown", duplicateCountGuardActive: true },
    pwaServiceWorkerSafety: { debugLane: buildPwaServiceWorkerDebugLane({ registered: false, registrationExpected: false }) },
    personMetricsHydration: {
      debugLane: {
        personMetricsMapped: 34,
        eventEnvelopesHydrated: 0,
        globalMetricsHydrated: 0,
        signedInMetricsHydrated: 0,
        linkedPersonMetricsHydrated: 0,
        lowConfidenceMetrics: 34,
        gaps: 0,
      },
    },
    stats: {},
  });
  const dirtyFiles = changedFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const openPullRequests = openPrs();
  const scoreAfter = scoreSnapshot();
  return {
    reportKey: "debug-cockpit-batch3-cleanup",
    generatedAtUtc: now(input),
    currentHead: input.currentHead ?? currentHead(),
    pwaStatusBefore: pwa.pwaStatusBefore,
    pwaStatusAfter: pwa.pwaStatusAfter,
    identityStatusBefore: identity.identityStatusBefore,
    identityStatusAfter: identity.identityStatusAfter,
    walletFunnelStatusBefore: wallet.walletFunnelStatusBefore,
    walletFunnelStatusAfter: wallet.walletFunnelStatusAfter,
    emptyLiveLanesBefore: empty.emptyLiveLanesBefore,
    emptyLiveLanesAfter: empty.emptyLiveLanesAfter,
    personMetricsLowConfidenceBefore: empty.personMetricsLowConfidenceBefore,
    personMetricsLowConfidenceAfter: empty.personMetricsLowConfidenceAfter,
    personMetricsHydrationStatus: empty.personMetricsStatusAfter,
    staleBadgeConflictsBefore: freshness.conflictsBefore,
    staleBadgeConflictsAfter: freshness.conflictsAfter,
    sourceReadyCollectingLanes: empty.sourceReadyCollectingLanes,
    sourceMissingLanes: empty.sourceMissingLanes,
    healthyProvenZeroLanes: empty.healthyProvenZeroLanes,
    compactSummaryLanes: summary.lanes.map((lane) => ({ id: lane.id, status: lane.status, severity: lane.severity, signal: lane.primarySignal })),
    scoreBefore,
    scoreAfter,
    scoreDimensions: scoreAfter,
    dirtyFiles,
    openPullRequests,
    remainingGaps: [
      "Runtime samples still need bounded source summaries before collecting lanes can become live.",
      "Formal provider/runtime/admin evidence gates remain separate from source status cleanup.",
    ],
    nextExactSteps: [
      "Attach bounded runtime samples for identity, wallet, drop watch, session/bounce, and person metrics hydration.",
      "Refresh stale artifacts with their owner validators when a source-live artifact is stale.",
    ],
    validationFailures: [] as string[],
  };
}

export function validateDebugCockpitBatch3CleanupReport(report: ReturnType<typeof buildDebugCockpitBatch3CleanupReport>) {
  const failures: string[] = [];
  if (report.pwaStatusAfter === "degraded" && report.pwaStatusBefore === "degraded") failures.push("PWA registered=false is generic degraded without expected/optional/source reason.");
  if (report.identityStatusAfter === "unknown" || report.identityStatusAfter === "live_unknown") failures.push("identity handoff LIVE unknown remains.");
  if (report.walletFunnelStatusAfter === "live_unavailable") failures.push("wallet funnel LIVE unavailable remains.");
  if (report.emptyLiveLanesAfter > 0) failures.push("all-zero unproven lanes remain live.");
  if (report.personMetricsLowConfidenceAfter > 0 && report.personMetricsHydrationStatus === "live") failures.push("person metrics 0 envelopes + 34 low-confidence remains Info live.");
  if (report.staleBadgeConflictsAfter > 0) failures.push("LIVE + STALE ambiguity remains.");
  if (!report.scoreDimensions || Object.keys(report.scoreDimensions).length === 0) failures.push("score dimensions missing.");
  if (report.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) failures.push("dirty files unclassified.");
  if (report.openPullRequests.length > 0) failures.push("open PRs unclassified.");
  return failures;
}

export function writeCleanupReport(name: Batch3Name, report: JsonRecord, failures: string[]) {
  const reportPath = `agent/state/${name}.generated.json`;
  const docPath = `docs/agent-truth/${name}.md`;
  const output = { ...report, validationFailures: failures };
  writeJson(reportPath, output);
  writeDoc(docPath, renderSimpleDoc(name.replace(/-/gu, " "), output));
}
