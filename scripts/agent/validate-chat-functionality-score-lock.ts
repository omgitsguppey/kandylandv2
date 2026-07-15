import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { validateGeneratedChildReportEvidence } from "./generated-report-envelope";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE_PATH = join(ROOT, "agent", "state", "chat-functionality-score-lock.generated.json");
const DOC_PATH = join(ROOT, "docs", "agent-truth", "chat-functionality-score-lock.md");
const FULL_GIT_SHA_PATTERN = /^[0-9a-f]{40}$/iu;
const MAX_REPORT_AGE_MS = 24 * 60 * 60 * 1000;
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
type OldChatLogicClassification =
  | "still_required"
  | "superseded"
  | "stale_removed"
  | "real_chat_source"
  | "stale_artifact"
  | "protected_gating_payment_surface"
  | "support_overlap"
  | "obsolete_report_noise";

export interface ChatFunctionalityStatus {
  status: Status;
  evidence: string[];
  missing: string[];
  nextAction: string;
}

export interface ChatFunctionalityScoreLockReport {
  reportKey: "chat-functionality-score-lock";
  generatedAtUtc: string;
  currentHead: string;
  sourceCommit: string;
  status: "pass" | "fail";
  passed: boolean;
  canClearSourceGate: boolean;
  canClearRuntimeGate: false;
  canClearProviderGate: false;
  canClearAdminTruthGate: false;
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
  dirtyFileCount: number;
  dirtyClassificationCounts: Record<string, number>;
  unsafeUnknownCount: number;
  reliabilityRiskClassifications: {
    staleReportNoise: number;
    sourceGaps: number;
    realChatReliabilityRisks: number;
    protectedManualReview: number;
    supportOverlap: number;
    obsoleteReportNoise: number;
  };
  oldChatLogicReferences: Array<{ reference: string; classification: OldChatLogicClassification; reason: string }>;
  validationFailures: string[];
}

interface BuildInput {
  currentHead?: string;
  generatedAtUtc?: string;
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

export function readChatFunctionalityArtifact(path: string) {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readState(name: string) {
  return readChatFunctionalityArtifact(join(ROOT, "agent", "state", name));
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
  if (/^agent\/context\//u.test(normalized) || /^agent\/index\//u.test(normalized) || /^agent\/prompts\//u.test(normalized) || /^agent\/schemas\//u.test(normalized)) return "repo_context_artifact_outside_chat_reliability";
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
    || normalized === "tests/unit/chat-experience-error-language.spec.ts"
    || normalized === "tests/unit/user-management-refactor.spec.ts"
    || normalized === "package.json"
  ) return normalized.endsWith(".spec.ts") ? "test_artifact_expected" : "real_source_change_needs_review";
  if (
    normalized.startsWith("src/lib/chat/")
    || normalized === "src/lib/chat.ts"
    || normalized === "src/lib/server/chat.ts"
    || normalized.startsWith("src/app/api/chat/")
    || normalized.startsWith("src/app/api/messages/")
    || normalized.startsWith("src/components/Chat/")
    || normalized.startsWith("src/hooks/useChat")
  ) return "chat_source_reliability_review";
  if (
    normalized.startsWith("src/components/Support/")
    || normalized.startsWith("src/app/api/support/")
    || normalized.startsWith("src/app/api/admin/support/")
    || /support-policy|support-thread|support-inbox/iu.test(normalized)
  ) return "support_inbox_truth_review";
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
  ) return "real_source_change_needs_review";
  if (/fan-pass|fan_pass|gumdrop|gumdrops|paypal|payment|wallet|PurchaseModal|source-of-funds/iu.test(normalized)) return "protected_manual_review_payment_or_fan_pass_gating";
  if (/chat/iu.test(normalized)) return "chat_related_manual_review";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_report_noise_outside_chat_lock";
  if (normalized.startsWith("docs/agent-truth/") && normalized.endsWith(".md")) return "generated_report_doc_outside_chat_lock";
  if (/^tests\/unit\//u.test(normalized)) return "test_artifact_outside_chat_reliability";
  if (/^scripts\/agent\//u.test(normalized)) return "agent_validator_artifact_outside_chat_reliability";
  if (/^src\//u.test(normalized)) return "source_change_outside_chat_reliability";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  return "non_chat_artifact_outside_chat_reliability";
}

function summarizeDirtyClassifications(dirty: Array<{ path: string; classification: string }>) {
  const dirtyClassificationCounts = dirty.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.classification] = (counts[entry.classification] ?? 0) + 1;
    return counts;
  }, {});
  return {
    dirtyClassificationCounts,
    unsafeUnknownCount: dirtyClassificationCounts.unsafe_unknown ?? 0,
    reliabilityRiskClassifications: {
      staleReportNoise: dirty.filter((entry) => /generated_report|stale_generated|repo_context|agent_validator|non_chat_artifact/iu.test(entry.classification)).length,
      sourceGaps: dirty.filter((entry) => /chat_source|support_inbox|real_source_change|chat_related_manual_review/iu.test(entry.classification)).length,
      realChatReliabilityRisks: dirty.filter((entry) => /chat_source_reliability_review|support_inbox_truth_review/iu.test(entry.classification)).length,
      protectedManualReview: dirty.filter((entry) => entry.classification === "protected_manual_review_payment_or_fan_pass_gating").length,
      supportOverlap: dirty.filter((entry) => entry.classification === "support_inbox_truth_review").length,
      obsoleteReportNoise: dirty.filter((entry) => /stale_generated_report_noise_outside_chat_lock|generated_report_doc_outside_chat_lock/iu.test(entry.classification)).length,
    },
  };
}

function statusFrom(condition: boolean, evidence: string[], missing: string[], nextAction: string): ChatFunctionalityStatus {
  return {
    status: condition ? "pass" : "fail",
    evidence,
    missing,
    nextAction,
  };
}

function hasHydratedPersonMetric(report: any, metricId: string) {
  const metric = report?.consumerMetricStatus?.byId?.[metricId]
    ?? (!Array.isArray(report?.metricStatus) ? report?.metricStatus?.[metricId] : null);
  return metric?.state === "hydrated" || metric?.hydrated === true;
}

function explicitLowConfidenceMetricCount(report: any) {
  const candidates = [
    report?.debugLane?.lowConfidenceMetrics,
    report?.lowConfidenceMetricCount,
    report?.lowConfidenceMetrics?.total,
    Array.isArray(report?.lowConfidenceMetrics) ? report.lowConfidenceMetrics.length : null,
  ];
  const value = candidates.find((candidate) => typeof candidate === "number" && Number.isFinite(candidate));
  return typeof value === "number" ? value : null;
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
  const currentHead = input.currentHead ?? git(["rev-parse", "HEAD"]);
  const childEvidenceFailures = {
    realtime: validateGeneratedChildReportEvidence({
      report: realtime,
      expectedReportKey: "chat-realtime-cost-control",
      currentHead,
      requireSourceGate: true,
    }),
    presence: validateGeneratedChildReportEvidence({
      report: presence,
      expectedReportKey: "chat-presence-typing",
      currentHead,
      requireSourceGate: true,
    }),
    gating: validateGeneratedChildReportEvidence({
      report: gating,
      expectedReportKey: "chat-gating-moderation",
      currentHead,
      requireSourceGate: true,
    }),
    telemetry: validateGeneratedChildReportEvidence({
      report: telemetry,
      expectedReportKey: "chat-telemetry-admin-truth",
      currentHead,
      requireSourceGate: true,
    }),
    personMetrics: validateGeneratedChildReportEvidence({
      report: personMetrics,
      expectedReportKey: "person-metrics-hydration",
      currentHead,
      requireSourceGate: true,
    }),
  };
  const childEvidenceOk = Object.fromEntries(
    Object.entries(childEvidenceFailures).map(([key, failures]) => [key, failures.length === 0]),
  ) as Record<keyof typeof childEvidenceFailures, boolean>;
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
  const dirtySummary = summarizeDirtyClassifications(dirty);
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
    childEvidenceOk.realtime
      && realtimeSource.threadListenerBounded
      && realtimeSource.messageListenerSelectedThreadOnly
      && realtimeSource.messageListenerBounded
      && realtimeSource.detachOnUnmount
      && realtimeSource.detachOnThreadSwitch
      && realtimeSource.hasRealtimeErrorDebugVisibility,
  );
  const listenerCostOk = Boolean(
    childEvidenceOk.realtime
      && realtimeSource.hasNoBroadAllMessageListener
      && realtimeSource.threadListenerBounded
      && realtimeSource.messageListenerBounded,
  );
  const presenceOk = Boolean(
    childEvidenceOk.presence
      && presenceSource.onDisconnectAttached
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
    childEvidenceOk.gating
      && gatingSource.backendEnforcesPaidOnly
      && gatingSource.rejectsRewardFreeGd
      && gatingSource.doesNotTrustClientPriceOrBalance
      && gatingSource.idempotencyKeyRequired
      && gatingSource.blockedSendTelemetry
      && gatingSource.humanSafeBlockedErrors
      && gatingSource.gumdropMathUntouched,
  );
  const moderationOk = Boolean(childEvidenceOk.gating && gatingSource.moderationStatusDebugVisible && gatingSource.mediaLimitsEnforcedServerSide);
  const telemetryOk = childEvidenceOk.telemetry
    && eventFamilies.length > 0
    && eventFamilies.every((event: any) => event.inTelemetryCatalog && event.eventEnvelopeMapped && event.adminDebugVisible);
  const adminTruthOk = Boolean(
    childEvidenceOk.telemetry
      && (adminLane.sourceMissing === false || adminLane.sourceState === "connected")
      && (adminLane.rawMessageContentIncluded === false || adminLane.rawMessageContentDefault === false)
      && adminLane.blockedFailedVisible === true
      && adminLane.userLevelMetricsVisible === true
      && adminLane.creatorLevelMetricsVisible === true,
  );
  const transcriptOk = Boolean(
    childEvidenceOk.telemetry
      && transcriptPolicy.broadAdminSummaryIncludesMessageContent === false
      && transcriptPolicy.transcriptDefaultOpen === false
      && transcriptPolicy.drilldownRequiresPermissionGuard
      && transcriptPolicy.sourceRoute
      && transcriptPolicy.sourceHelper,
  );
  const chatActionsMetric = hasHydratedPersonMetric(personMetrics, "chat_actions");
  const lowConfidenceCount = explicitLowConfidenceMetricCount(personMetrics);
  const personMetricsOk = Boolean(
    childEvidenceOk.personMetrics
      && personMetrics.status === "pass"
      && Array.isArray(personMetrics.validationFailures)
      && personMetrics.validationFailures.length === 0
      && chatActionsMetric
      && lowConfidenceCount === 0,
  );

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
    reportKey: "chat-functionality-score-lock",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead,
    sourceCommit: currentHead,
    status: "pass",
    passed: true,
    canClearSourceGate: true,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
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
    dirtyFileCount: dirty.length,
    ...dirtySummary,
    oldChatLogicReferences,
    validationFailures: Object.values(childEvidenceFailures).flat(),
  };
  report.passed = report.validationFailures.length === 0;
  report.status = report.passed ? "pass" : "fail";
  report.canClearSourceGate = report.passed;
  report.validationFailures = validateChatFunctionalityScoreLockReport(report);
  report.passed = report.validationFailures.length === 0;
  report.status = report.passed ? "pass" : "fail";
  report.canClearSourceGate = report.passed;
  return report;
}

export function validateChatFunctionalityScoreLockReport(report: ChatFunctionalityScoreLockReport) {
  const declaredFailures = Array.isArray(report.validationFailures) ? report.validationFailures : [];
  const failures: string[] = [...declaredFailures];
  const generatedAtMs = Date.parse(report.generatedAtUtc);
  const nowMs = Date.now();
  if (!FULL_GIT_SHA_PATTERN.test(report.currentHead) || report.sourceCommit !== report.currentHead) {
    failures.push("currentHead and sourceCommit must be the same full 40-character Git SHA.");
  }
  if (!Number.isFinite(generatedAtMs) || generatedAtMs > nowMs || nowMs - generatedAtMs > MAX_REPORT_AGE_MS) {
    failures.push("generatedAtUtc must be a current, non-future timestamp inside the 24-hour evidence window.");
  }
  if (report.status !== "pass" && report.status !== "fail") failures.push("status must be pass or fail.");
  if (report.passed !== (report.status === "pass")) failures.push("passed must match the validator status.");
  if (!Array.isArray(report.validationFailures)) failures.push("validationFailures must be an array.");
  if (report.status === "pass" && declaredFailures.length > 0) {
    failures.push("validator status cannot pass while validation failures are present.");
  }
  if (report.status === "fail" && declaredFailures.length === 0) {
    failures.push("validator status cannot fail without validation failures.");
  }
  if (report.realtimePropagationStatus?.status !== "pass") failures.push("realtime status missing.");
  if (report.listenerCostStatus?.status !== "pass") failures.push("listener cost status missing.");
  if (report.typingPresenceStatus?.status !== "pass") failures.push("typing/presence status missing.");
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
  if (report.oldChatLogicReferences.some((entry) => String(entry.classification) === "unsafe_unknown")) failures.push("old chat unknown/orphan logic remains active.");
  if (report.unsafeUnknownCount > 0 || report.dirtyFiles.some((entry) => String(entry.classification) === "unsafe_unknown")) failures.push("dirty files unclassified.");
  if (report.dirtyFiles.some((entry) => entry.classification === "protected_manual_review_payment_or_fan_pass_gating" && /src\/lib\/chat|src\/components\/Chat|src\/app\/api\/chat/iu.test(entry.path))) failures.push("chat-owned Fan Pass/payment gating source changed.");
  return [...new Set(failures)];
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
    `Source commit: ${report.sourceCommit}`,
    `Validator status: ${report.status}`,
    `Validator passed: ${report.passed}`,
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
    "## Dirty Classification",
    "",
    `- Dirty files classified: ${report.dirtyFileCount}`,
    `- Unsafe unknown count: ${report.unsafeUnknownCount}`,
    `- Stale/report noise: ${report.reliabilityRiskClassifications.staleReportNoise}`,
    `- Source gaps/manual review: ${report.reliabilityRiskClassifications.sourceGaps}`,
    `- Real chat reliability risk candidates: ${report.reliabilityRiskClassifications.realChatReliabilityRisks}`,
    `- Protected payment/Fan Pass manual review: ${report.reliabilityRiskClassifications.protectedManualReview}`,
    `- Support overlap owner review: ${report.reliabilityRiskClassifications.supportOverlap}`,
    `- Obsolete/stale report noise: ${report.reliabilityRiskClassifications.obsoleteReportNoise}`,
    ...Object.entries(report.dirtyClassificationCounts).sort(([left], [right]) => left.localeCompare(right)).map(([classification, count]) => `- ${classification}: ${count}`),
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
