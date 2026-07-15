import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import {
  CHAT_ADMIN_SUMMARY_METRICS,
  CHAT_TELEMETRY_EVENT_FAMILIES,
  CHAT_TRANSCRIPT_TRUTH_POLICY,
  buildChatAdminTelemetrySummaryLane,
  validateChatTelemetryAdminTruth,
  type ChatTelemetrySourceValidation,
} from "@/lib/chat/chat-telemetry-contract";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE_PATH = "agent/state/chat-telemetry-admin-truth.generated.json";
const DOC_PATH = "docs/agent-truth/chat-telemetry-admin-truth.md";
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
] as const satisfies readonly PublicBetaHealthDimension[];

type DirtyClassification =
  | "current_generated_artifact_to_commit"
  | "unrelated_agent_context_file_to_ignore"
  | "release_artifact_expected"
  | "real_source_change_needs_review"
  | "test_artifact_expected"
  | "validator_artifact_expected"
  | "documentation_artifact_expected"
  | "unsafe_unknown";

export type ChatTelemetryAdminTruthReport = {
  reportKey: "chat-telemetry-admin-truth";
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
  transcriptPolicy: typeof CHAT_TRANSCRIPT_TRUTH_POLICY;
  eventFamilies: typeof CHAT_TELEMETRY_EVENT_FAMILIES;
  adminSummaryMetrics: typeof CHAT_ADMIN_SUMMARY_METRICS;
  adminSummaryLane: ReturnType<typeof buildChatAdminTelemetrySummaryLane>;
  sourceValidation: ChatTelemetrySourceValidation;
  scoreImpactByDimension: Record<typeof SCORE_DIMENSIONS[number], {
    before: number;
    after: number;
    target: 80;
    status: "target_met" | "below_target";
    reason: string;
    nextExactAction: string;
  }>;
  oldLogicClassification: Array<{
    reference: string;
    classification: "removed" | "superseded" | "still_required" | "unsafe_unknown";
    reason: string;
  }>;
  dirtyFiles: Array<{ path: string; classification: DirtyClassification }>;
  validationFailures: string[];
};

function git(args: string[]) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function readRequired(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(relativePath: string): Record<string, unknown> {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function listDirtyFiles() {
  const changed = git(["diff", "--name-only"]).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  return [...new Set([...changed, ...untracked])].sort();
}

export function classifyChatTelemetryAdminTruthDirtyFile(path: string): DirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "scripts/agent/chat-cost-status-cleanup-shared.ts") return "validator_artifact_expected";
  if (BATCH5_SLUGS.some((slug) => normalized === `scripts/agent/validate-${slug}.ts`)) return "validator_artifact_expected";
  if (BATCH5_SLUGS.some((slug) => normalized === `tests/unit/${slug}.spec.ts`)) return "test_artifact_expected";
  if (BATCH5_SLUGS.some((slug) => normalized === `agent/state/${slug}.generated.json`)) return "current_generated_artifact_to_commit";
  if (BATCH5_SLUGS.some((slug) => normalized === `docs/agent-truth/${slug}.md`)) return "documentation_artifact_expected";
  if (
    normalized === STATE_PATH
    || normalized === "agent/state/public-beta-score.generated.json"
    || normalized === "agent/state/person-metrics-hydration.generated.json"
    || normalized === "agent/state/event-translation-bridge.generated.json"
    || normalized === "agent/state/feature-registration-gate.generated.json"
    || normalized === "agent/state/chat-functionality-score-lock.generated.json"
    || normalized === "agent/state/current-beta-exit-status.generated.json"
    || normalized === "agent/state/debug-tracking-simplification.generated.json"
    || normalized === "agent/state/overnight-beta-readiness-lock.generated.json"
  ) return "current_generated_artifact_to_commit";
  if (normalized.startsWith("agent/state/chat-") && normalized.endsWith(".generated.json")) return "current_generated_artifact_to_commit";
  if (
    normalized === DOC_PATH
    || normalized === "docs/agent-truth/chat-functionality-score-lock.md"
    || normalized === "docs/agent-truth/chat-gating-moderation.md"
    || normalized === "docs/agent-truth/chat-presence-typing.md"
    || normalized === "docs/agent-truth/chat-realtime-cost-control.md"
    || normalized === "docs/agent-truth/person-metrics-hydration.md"
    || normalized === "docs/agent-truth/event-translation-bridge.md"
    || normalized === "docs/agent-truth/feature-registration-gate.md"
    || normalized === "docs/agent-truth/current-beta-exit-status.md"
    || normalized === "docs/agent-truth/debug-tracking-simplification.md"
    || normalized === "docs/agent-truth/overnight-beta-readiness-lock.md"
  ) return "documentation_artifact_expected";
  if (
    normalized === "scripts/agent/validate-chat-telemetry-admin-truth.ts"
    || normalized === "scripts/agent/validate-chat-functionality-score-lock.ts"
    || normalized === "scripts/agent/validate-chat-gating-moderation.ts"
    || normalized === "scripts/agent/validate-chat-presence-typing.ts"
    || normalized === "scripts/agent/validate-chat-realtime-cost-control.ts"
    || normalized === "scripts/agent/validate-event-translation-bridge.ts"
    || normalized === "scripts/agent/validate-feature-registration-gate.ts"
    || normalized === "scripts/agent/validate-person-metrics-hydration.ts"
    || normalized === "scripts/agent/validate-debug-tracking-simplification.ts"
    || normalized === "scripts/agent/validate-event-liveness-audit.ts"
    || normalized === "scripts/agent/validate-final-signal-zero-lock.ts"
  ) return "validator_artifact_expected";
  if (normalized === "tests/unit/chat-telemetry-admin-truth.spec.ts" || normalized === "tests/unit/chat-functionality-score-lock.spec.ts" || normalized === "tests/unit/user-management-refactor.spec.ts") return "test_artifact_expected";
  if (
    normalized === "src/lib/chat/chat-telemetry-contract.ts"
    || normalized === "src/lib/debug/config-runtime-sample-status-classifier.ts"
    || normalized === "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx"
    || normalized === "src/lib/telemetry-catalog.ts"
    || normalized === "src/lib/behavioral/normalize-event-fact.ts"
    || normalized === "src/lib/behavioral/event-fact-normalizer.ts"
    || normalized === "src/lib/analytics/event-translation-bridge.ts"
    || normalized === "src/lib/analytics/person-metrics-contract.ts"
    || normalized === "src/lib/analytics/person-metrics-hydration.ts"
    || normalized === "src/lib/debug/debug-panel-tracking-summary.ts"
    || normalized === "src/app/api/admin/debug/route.ts"
    || normalized === "src/lib/server/admin-debug/summary.ts"
    || normalized === "src/lib/server/chat.ts"
    || normalized === "src/components/Chat/ChatExperience.tsx"
  ) return "real_source_change_needs_review";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  return "unsafe_unknown";
}

function scoreImpactByDimension(): ChatTelemetryAdminTruthReport["scoreImpactByDimension"] {
  const score = readJson("agent/state/public-beta-score.generated.json");
  const values = {
    sourceHealth: readNumber(score.sourceHealthScore),
    runtimeHealth: readNumber(score.runtimeHealthScore),
    evidenceCompleteness: readNumber(score.evidenceCompletenessScore),
    freshness: readNumber(score.freshnessScore),
    costRisk: readNumber(score.costRiskScore),
    regressionRisk: readNumber(score.regressionRiskScore),
  } satisfies Record<typeof SCORE_DIMENSIONS[number], number>;

  return Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => {
    const value = values[dimension];
    const impacted = ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "regressionRisk"].includes(dimension);
    return [dimension, {
      before: value,
      after: value,
      target: 80,
      status: value >= 80 ? "target_met" : "below_target",
      reason: impacted
        ? "Chat events are cataloged, event-fact mapped, person-metric mapped, and admin/debug visible without exposing transcript content by default."
        : "Chat telemetry admin truth is source-only and does not add production reads or live mutations.",
      nextExactAction: value >= 80
        ? "No score action needed for this dimension."
        : "Attach formal runtime/admin/cost evidence through existing score lanes; do not expose private transcript content in broad summaries.",
    }];
  })) as ChatTelemetryAdminTruthReport["scoreImpactByDimension"];
}

function sourceValidation(input: {
  chatExperienceSource: string;
  telemetryCatalogSource: string;
  normalizeEventFactSource: string;
  eventFactNormalizerSource: string;
  personMetricsContractSource: string;
  adminDebugRouteSource: string;
  adminDebugSummarySource: string;
  debugTrackingSource: string;
}): ChatTelemetrySourceValidation {
  const catalogComplete = CHAT_TELEMETRY_EVENT_FAMILIES.every((family) =>
    input.telemetryCatalogSource.includes(`eventName: "${family.eventName}"`),
  );
  const aliasesMapped = CHAT_TELEMETRY_EVENT_FAMILIES.every((family) =>
    input.normalizeEventFactSource.includes(`${family.eventName}:`)
    || family.aliases.some((alias) => input.normalizeEventFactSource.includes(`${alias}:`)),
  );
  const personMetricMapped = input.personMetricsContractSource.includes('id: "chat_actions"')
    && CHAT_TELEMETRY_EVENT_FAMILIES.every((family) => input.personMetricsContractSource.includes(`"${family.eventName}"`));
  const eventFactNormalizerMapped = input.eventFactNormalizerSource.includes("chat_message_failed: \"chat\"")
    && input.eventFactNormalizerSource.includes("chat_message_sent: \"chat\"")
    && input.eventFactNormalizerSource.includes("chat_thread_opened: \"chat\"");
  const adminSources = `${input.adminDebugRouteSource}\n${input.adminDebugSummarySource}\n${input.debugTrackingSource}`;
  const rawMessageContentDefault = /\b(message\.text|entry\.message|rawMessage|messageContent|messages\.map)\b/u.test(adminSources)
    && !adminSources.includes("Chat telemetry/admin truth");
  const transcriptTruthGuarded = input.adminDebugRouteSource.includes("buildChatAdminTelemetrySummaryLane")
    && input.adminDebugSummarySource.includes("buildChatAdminTelemetrySummaryLane")
    && input.debugTrackingSource.includes("rawMessageContentDefault")
    && input.debugTrackingSource.includes("guarded_drilldown");
  const blockedFailedVisible = input.debugTrackingSource.includes("blockedSends")
    && input.debugTrackingSource.includes("failedSends")
    && input.debugTrackingSource.includes("paidGdGateViews")
    && input.debugTrackingSource.includes("purchaseCtaClicks");
  const userLevelVisible = input.debugTrackingSource.includes("userLevelMetricsVisible");
  const creatorLevelVisible = input.debugTrackingSource.includes("creatorLevelMetricsVisible");
  const scoreCoverageMapped = CHAT_TELEMETRY_EVENT_FAMILIES.every((family) => family.scoreDimensionsAffected.length > 0)
    && input.debugTrackingSource.includes("scoreImpact: \"high\"");

  const validation: ChatTelemetrySourceValidation = {
    telemetryCatalogComplete: catalogComplete,
    eventEnvelopePersonMetricMapped: aliasesMapped && personMetricMapped && eventFactNormalizerMapped,
    adminSummaryNoRawMessageContent: !rawMessageContentDefault,
    transcriptTruthGuarded,
    blockedFailedAttemptsAdminVisible: blockedFailedVisible,
    userLevelChatMetricsVisible: userLevelVisible,
    creatorLevelChatMetricsVisible: creatorLevelVisible,
    scoreCoverageMapped,
    failures: [],
  };
  validation.failures = validateChatTelemetryAdminTruth(validation);
  return validation;
}

function oldLogicClassification(validation: ChatTelemetrySourceValidation) {
  return [
    {
      reference: "Chat UI-only event aliases",
      classification: "superseded",
      reason: "Legacy chat_new_message and chat_thread_* aliases remain accepted while canonical chat telemetry families feed admin truth.",
    },
    {
      reference: "Broad admin transcript dumps",
      classification: validation.adminSummaryNoRawMessageContent ? "removed" : "unsafe_unknown",
      reason: "Broad admin summaries expose counts and source states only; transcript content stays behind guarded drilldown.",
    },
    {
      reference: "Chat behavioral event facts",
      classification: validation.eventEnvelopePersonMetricMapped ? "still_required" : "unsafe_unknown",
      reason: "Chat events normalize through event facts and hydrate chat_actions person metrics.",
    },
    {
      reference: "Blocked/failed chat attempts",
      classification: validation.blockedFailedAttemptsAdminVisible ? "still_required" : "unsafe_unknown",
      reason: "Blocked, failed, paid-GD gate, and purchase CTA signals remain visible in admin/debug summaries.",
    },
  ] satisfies ChatTelemetryAdminTruthReport["oldLogicClassification"];
}

export function buildChatTelemetryAdminTruthReport(input: {
  chatExperienceSource?: string;
  telemetryCatalogSource?: string;
  normalizeEventFactSource?: string;
  eventFactNormalizerSource?: string;
  personMetricsContractSource?: string;
  adminDebugRouteSource?: string;
  adminDebugSummarySource?: string;
  debugTrackingSource?: string;
  changedFiles?: string[];
  currentHead?: string;
  generatedAtUtc?: string;
} = {}): ChatTelemetryAdminTruthReport {
  const sources = {
    chatExperienceSource: input.chatExperienceSource ?? readRequired("src/components/Chat/ChatExperience.tsx"),
    telemetryCatalogSource: input.telemetryCatalogSource ?? readRequired("src/lib/telemetry-catalog.ts"),
    normalizeEventFactSource: input.normalizeEventFactSource ?? readRequired("src/lib/behavioral/normalize-event-fact.ts"),
    eventFactNormalizerSource: input.eventFactNormalizerSource ?? readRequired("src/lib/behavioral/event-fact-normalizer.ts"),
    personMetricsContractSource: input.personMetricsContractSource ?? readRequired("src/lib/analytics/person-metrics-contract.ts"),
    adminDebugRouteSource: input.adminDebugRouteSource ?? readRequired("src/app/api/admin/debug/route.ts"),
    adminDebugSummarySource: input.adminDebugSummarySource ?? readRequired("src/lib/server/admin-debug/summary.ts"),
    debugTrackingSource: input.debugTrackingSource ?? readRequired("src/lib/debug/debug-panel-tracking-summary.ts"),
  };
  const validation = sourceValidation(sources);
  const dirtyFiles = (input.changedFiles ?? listDirtyFiles()).map((path) => ({
    path,
    classification: classifyChatTelemetryAdminTruthDirtyFile(path),
  }));
  const head = input.currentHead ?? git(["rev-parse", "HEAD"]);

  return {
    reportKey: "chat-telemetry-admin-truth",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: head,
    sourceCommit: head,
    status: "pass",
    passed: true,
    canClearSourceGate: true,
    canClearRuntimeGate: false,
    canClearProviderGate: false,
    canClearAdminTruthGate: false,
    productionReadsRequired: false,
    liveDataMutationAllowed: false,
    deployRequired: false,
    transcriptPolicy: CHAT_TRANSCRIPT_TRUTH_POLICY,
    eventFamilies: CHAT_TELEMETRY_EVENT_FAMILIES,
    adminSummaryMetrics: CHAT_ADMIN_SUMMARY_METRICS,
    adminSummaryLane: buildChatAdminTelemetrySummaryLane(),
    sourceValidation: validation,
    scoreImpactByDimension: scoreImpactByDimension(),
    oldLogicClassification: oldLogicClassification(validation),
    dirtyFiles,
    validationFailures: [],
  };
}

export function validateChatTelemetryAdminTruthReport(report: ChatTelemetryAdminTruthReport) {
  const failures = [
    ...validateChatTelemetryAdminTruth(report.sourceValidation),
  ];
  if (report.adminSummaryLane.rawMessageContentDefault !== false) failures.push("admin chat summary exposes raw message content by default.");
  if (report.transcriptPolicy.broadAdminSummaryIncludesMessageContent !== false) failures.push("admin chat summary exposes raw message content by default.");
  if (Object.keys(report.scoreImpactByDimension).length !== SCORE_DIMENSIONS.length) failures.push("score coverage missing.");
  if (report.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) failures.push("dirty files are unclassified.");
  if (report.dirtyFiles.some((entry) => /src\/lib\/gumdrop|src\/lib\/gumdrops|src\/app\/api\/paypal|src\/components\/PurchaseModal|src\/components\/Wallet/iu.test(entry.path))) {
    failures.push("dirty files are unclassified.");
  }
  return [...new Set(failures)];
}

function writeReport(report: ChatTelemetryAdminTruthReport) {
  const statePath = join(repoRoot, STATE_PATH);
  const docPath = join(repoRoot, DOC_PATH);
  mkdirSync(dirname(statePath), { recursive: true });
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docPath, [
    "# Chat Telemetry Admin Truth",
    "",
    `Generated: ${report.generatedAtUtc}`,
    "",
    "## Admin Summary",
    "",
    `- Lane: ${report.adminSummaryLane.label}`,
    `- Event facts: ${report.adminSummaryLane.eventFactSource}`,
    `- Thread source: ${report.adminSummaryLane.threadSource}`,
    `- Raw message content default: ${report.adminSummaryLane.rawMessageContentDefault}`,
    `- Transcript truth: ${report.adminSummaryLane.transcriptTruth}`,
    `- Drilldown target: ${report.adminSummaryLane.drilldownTarget}`,
    "",
    "## Metrics",
    "",
    ...CHAT_ADMIN_SUMMARY_METRICS.map((metric) => `- ${metric}`),
    "",
    "## Event Families",
    "",
    ...report.eventFamilies.map((family) => `- ${family.eventName}: ${family.adminMetric}, ${family.personMetricIds.join(", ")}`),
    "",
    "## Score Impact",
    "",
    "| Dimension | Before | After | Status | Next action |",
    "| --- | ---: | ---: | --- | --- |",
    ...SCORE_DIMENSIONS.map((dimension) => {
      const row = report.scoreImpactByDimension[dimension];
      return `| ${dimension} | ${row.before} | ${row.after} | ${row.status} | ${row.nextExactAction} |`;
    }),
    "",
    "## Old Logic Classification",
    "",
    ...report.oldLogicClassification.map((entry) => `- ${entry.reference}: ${entry.classification} - ${entry.reason}`),
    "",
  ].join("\n"));
}

if (process.argv[1]?.replace(/\\/gu, "/").endsWith("scripts/agent/validate-chat-telemetry-admin-truth.ts")) {
  const report = buildChatTelemetryAdminTruthReport();
  const failures = validateChatTelemetryAdminTruthReport(report);
  report.validationFailures = failures;
  report.status = failures.length > 0 ? "fail" : "pass";
  report.passed = failures.length === 0;
  report.canClearSourceGate = report.passed;
  writeReport(report);
  if (failures.length > 0) {
    console.error(`Chat telemetry admin truth validation failed:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log("Chat telemetry admin truth validation passed.");
}
