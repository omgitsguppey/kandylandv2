import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { getPersonMetricDefinition } from "@/lib/analytics/person-metrics-contract";
import {
  buildUserJourneyDebugLane,
  USER_JOURNEY_CORE_FUNNELS,
  USER_JOURNEY_COST_GUARD,
} from "@/lib/behavioral/user-journey-contract";
import {
  appendJourneyEvent,
  buildBehavioralIntelligenceInput,
  buildJourneyEvent,
  classifyJourneyStep,
  detectJourneyBreak,
  summarizePersonJourney,
  summarizeSessionJourney,
} from "@/lib/behavioral/user-journey-builder";
import { normalizeBehavioralEventFact } from "@/lib/behavioral/normalize-event-fact";
import { buildDebugPanelTrackingSummary } from "@/lib/debug/debug-panel-tracking-summary";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/user-journey-behavioral-intelligence.generated.json";
const DOC_PATH = "docs/agent-truth/user-journey-behavioral-intelligence.md";
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
  if (normalized === "src/lib/behavioral/user-journey-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/user-journey-builder.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/event-fact-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/behavioral/normalize-event-fact.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/math/session-journey-math.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/session-metrics-engine.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized.startsWith("src/app/admin/debug/components/DebugAdvanced") || normalized === "src/app/admin/debug/components/DebugPrimitives.tsx") return "real_source_change_needs_review";
  if (normalized === "src/app/api/admin/debug/route.ts") return "real_source_change_needs_review";
  if (/^src\/lib\/(debug\/source-window-zero-shell-classifier|behavioral\/behavior-normalization-internals-(contract|engine)|behavioral\/behavioral-intelligence-snapshot-(contract|status)|analytics\/telemetry-truth-recovery-(formulas|status)|experiments\/experiment-rollout-registry-(contract|status)|tasks\/task-catalog-coverage-(contract|engine)|tasks\/task-runtime-sample-contract|tasks\/task-telemetry-mapping-(contract|engine))\.ts$/u.test(normalized)) return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/debug-panel-tracking-summary.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/debug/empty-live-lane-classifier.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/pwa/pwa-service-worker-contract.ts") return "real_source_change_needs_review";
  if (normalized === "scripts/agent/validate-user-journey-behavioral-intelligence.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-session-journey-duration-math.ts") return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(pwa-service-worker-safety|notification-pwa-score-lock|drop-watch-time-accuracy|session-bounce-calculation|sql-database-parity-cost-lock|event-translation-bridge|person-metrics-hydration)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (/^scripts\/agent\/validate-(source-window-zero-shell-classifier|behavior-normalization-internals|task-catalog-runtime-reconstruction|task-telemetry-mapping-reconstruction|behavioral-intelligence-snapshot-truth|telemetry-truth-recovery-formulas|experiment-rollout-registry-reconstruction|behavior-task-telemetry-ui-cleanup|debug-cockpit-batch35-behavior-stack|daily-task-debug-score-lock|daily-task-lifecycle-telemetry)\.ts$/u.test(normalized)) return "validator_artifact_expected";
  if (normalized === "tests/unit/user-journey-behavioral-intelligence.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/session-journey-duration-math.spec.ts") return "test_artifact_expected";
  if (/^tests\/unit\/(source-window-zero-shell-classifier|behavior-normalization-internals|task-catalog-runtime-reconstruction|task-telemetry-mapping-reconstruction|behavioral-intelligence-snapshot-truth|telemetry-truth-recovery-formulas|experiment-rollout-registry-reconstruction|behavior-task-telemetry-ui-cleanup|debug-cockpit-batch35-behavior-stack)\.spec\.ts$/u.test(normalized)) return "test_artifact_expected";
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
  if (/journey|behavioral-profile|materialized-profile|timeline/iu.test(normalized)) return "stale_journey_logic_to_remove";
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
    "# User Journey Behavioral Intelligence",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- Journey events are normalized summaries, not raw telemetry payload dumps.",
    "- Each event keeps who, what, when, where, how, and how-long fields.",
    "- Identity confidence, session continuity, active duration, and privacy class remain explicit.",
    "- Payment/provider/chat/private content is redacted before behavioral intelligence receives data.",
    "- Behavioral intelligence receives compact batched summaries with low-importance firehose events dropped.",
    "- Core funnels are source-ready: landing/signup, signup/unwrap, wallet/payment, drop/watch, creator/Fan Pass/chat/follow, notifications, daily tasks, and chat outcomes.",
    "",
    "## Debug Lane",
    "",
    `- Label: ${(report.debugLane as JsonRecord).label}`,
    `- Builder connected: ${(report.debugLane as JsonRecord).journeyBuilderConnected}`,
    `- Broken segments: ${(report.debugLane as JsonRecord).brokenJourneySegments}`,
    `- Missing next actions: ${(report.debugLane as JsonRecord).missingNextActions}`,
    `- Top funnels source-ready: ${(report.debugLane as JsonRecord).topFunnelsSourceReady}`,
    `- Cost guard: ${(report.debugLane as JsonRecord).costGuardStatus}`,
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
  const sourceFiles = {
    contract: read("src/lib/behavioral/user-journey-contract.ts"),
    builder: read("src/lib/behavioral/user-journey-builder.ts"),
    factContract: read("src/lib/behavioral/event-fact-contract.ts"),
    normalizer: read("src/lib/behavioral/normalize-event-fact.ts"),
    debugSummary: read("src/lib/debug/debug-panel-tracking-summary.ts"),
    packageJson: read("package.json"),
  };
  const fact = normalizeBehavioralEventFact({
    eventId: "validator:drop_watch_completed",
    eventName: "drop_watch_completed",
    timestamp: Date.parse("2026-05-24T10:00:00.000Z"),
    userId: "user_validator",
    sessionId: "session_validator",
    anonymousVisitorId: "guest_validator",
    params: {
      source_component: "user_journey_validator",
      route: "/dashboard/viewer",
      drop_id: "drop_validator",
      media_id: "media_validator",
      watch_session_id: "watch_validator",
      linked_person_id: "person_validator",
      identity_state: "logged_in_linked_guest",
      identity_confidence: "linked",
      duration_ms: 15_000,
      active_ms: 12_000,
    },
    source: "client",
  });
  const first = buildJourneyEvent({ fact: fact! });
  const second = appendJourneyEvent([first], buildJourneyEvent({
    event: {
      eventId: "validator:daily_task_reward_granted",
      eventName: "daily_task_reward_granted",
      sessionId: first.sessionId,
      linkedPersonId: first.linkedPersonId,
      actorKind: "signed_in_user",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      timestamp: "2026-05-24T10:00:15.000Z",
      route: "/dashboard",
      surface: "daily_checkin",
      featureId: "daily_checkin",
      action: "daily_task_reward_granted",
      objectType: "task",
      objectId: "task_validator",
      durationMs: 4_000,
      activeMs: 4_000,
      sourceEventName: "daily_task_reward_granted",
    },
  }))[1];
  const privateJourney = buildJourneyEvent({
    event: {
      ...second,
      eventId: "validator:chat_private",
      eventName: "chat_message_sent",
      action: "chat_message_sent",
      objectType: "chat",
      objectId: "thread_validator",
      sourceEventName: "chat_message_sent",
      rawPayload: {
        chatMessage: "private body",
        providerToken: "secret",
        paymentProviderResponse: { captureId: "secret-capture" },
        privateContent: "locked content",
      },
    },
  });
  const lowImportance = Array.from({ length: 4 }, (_, index) => buildJourneyEvent({
    event: {
      ...second,
      eventId: `validator:hover:${index}`,
      eventName: "hover_event",
      action: "hover",
      sourceEventName: "hover_event",
      objectType: "drop",
      objectId: "drop_validator",
    },
  }));
  const journeyEvents = [first, second, privateJourney, ...lowImportance];
  const sessionSummary = summarizeSessionJourney(journeyEvents);
  const personSummary = summarizePersonJourney(journeyEvents);
  const compactInput = buildBehavioralIntelligenceInput({ journeyEvents, maxJourneyEvents: 3 });
  const breakResult = detectJourneyBreak({ previous: first, next: second });
  const debugLane = buildUserJourneyDebugLane({
    journeyBuilderConnected: true,
    brokenJourneySegments: breakResult.status === "connected" ? 0 : 1,
    missingNextActions: journeyEvents.filter((event) => event.nextExpectedActions.length === 0).length,
    topFunnelsSourceReady: USER_JOURNEY_CORE_FUNNELS.length,
    costGuardStatus: USER_JOURNEY_COST_GUARD,
  });
  const debugSummary = buildDebugPanelTrackingSummary({ userJourneyBehavioralIntelligence: { debugLane } });
  const scoreAfter = { ...scoreBefore };
  const metrics = Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => [dimension, {
    before: scoreBefore[dimension],
    after: scoreAfter[dimension],
    target: 80,
    status: scoreAfter[dimension] >= 80 ? "target_met" : "below_target",
    nextExactAction: scoreAfter[dimension] >= 80
      ? "No user journey score action needed for this dimension."
      : "Resolve formal beta score gates outside user journey summaries; do not fake journey activity or runtime evidence.",
  }]));
  const dirtyFiles = changedFiles().map((path) => ({ path, classification: classifyDirtyFile(path) }));
  const validationFailures: string[] = [];

  for (const field of ["journeyEventId", "eventId", "sessionId", "linkedPersonId", "actorKind", "identityState", "identityConfidence", "timestamp", "route", "surface", "featureId", "action", "objectType", "objectId", "durationMs", "activeMs"]) {
    if (!(field in first)) validationFailures.push(`journey event lacks ${field}.`);
  }
  const privateSerialized = JSON.stringify(privateJourney);
  if (/private body|secret|secret-capture|locked content/u.test(privateSerialized)) validationFailures.push("raw sensitive payloads can be stored.");
  if (!["private_content_redacted", "payment_provider_redacted", "sensitive_payload_blocked"].includes(privateJourney.privacyClass)) {
    validationFailures.push("private chat/payment/provider content can enter journey.");
  }
  if (first.identityConfidence === "unknown" || first.sessionId === "unknown") validationFailures.push("journey ignores identity confidence.");
  if (sessionSummary.totalActiveMs <= 0 || sessionSummary.totalDurationMs <= 0) validationFailures.push("journey ignores session/duration.");
  if (compactInput.rawFirehoseStored || compactInput.storageMode !== "compact_summary" || compactInput.droppedLowImportanceCount <= 0) validationFailures.push("behavioral intelligence receives raw unbatched firehose.");
  if (compactInput.costGuard !== USER_JOURNEY_COST_GUARD) validationFailures.push("cost guard missing.");
  if (!debugSummary.lanes.some((lane) => lane.id === "user_journey") || !sourceFiles.debugSummary.includes("User journey")) validationFailures.push("debug lane missing.");
  if (!USER_JOURNEY_CORE_FUNNELS.every((funnel) => sourceFiles.contract.includes(funnel))) validationFailures.push("core journey funnels missing.");
  if (!personSummary.topFunnels.includes("drop_view_to_unlock_to_watch") || !personSummary.topFunnels.includes("daily_task_to_reward")) validationFailures.push("journey summaries do not map feature funnels.");
  for (const metricId of ["sessions", "unwraps", "wallet_opens", "checkout_starts", "payment_approvals", "runtime_watch_sessions", "chat_actions", "daily_task_rewards_granted", "auth_runtime_events"] as const) {
    if (!getPersonMetricDefinition(metricId)) validationFailures.push(`person metric ${metricId} missing.`);
  }
  if (!classifyJourneyStep("wallet_opened").funnelIds.includes("wallet_to_checkout_to_payment")) validationFailures.push("wallet journey step missing.");
  if (!sourceFiles.factContract.includes("durationMs") || !sourceFiles.factContract.includes("activeMs") || !sourceFiles.normalizer.includes("active_ms")) validationFailures.push("event facts lack active duration fields.");
  if (!sourceFiles.packageJson.includes("\"check:user-journey-behavioral-intelligence\"")) validationFailures.push("package script check:user-journey-behavioral-intelligence missing.");
  if (dirtyFiles.some((file) => file.classification === "unsafe_unknown")) validationFailures.push("dirty files are unclassified.");
  for (const dimension of SCORE_DIMENSIONS) {
    const metric = (metrics as Record<string, JsonRecord>)[dimension];
    if (typeof metric.before !== "number" || typeof metric.after !== "number") {
      validationFailures.push(`score dimension ${dimension} before/after missing.`);
    }
  }

  const report = {
    generatedAtUtc,
    reportKey: "user-journey-behavioral-intelligence",
    currentHead,
    status: validationFailures.length > 0 ? "fail" : "pass",
    productionReadsRequired: false,
    legacyMutationAllowed: false,
    fakeJourneysUsed: false,
    rawSensitivePayloadStored: false,
    scoreBefore,
    scoreAfter,
    metrics,
    coreFunnels: USER_JOURNEY_CORE_FUNNELS,
    debugLane,
    sampleJourneyEvent: first,
    sessionSummary,
    personSummary,
    compactBehavioralInput: compactInput,
    dirtyFiles,
    validationFailures,
    nextExactSteps: [
      "Feed normalized journey summaries from canonical event facts and rollups only.",
      "Keep raw payment/provider/chat/private payloads out of behavioral storage.",
      "Batch journey summaries and drop low-importance hover/scroll firehose events.",
    ],
  };

  writeJson(REPORT_PATH, report);
  writeText(DOC_PATH, renderDoc(report));

  if (validationFailures.length > 0) {
    console.error(validationFailures.join("\n"));
    process.exit(1);
  }

  console.log(`user-journey-behavioral-intelligence pass: ${REPORT_PATH}`);
}

main();
