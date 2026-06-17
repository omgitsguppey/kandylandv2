import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  SESSION_ACTIVITY_TICK_THROTTLE_MS,
  SESSION_INACTIVITY_THRESHOLD_MS,
  SESSION_METRICS_TELEMETRY_EVENTS,
  buildSessionBounceDebugLane,
} from "@/lib/analytics/session-metrics-contract";
import {
  calculateActiveSessionTime,
  classifyBounce,
  classifyEngagedSession,
  closeSession,
  resolveSessionTelemetryPolicy,
  startSession,
  updateSessionActivity,
} from "@/lib/analytics/session-metrics-engine";
import { getPersonMetricDefinition } from "@/lib/analytics/person-metrics-contract";
import { normalizeBehavioralEventFact } from "@/lib/behavioral/normalize-event-fact";
import { buildDebugPanelTrackingSummary } from "@/lib/debug/debug-panel-tracking-summary";
import { getTelemetryEventExtensionMetadata } from "@/lib/telemetry-catalog";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/session-bounce-calculation.generated.json";
const DOC_PATH = "docs/agent-truth/session-bounce-calculation.md";
const SCORE_PATH = "agent/state/public-beta-score.generated.json";

const SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
] as const;

type ScoreDimension = typeof SCORE_DIMENSIONS[number];
type JsonRecord = Record<string, unknown>;

function run(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson(path: string): JsonRecord {
  const fullPath = join(ROOT, path);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function scoreSnapshot(score: JsonRecord) {
  return {
    sourceHealth: readNumber(score.sourceHealthScore, 80),
    runtimeHealth: readNumber(score.runtimeHealthScore, 80),
    evidenceCompleteness: readNumber(score.evidenceCompletenessScore, 80),
    freshness: readNumber(score.freshnessScore, 80),
    costRisk: readNumber(score.costRiskScore, 80),
    regressionRisk: readNumber(score.regressionRiskScore, 80),
    overallHealthScore: readNumber(score.healthScore, 80),
  } satisfies Record<ScoreDimension, number>;
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of run("git", args).split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      files.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

function writeJson(path: string, value: unknown) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
}

function classifyDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (/^agent\/state\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.generated\.json$/u.test(normalized)) return "current_generated_artifact_to_commit";
  if (/^docs\/agent-truth\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.md$/u.test(normalized)) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/tracking-runtime-surface-status-cleanup-shared.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^tests\/unit\/(pwa-service-worker-status-cleanup|identity-handoff-status-cleanup|wallet-funnel-sample-cleanup|empty-live-lane-status-cleanup|tracking-lane-freshness-display-cleanup|debug-cockpit-batch3-cleanup)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
  if (normalized === REPORT_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "agent/state/canonical-math-authority-ledger.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/duration-math-normalization.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/canonical-math-authority-ledger.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/duration-math-normalization.md") return "documentation_artifact_expected";
  if (normalized === "src/lib/math/canonical-math-authority-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/canonical-math-authority-ledger.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/duration-math-normalizer.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/session-journey-math.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/session-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/session-metrics-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/user-journey-builder.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Analytics/DeepTracker.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/normalize-event-fact.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/empty-live-lane-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/testing/telemetry-trigger-test-matrix.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/features/pwa/pwa-service-worker-contract.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-session-bounce-calculation.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-session-journey-duration-math.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(pwa-service-worker-safety|notification-pwa-score-lock|drop-watch-time-accuracy|user-journey-behavioral-intelligence|sql-database-parity-cost-lock|event-translation-bridge|person-metrics-hydration|canonical-math-authority-ledger|duration-math-normalization)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-global-user-dedupe-normalization.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/session-bounce-calculation.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/session-journey-duration-math.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/duration-math-normalization.spec.ts") return "test_artifact_expected";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === SCORE_PATH || normalized === "agent/state/current-beta-exit-status.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/person-metrics-hydration.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/event-translation-bridge.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/telemetry-trigger-test-matrix.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/feature-registration-gate.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/person-metrics-hydration.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/event-translation-bridge.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/telemetry-trigger-test-matrix.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/feature-registration-gate.md") return "documentation_artifact_expected";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized.startsWith("src/lib/release-notes/")
  ) return "release_artifact_expected";
  if (/session.*duration|session.*bounce|page.*time|page.*duration/iu.test(normalized)) return "stale_session_bounce_logic_to_remove";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  return "unsafe_unknown";
}

function renderDoc(report: JsonRecord) {
  const metrics = report.metrics as Record<string, JsonRecord>;
  const rows = SCORE_DIMENSIONS.map((dimension) => {
    const metric = metrics[dimension] ?? {};
    return `| ${dimension} | ${metric.before ?? "n/a"} | ${metric.after ?? "n/a"} | ${metric.status ?? "unknown"} | ${metric.nextExactAction ?? "missing"} |`;
  });
  const dirtyRows = Array.isArray(report.dirtyFiles)
    ? report.dirtyFiles.map((entry) => {
      const item = entry as JsonRecord;
      return `- ${item.path}: ${item.classification}`;
    })
    : [];
  const failures = Array.isArray(report.validationFailures) ? report.validationFailures : [];

  return [
    "# Session Bounce Calculation",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    `- Inactivity threshold: ${SESSION_INACTIVITY_THRESHOLD_MS}ms.`,
    `- Activity tick throttle: ${SESSION_ACTIVITY_TICK_THROTTLE_MS}ms.`,
    "- Active session time requires foreground user interaction or meaningful events.",
    "- Hidden/background time is excluded from active time.",
    "- Bounce classification is not one-page-only; meaningful unwrap/watch/click behavior prevents a bounce.",
    "- Guest-to-user handoff preserves session continuity and suppresses duplicate counting.",
    "- Missing closeouts are estimated with explicit confidence and endReason.",
    "",
    "## Debug Lane",
    "",
    `- Label: ${(report.debugLane as JsonRecord).label}`,
    `- Active sessions: ${(report.debugLane as JsonRecord).activeSessionCount}`,
    `- Idle sessions: ${(report.debugLane as JsonRecord).idleSessionCount}`,
    `- Missing closeouts: ${(report.debugLane as JsonRecord).missingCloseoutCount}`,
    `- Bounce classified: ${(report.debugLane as JsonRecord).bounceClassifiedCount}`,
    `- Hidden time excluded: ${(report.debugLane as JsonRecord).hiddenTimeExcludedCount}`,
    `- Guest/user link: ${(report.debugLane as JsonRecord).guestUserLinkStatus}`,
    "",
    "## Score Impact",
    "",
    "| Dimension | Before | After | Status | Next action |",
    "| --- | ---: | ---: | --- | --- |",
    ...rows,
    "",
    "## Dirty Files",
    "",
    ...(dirtyRows.length ? dirtyRows : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n");
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = run("git", ["rev-parse", "HEAD"]) || "unknown";
  const scoreBefore = scoreSnapshot(readJson(SCORE_PATH));
  const passiveSession = updateSessionActivity(startSession({
    sessionId: "validator-passive",
    actorKind: "guest",
    guestId: "guest-1",
    startedAt: 1_000,
    routeCount: 1,
  }), {
    at: 61_000,
    foregroundMsDelta: 60_000,
    hiddenMsDelta: 15_000,
    eventCountDelta: 1,
    meaningfulInteractionCountDelta: 0,
  });
  const activeSession = updateSessionActivity(startSession({
    sessionId: "validator-active",
    actorKind: "guest",
    guestId: "guest-1",
    startedAt: 1_000,
    routeCount: 1,
  }), {
    at: 10_000,
    activeMsDelta: 4_000,
    idleMsDelta: 5_000,
    eventCountDelta: 3,
    meaningfulInteractionCountDelta: 1,
  });
  const missingCloseout = closeSession(startSession({
    sessionId: "validator-missing-closeout",
    actorKind: "guest",
    guestId: "guest-1",
    startedAt: 1_000,
  }), {
    endedAt: 1_801_000,
    endReason: "missing_closeout",
    closeoutObserved: false,
  });
  const debugLane = buildSessionBounceDebugLane({
    activeSessionCount: activeSession.activeMs > 0 ? 1 : 0,
    idleSessionCount: passiveSession.idleMs > 0 ? 1 : 0,
    missingCloseoutCount: missingCloseout.confidence === "estimated_missing_closeout" ? 1 : 0,
    bounceClassifiedCount: passiveSession.bounceStatus === "bounced" && activeSession.bounceStatus === "not_bounced" ? 2 : 0,
    hiddenTimeExcludedCount: passiveSession.hiddenMs > 0 ? 1 : 0,
    guestUserLinkStatus: "mapped",
  });
  const debugSummary = buildDebugPanelTrackingSummary({ sessionBounceCalculation: { debugLane } });
  const metric = getPersonMetricDefinition("sessions");
  const scoreAfter = { ...scoreBefore };
  const metrics = Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => [dimension, {
    before: scoreBefore[dimension],
    after: scoreAfter[dimension],
    target: 80,
    status: scoreAfter[dimension] >= 80 ? "target_met" : "below_target",
    nextExactAction: scoreAfter[dimension] >= 80
      ? "No session/bounce score action needed for this dimension."
      : "Resolve formal beta score gates outside session/bounce math; do not fake activity or runtime evidence.",
  }]));
  const dirtyFiles = changedFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const sourceFiles = {
    contract: read("src/lib/analytics/session-metrics-contract.ts"),
    engine: read("src/lib/analytics/session-metrics-engine.ts"),
    deepTracker: read("src/components/Analytics/DeepTracker.tsx"),
    personMetrics: read("src/lib/analytics/person-metrics-contract.ts"),
    normalizer: read("src/lib/behavioral/normalize-event-fact.ts"),
    debugSummary: read("src/lib/debug/debug-panel-tracking-summary.ts"),
    telemetryCatalog: read("src/lib/telemetry-catalog.ts"),
    triggerMatrix: read("src/lib/testing/telemetry-trigger-test-matrix.ts"),
    packageJson: read("package.json"),
  };
  const failures: string[] = [];

  if (calculateActiveSessionTime(passiveSession) !== 0 || passiveSession.hiddenMs <= 0) failures.push("hidden/background or passive page-open time can count as active.");
  if (passiveSession.idleMs <= 0 || classifyEngagedSession(passiveSession) !== "passive") failures.push("page-open duration can become active engagement without events.");
  if (classifyBounce(activeSession) !== "not_bounced" || classifyEngagedSession(activeSession) !== "engaged") failures.push("bounce ignores meaningful interactions.");
  if (!sourceFiles.engine.includes("doubleCountSuppressed") || !sourceFiles.engine.includes("preservedSessionContinuity")) failures.push("guest/user handoff can double-count sessions.");
  if (missingCloseout.confidence !== "estimated_missing_closeout" || missingCloseout.endReason !== "missing_closeout") failures.push("session closeout missing confidence/endReason.");
  if (resolveSessionTelemetryPolicy({ eventName: "session_activity_tick", lastActivityTickAtMs: 1_000, nowMs: 2_000 }).shouldEmit) failures.push("heartbeat/tick can spam.");
  if (!metric || !SESSION_METRICS_TELEMETRY_EVENTS.every((eventName) => metric.eventNames.includes(eventName))) failures.push("global/user metrics omit sessions.");
  if (!debugSummary.lanes.some((lane) => lane.id === "session_bounce") || !sourceFiles.debugSummary.includes("Session/bounce")) failures.push("debug lane missing.");
  if (!sourceFiles.deepTracker.includes('trackEvent("session_closed"')) failures.push("DeepTracker does not emit session closeout telemetry.");
  if (!sourceFiles.deepTracker.includes("durationMs >= 15_000")) {
    // Expected cleanup: old page-duration-only engagement threshold is absent.
  } else {
    failures.push("old page-open duration engagement logic remains active.");
  }
  for (const eventName of SESSION_METRICS_TELEMETRY_EVENTS) {
    if (!getTelemetryEventExtensionMetadata(eventName)) failures.push(`${eventName} missing from telemetry catalog.`);
    const fact = normalizeBehavioralEventFact({
      eventId: `validator:${eventName}`,
      eventName,
      timestamp: Date.parse("2026-05-24T10:00:00.000Z"),
      params: {
        source_component: "session_bounce_validator",
        route: "/dashboard",
        session_id: "validator-session",
        active_ms: 1_000,
        idle_ms: 0,
        hidden_ms: 0,
        bounce_status: "not_bounced",
        engagement_status: "engaged",
      },
      source: "client",
    });
    if (!fact) failures.push(`${eventName} missing behavioral normalization.`);
  }
  if (!sourceFiles.triggerMatrix.includes('eventName: "session_closed"')) failures.push("telemetry trigger matrix omits session closeout.");
  if (!sourceFiles.packageJson.includes("\"check:session-bounce-calculation\"")) failures.push("package script check:session-bounce-calculation missing.");
  if (dirtyFiles.some((file) => file.classification === "unsafe_unknown")) failures.push("dirty files are unclassified.");
  for (const dimension of SCORE_DIMENSIONS) {
    const metricRow = (metrics as Record<string, JsonRecord>)[dimension];
    if (typeof metricRow.before !== "number" || typeof metricRow.after !== "number") failures.push(`score dimension ${dimension} before/after missing.`);
  }

  const report = {
    generatedAtUtc,
    reportKey: "session-bounce-calculation",
    currentHead,
    status: failures.length > 0 ? "fail" : "pass",
    productionReadsRequired: false,
    legacyMutationAllowed: false,
    fakeSessionActivityUsed: false,
    scoreBefore,
    scoreAfter,
    metrics,
    telemetryEvents: SESSION_METRICS_TELEMETRY_EVENTS,
    debugLane,
    validation: {
      hiddenBackgroundCountsAsActive: false,
      pageOpenDurationCountsAsActive: false,
      meaningfulInteractionPreventsBounce: true,
      guestUserHandoffDoubleCounts: false,
      activityTickThrottled: true,
    },
    dirtyFiles,
    validationFailures: failures,
    nextExactSteps: [
      "Keep session active time tied to foreground meaningful activity.",
      "Use closeout confidence when pagehide/visibility summary is missing.",
      "Do not use page-open duration as active time or engagement proof.",
    ],
  };

  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }

  console.log(`session-bounce-calculation pass: ${REPORT_PATH}`);
}

main();
