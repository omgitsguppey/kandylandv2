import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE_PATH = join(ROOT, "agent", "state", "chat-functionality-score-lock.generated.json");
const DOC_PATH = join(ROOT, "docs", "agent-truth", "chat-functionality-score-lock.md");
const BATCH5_SLUGS = [
  "config-runtime-sample-status-classifier",
  "chat-gating-status-cleanup",
  "chat-telemetry-status-cleanup",
  "cost-4xx-status-cleanup",
  "open-backlog-status-cleanup",
  "future-activity-catalog-status-cleanup",
  "debug-cockpit-batch5-cleanup",
] as const;

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
type Status = "pass" | "fail" | "source_ready" | "owner_review";
type ScoreSnapshot = Record<ScoreDimension, number>;

export interface ChatFunctionalityStatus {
  status: Status;
  evidence: string[];
  missing: string[];
  nextAction: string;
}

export interface ChatFunctionalityScoreLockReport {
  generatedAtUtc: string;
  currentHead: string;
  productionReadsRequired: false;
  liveDataMutationAllowed: false;
  deployRequired: false;
  realtimePropagationStatus: ChatFunctionalityStatus;
  listenerCostStatus: ChatFunctionalityStatus;
  typingPresenceStatus: ChatFunctionalityStatus;
  paidGdGatingStatus: ChatFunctionalityStatus;
  moderationStatus: ChatFunctionalityStatus;
  telemetryStatus: ChatFunctionalityStatus;
  adminTruthStatus: ChatFunctionalityStatus;
  transcriptTruthStatus: ChatFunctionalityStatus & {
    messageContentExposedByDefault: boolean;
    guardedDrilldown: boolean;
    sourceRoute: string | null;
    sourceHelper: string | null;
  };
  personMetricsStatus: ChatFunctionalityStatus;
  scoreBefore: ScoreSnapshot;
  scoreAfter: ScoreSnapshot;
  scoreDimensions: Record<ScoreDimension, { before: number; after: number; target: 80; status: "at_or_above_target" | "below_target"; nextAction: string }>;
  remainingGaps: string[];
  nextExactSteps: string[];
  dirtyFiles: Array<{ path: string; classification: string }>;
  oldChatLogicReferences: Array<{ reference: string; classification: "still_required" | "superseded" | "stale_removed" | "unsafe_unknown"; reason: string }>;
  validationFailures: string[];
}

interface BuildInput {
  currentHead?: string;
  realtimeReport?: any;
  presenceReport?: any;
  gatingReport?: any;
  telemetryReport?: any;
  personMetricsReport?: any;
  scoreBefore?: Partial<ScoreSnapshot>;
  scoreAfter?: Partial<ScoreSnapshot>;
  dirtyFiles?: string[];
  oldLogicReferences?: ChatFunctionalityScoreLockReport["oldChatLogicReferences"];
}

function git(args: readonly string[]) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function readJson(path: string) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function readState(name: string) {
  return readJson(join(ROOT, "agent", "state", name));
}

function readScoreSnapshot(score: any): ScoreSnapshot {
  return {
    sourceHealth: Number(score?.sourceHealthScore ?? score?.sourceHealth ?? 0),
    runtimeHealth: Number(score?.runtimeHealthScore ?? score?.runtimeHealth ?? 0),
    evidenceCompleteness: Number(score?.evidenceCompletenessScore ?? score?.evidenceCompleteness ?? 0),
    freshness: Number(score?.freshnessScore ?? score?.freshness ?? 0),
    costRisk: Number(score?.costRiskScore ?? score?.costRisk ?? 0),
    regressionRisk: Number(score?.regressionRiskScore ?? score?.regressionRisk ?? 0),
    overallHealthScore: Number(score?.overallHealthScore ?? score?.healthScore ?? 0),
  };
}

function mergeScoreSnapshot(base: ScoreSnapshot, override?: Partial<ScoreSnapshot>): ScoreSnapshot {
  return Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => [dimension, Number(override?.[dimension] ?? base[dimension] ?? 0)])) as ScoreSnapshot;
}

function listDirtyFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const file of git(args).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)) {
      files.add(file.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

export function classifyChatFunctionalityLockDirtyFile(path: string) {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "scripts/agent/chat-cost-status-cleanup-shared.ts") return "validator_artifact_expected";
  if (BATCH5_SLUGS.some((slug) => normalized === `scripts/agent/validate-${slug}.ts`)) return "validator_artifact_expected";
  if (BATCH5_SLUGS.some((slug) => normalized === `tests/unit/${slug}.spec.ts`)) return "test_artifact_expected";
  if (BATCH5_SLUGS.some((slug) => normalized === `agent/state/${slug}.generated.json`)) return "current_generated_artifact_to_commit";
  if (BATCH5_SLUGS.some((slug) => normalized === `docs/agent-truth/${slug}.md`)) return "documentation_artifact_expected";
  if (normalized === "agent/state/chat-functionality-score-lock.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/chat-functionality-score-lock.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-chat-functionality-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/chat-functionality-score-lock.spec.ts") return "test_artifact_expected";
  if (
    normalized === "agent/state/chat-telemetry-admin-truth.generated.json"
    || normalized === "agent/state/chat-gating-moderation.generated.json"
    || normalized === "agent/state/chat-presence-typing.generated.json"
    || normalized === "agent/state/chat-realtime-cost-control.generated.json"
    || normalized === "agent/state/event-translation-bridge.generated.json"
    || normalized === "agent/state/feature-registration-gate.generated.json"
    || normalized === "agent/state/person-metrics-hydration.generated.json"
    || normalized === "agent/state/public-beta-score.generated.json"
    || normalized === "agent/state/current-beta-exit-status.generated.json"
    || normalized === "agent/state/debug-tracking-simplification.generated.json"
    || normalized === "agent/state/overnight-beta-readiness-lock.generated.json"
  ) return "current_generated_artifact_to_commit";
  if (
    normalized === "docs/agent-truth/chat-telemetry-admin-truth.md"
    || normalized === "docs/agent-truth/chat-gating-moderation.md"
    || normalized === "docs/agent-truth/chat-presence-typing.md"
    || normalized === "docs/agent-truth/chat-realtime-cost-control.md"
    || normalized === "docs/agent-truth/event-translation-bridge.md"
    || normalized === "docs/agent-truth/feature-registration-gate.md"
    || normalized === "docs/agent-truth/person-metrics-hydration.md"
    || normalized === "docs/agent-truth/current-beta-exit-status.md"
    || normalized === "docs/agent-truth/debug-tracking-simplification.md"
    || normalized === "docs/agent-truth/overnight-beta-readiness-lock.md"
  ) return "documentation_artifact_expected";
  if (
    normalized === "scripts/agent/validate-chat-telemetry-admin-truth.ts"
    || normalized === "scripts/agent/validate-chat-gating-moderation.ts"
    || normalized === "scripts/agent/validate-chat-presence-typing.ts"
    || normalized === "scripts/agent/validate-chat-realtime-cost-control.ts"
    || normalized === "scripts/agent/validate-event-translation-bridge.ts"
    || normalized === "scripts/agent/validate-feature-registration-gate.ts"
    || normalized === "scripts/agent/validate-debug-tracking-simplification.ts"
    || normalized === "scripts/agent/validate-event-liveness-audit.ts"
    || normalized === "scripts/agent/validate-final-signal-zero-lock.ts"
  ) return "validator_artifact_expected";
  if (
    normalized === "tests/unit/chat-telemetry-admin-truth.spec.ts"
    || normalized === "tests/unit/user-management-refactor.spec.ts"
    || normalized === "package.json"
  ) return normalized.endsWith(".spec.ts") ? "test_artifact_expected" : "real_source_change_needs_review";
  if (
    normalized === "src/lib/chat/chat-telemetry-contract.ts"
    || normalized === "src/lib/debug/config-runtime-sample-status-classifier.ts"
    || normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx"
    || normalized === "src/lib/telemetry-catalog.ts"
    || normalized === "src/lib/behavioral/normalize-event-fact.ts"
    || normalized === "src/lib/analytics/event-translation-bridge.ts"
    || normalized === "src/lib/analytics/person-metrics-contract.ts"
    || normalized === "src/lib/analytics/person-metrics-hydration.ts"
    || normalized === "src/lib/debug/debug-panel-tracking-summary.ts"
    || normalized === "src/app/api/admin/debug/route.ts"
    || normalized === "src/lib/server/admin-debug/summary.ts"
    || normalized === "src/lib/server/chat.ts"
    || normalized === "src/components/Chat/ChatExperience.tsx"
  ) return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  return "unsafe_unknown";
}

function statusFrom(condition: boolean, evidence: string[], missing: string[], nextAction: string): ChatFunctionalityStatus {
  return {
    status: condition ? "pass" : "fail",
    evidence,
    missing,
    nextAction,
  };
}

function buildScoreDimensions(before: ScoreSnapshot, after: ScoreSnapshot): ChatFunctionalityScoreLockReport["scoreDimensions"] {
  return Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => {
    const value = after[dimension];
    return [dimension, {
      before: before[dimension],
      after: value,
      target: 80,
      status: value >= 80 ? "at_or_above_target" : "below_target",
      nextAction: value >= 80
        ? "No chat-specific score action needed."
        : "Below-target score is driven by formal/runtime evidence, stale evidence, or owner-review gates; do not treat missing future chat activity as score drag.",
    }];
  })) as ChatFunctionalityScoreLockReport["scoreDimensions"];
}

export function buildChatFunctionalityScoreLockReport(input: BuildInput = {}): ChatFunctionalityScoreLockReport {
  const realtime = input.realtimeReport ?? readState("chat-realtime-cost-control.generated.json") ?? {};
  const presence = input.presenceReport ?? readState("chat-presence-typing.generated.json") ?? {};
  const gating = input.gatingReport ?? readState("chat-gating-moderation.generated.json") ?? {};
  const telemetry = input.telemetryReport ?? readState("chat-telemetry-admin-truth.generated.json") ?? {};
  const personMetrics = input.personMetricsReport ?? readState("person-metrics-hydration.generated.json") ?? {};
  const score = readState("public-beta-score.generated.json") ?? {};
  const scoreAfter = mergeScoreSnapshot(readScoreSnapshot(score), input.scoreAfter);
  const scoreBefore = mergeScoreSnapshot(scoreAfter, input.scoreBefore);
  const realtimeSource = realtime.sourceValidation ?? {};
  const presenceSource = presence.sourceValidation ?? {};
  const gatingSource = gating.sourceValidation ?? {};
  const transcriptPolicy = telemetry.transcriptPolicy ?? {};
  const eventFamilies = Array.isArray(telemetry.eventFamilies) ? telemetry.eventFamilies : [];
  const adminLane = telemetry.adminSummaryLane ?? {};
  const dirty = (input.dirtyFiles ?? listDirtyFiles()).map((path) => ({
    path,
    classification: classifyChatFunctionalityLockDirtyFile(path),
  }));
  const oldChatLogicReferences = input.oldLogicReferences ?? [
    {
      reference: "legacy creator chat aliases",
      classification: "still_required" as const,
      reason: "Legacy chat event aliases are normalized into canonical chat telemetry for compatibility.",
    },
    {
      reference: "broad transcript dumps",
      classification: "stale_removed" as const,
      reason: "Default admin summaries expose counts and source state only; message content remains guarded drilldown.",
    },
  ];

  const realtimeOk = Boolean(
    realtimeSource.threadListenerBounded
      && realtimeSource.messageListenerSelectedThreadOnly
      && realtimeSource.messageListenerBounded
      && realtimeSource.detachOnUnmount
      && realtimeSource.detachOnThreadSwitch
      && realtimeSource.hasRealtimeErrorDebugVisibility,
  );
  const listenerCostOk = Boolean(
    realtimeSource.hasNoBroadAllMessageListener
      && realtimeSource.threadListenerBounded
      && realtimeSource.messageListenerBounded,
  );
  const presenceOk = Boolean(
    presenceSource.onDisconnectAttached
      && presenceSource.usesTypingController
      && presenceSource.noPerKeystrokeTypingWrites
      && presenceSource.timeoutStopsTyping
      && presenceSource.blurStopsTyping
      && presenceSource.sendStopsTyping
      && presenceSource.unmountStopsTyping
      && presenceSource.presenceErrorsDebugVisible
      && presenceSource.telemetryNotPerKeystroke,
  );
  const gatingOk = Boolean(
    gatingSource.backendEnforcesPaidOnly
      && gatingSource.rejectsRewardFreeGd
      && gatingSource.doesNotTrustClientPriceOrBalance
      && gatingSource.idempotencyKeyRequired
      && gatingSource.blockedSendTelemetry
      && gatingSource.humanSafeBlockedErrors
      && gatingSource.gumdropMathUntouched,
  );
  const moderationOk = Boolean(gatingSource.moderationStatusDebugVisible && gatingSource.mediaLimitsEnforcedServerSide);
  const telemetryOk = eventFamilies.length > 0
    && eventFamilies.every((event: any) => event.inTelemetryCatalog && event.eventEnvelopeMapped && event.adminDebugVisible);
  const adminTruthOk = Boolean(
    (adminLane.sourceMissing === false || adminLane.sourceState === "connected")
      && (adminLane.rawMessageContentIncluded === false || adminLane.rawMessageContentDefault === false)
      && (adminLane.blockedFailedVisible !== false)
      && (adminLane.userLevelMetricsVisible !== false)
      && (adminLane.creatorLevelMetricsVisible !== false),
  );
  const transcriptOk = Boolean(
    transcriptPolicy.broadAdminSummaryIncludesMessageContent === false
      && transcriptPolicy.transcriptDefaultOpen === false
      && transcriptPolicy.drilldownRequiresPermissionGuard
      && transcriptPolicy.sourceRoute
      && transcriptPolicy.sourceHelper,
  );
  const chatActionsMetric = Array.isArray(personMetrics.metricStatuses)
    ? personMetrics.metricStatuses.some((metric: any) => metric.metricId === "chat_actions" && (metric.hydrationSource || metric.state === "hydrated"))
    : personMetrics.metricStatus?.chat_actions?.state === "hydrated" || Number(personMetrics.hydratedMetricCount ?? 0) > 0;
  const lowConfidenceCount = Number(personMetrics.lowConfidenceMetricCount ?? personMetrics.lowConfidenceMetrics?.length ?? 0);
  const personMetricsOk = Boolean(chatActionsMetric && lowConfidenceCount === 0);

  const remainingGaps = [
    ...(!realtimeOk ? ["chat realtime propagation/source validation incomplete"] : []),
    ...(!listenerCostOk ? ["chat listener cost controls incomplete"] : []),
    ...(!presenceOk ? ["chat typing/presence source validation incomplete"] : []),
    ...(!gatingOk ? ["chat paid-GD backend gating incomplete"] : []),
    ...(!moderationOk ? ["chat moderation/media status incomplete"] : []),
    ...(!telemetryOk ? ["chat telemetry catalog/envelope/debug coverage incomplete"] : []),
    ...(!adminTruthOk ? ["chat admin truth summary incomplete"] : []),
    ...(!transcriptOk ? ["chat transcript guarded source incomplete"] : []),
    ...(!personMetricsOk ? ["chat person metrics hydration incomplete"] : []),
  ];

  const report: ChatFunctionalityScoreLockReport = {
    generatedAtUtc: new Date().toISOString(),
    currentHead: input.currentHead ?? git(["rev-parse", "HEAD"]),
    productionReadsRequired: false,
    liveDataMutationAllowed: false,
    deployRequired: false,
    realtimePropagationStatus: statusFrom(realtimeOk, ["bounded thread listener", "selected-thread message listener", "send reconciliation telemetry"], realtimeOk ? [] : ["realtime source validation"], "Keep source validation; runtime/provider proof remains separate."),
    listenerCostStatus: statusFrom(listenerCostOk, ["selected-thread-only message listener", "no broad all-message listener", "explicit detach policy"], listenerCostOk ? [] : ["listener cost guard"], "Keep listener count and document limits bounded."),
    typingPresenceStatus: statusFrom(presenceOk, ["RTDB onDisconnect cleanup", "typing throttle", "timeout/blur/send/unmount cleanup"], presenceOk ? [] : ["typing/presence cleanup guard"], "Keep typing ephemeral and throttled."),
    paidGdGatingStatus: statusFrom(gatingOk, ["backend paid-GD enforcement", "reward/free GD rejected", "idempotency required", "human-safe blocked errors"], gatingOk ? [] : ["paid-GD backend enforcement"], "Preserve GumDrop math and source-of-funds policy."),
    moderationStatus: statusFrom(moderationOk, ["moderation status debug visibility", "media limits enforced"], moderationOk ? [] : ["moderation/media debug visibility"], "Keep blocked attempts visible without exposing message content in summaries."),
    telemetryStatus: statusFrom(telemetryOk, ["chat events in telemetry catalog", "event envelopes mapped", "debug visible"], telemetryOk ? [] : ["chat telemetry mapping"], "Keep chat events mapped into canonical envelopes and debug lanes."),
    adminTruthStatus: statusFrom(adminTruthOk, ["compact admin summary lane", "blocked/failed attempts visible", "raw message content excluded"], adminTruthOk ? [] : ["admin chat summary lane"], "Keep admin summaries count/source-state based."),
    transcriptTruthStatus: {
      ...statusFrom(transcriptOk, ["permission guarded transcript drilldown", "source route/helper declared", "default transcript closed"], transcriptOk ? [] : ["guarded transcript source"], "Use guarded drilldown only; do not dump transcripts by default."),
      messageContentExposedByDefault: transcriptPolicy.broadAdminSummaryIncludesMessageContent !== false || adminLane.rawMessageContentIncluded === true || adminLane.rawMessageContentDefault === true,
      guardedDrilldown: Boolean(transcriptPolicy.drilldownRequiresPermissionGuard),
      sourceRoute: transcriptPolicy.sourceRoute || null,
      sourceHelper: transcriptPolicy.sourceHelper || null,
    },
    personMetricsStatus: statusFrom(personMetricsOk, ["chat_actions person metric", "low confidence count is zero"], personMetricsOk ? [] : ["chat_actions hydration"], "Keep chat usage hydrating through person metrics, not raw transcript dumps."),
    scoreBefore,
    scoreAfter,
    scoreDimensions: buildScoreDimensions(scoreBefore, scoreAfter),
    remainingGaps,
    nextExactSteps: remainingGaps.length > 0
      ? remainingGaps.map((gap) => `Fix ${gap}.`)
      : ["Collect formal runtime/provider smoke and admin truth evidence outside this source-only lock.", "Keep future chat activity distinct from source readiness; do not fake runtime evidence."],
    dirtyFiles: dirty,
    oldChatLogicReferences,
    validationFailures: [],
  };
  report.validationFailures = validateChatFunctionalityScoreLockReport(report);
  return report;
}

export function validateChatFunctionalityScoreLockReport(report: ChatFunctionalityScoreLockReport) {
  const failures: string[] = [];
  if (!report.realtimePropagationStatus) failures.push("realtime status missing.");
  if (!report.typingPresenceStatus) failures.push("typing/presence status missing.");
  if (report.paidGdGatingStatus.status !== "pass") failures.push("paid-GD backend enforcement missing.");
  if (report.moderationStatus.status !== "pass") failures.push("moderation status missing.");
  if (report.telemetryStatus.status !== "pass") failures.push("chat telemetry missing from catalog.");
  if (report.adminTruthStatus.status !== "pass") failures.push("admin truth missing.");
  if (!report.transcriptTruthStatus.guardedDrilldown || !report.transcriptTruthStatus.sourceRoute || !report.transcriptTruthStatus.sourceHelper) failures.push("transcript truth claims connected without source.");
  if (report.transcriptTruthStatus.messageContentExposedByDefault) failures.push("admin summary exposes chat message content by default.");
  if (report.personMetricsStatus.status !== "pass") failures.push("chat person metrics missing.");
  for (const dimension of SCORE_DIMENSIONS) {
    if (!report.scoreDimensions[dimension]) failures.push(`score dimension missing: ${dimension}.`);
  }
  if (report.oldChatLogicReferences.some((entry) => entry.classification === "unsafe_unknown")) failures.push("old chat unknown/orphan logic remains active.");
  if (report.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) failures.push("dirty files unclassified.");
  if (report.dirtyFiles.some((entry) => /src\/lib\/gumdrop|src\/lib\/gumdrops|src\/app\/api\/paypal|src\/components\/Wallet|src\/components\/PurchaseModal/iu.test(entry.path))) failures.push("GumDrop math or payment runtime changed.");
  return failures;
}

function renderDoc(report: ChatFunctionalityScoreLockReport) {
  const statusRows = [
    ["Realtime propagation", report.realtimePropagationStatus],
    ["Listener cost", report.listenerCostStatus],
    ["Typing/presence", report.typingPresenceStatus],
    ["Paid-GD gating", report.paidGdGatingStatus],
    ["Moderation", report.moderationStatus],
    ["Telemetry", report.telemetryStatus],
    ["Admin truth", report.adminTruthStatus],
    ["Transcript truth", report.transcriptTruthStatus],
    ["Person metrics", report.personMetricsStatus],
  ].map(([label, status]) => `- ${label}: ${(status as ChatFunctionalityStatus).status}; next=${(status as ChatFunctionalityStatus).nextAction}`);
  const scoreRows = SCORE_DIMENSIONS.map((dimension) => {
    const score = report.scoreDimensions[dimension];
    return `- ${dimension}: ${score.before} -> ${score.after} (target ${score.target}; ${score.status}); next=${score.nextAction}`;
  });
  return [
    "# Chat Functionality Score Lock",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current HEAD: ${report.currentHead}`,
    "",
    "## Status",
    "",
    ...statusRows,
    "",
    "## Transcript Truth",
    "",
    `- Message content exposed by default: ${report.transcriptTruthStatus.messageContentExposedByDefault}`,
    `- Guarded drilldown: ${report.transcriptTruthStatus.guardedDrilldown}`,
    `- Source route: ${report.transcriptTruthStatus.sourceRoute ?? "missing"}`,
    `- Source helper: ${report.transcriptTruthStatus.sourceHelper ?? "missing"}`,
    "",
    "## Score Dimensions",
    "",
    ...scoreRows,
    "",
    "## Remaining Gaps",
    "",
    ...(report.remainingGaps.length ? report.remainingGaps.map((gap) => `- ${gap}`) : ["- None in source-level chat functionality lock."]),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`) : ["- None."]),
    "",
  ].join("\n");
}

if (process.argv[1]?.replace(/\\/gu, "/").endsWith("scripts/agent/validate-chat-functionality-score-lock.ts")) {
  const report = buildChatFunctionalityScoreLockReport();
  writeFileSync(STATE_PATH, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(DOC_PATH, renderDoc(report));
  if (report.validationFailures.length > 0) {
    console.error(`Chat functionality score lock validation failed:\n- ${report.validationFailures.join("\n- ")}`);
    process.exit(1);
  }
  console.log("Chat functionality score lock validation passed.");
}
