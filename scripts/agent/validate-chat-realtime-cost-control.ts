import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import {
  CHAT_REALTIME_CONTRACT,
  buildChatRealtimeDebugLane,
  validateChatRealtimeSource,
} from "@/lib/chat/chat-realtime-contract";
import {
  CHAT_REALTIME_TELEMETRY_EVENTS,
  validateChatRealtimeTelemetryContract,
} from "@/lib/chat/chat-realtime-telemetry";

export const CHAT_REALTIME_SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
] as const satisfies readonly PublicBetaHealthDimension[];

type ChatRealtimeDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_generated_artifact_to_revert_or_delete"
  | "stale_activity_signal_logic_to_remove"
  | "stale_debug_noise_logic_to_remove"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "test_artifact_expected"
  | "validator_artifact_expected"
  | "documentation_artifact_expected"
  | "unsafe_unknown";

export type ChatRealtimeCostControlReport = {
  reportKey: "chat-realtime-cost-control";
  generatedAtUtc: string;
  currentHead: string;
  productionReadsRequired: false;
  liveDataMutationAllowed: false;
  deployRequired: false;
  formalGateImpact: {
    clearsFormalProvider: false;
    clearsDeployedRuntime: false;
    clearsFormalAdminTruth: false;
  };
  listenerScope: {
    threadListScope: typeof CHAT_REALTIME_CONTRACT.threadListListener.scope;
    selectedThreadMessageScope: typeof CHAT_REALTIME_CONTRACT.selectedThreadMessageListener.scope;
    maxOpenFirestoreListenersPerMountedChat: number;
    noBroadAllMessageListener: boolean;
  };
  sourceValidation: ReturnType<typeof validateChatRealtimeSource>;
  telemetryEvents: typeof CHAT_REALTIME_TELEMETRY_EVENTS;
  telemetryFailures: string[];
  debugLane: ReturnType<typeof buildChatRealtimeDebugLane> & {
    label: "Chat realtime";
    listenerLimits: {
      threadList: number;
      selectedThreadMessages: number;
    };
  };
  scoreImpactByDimension: Record<typeof CHAT_REALTIME_SCORE_DIMENSIONS[number], {
    before: number;
    after: number;
    target: 80;
    status: "target_met" | "below_target";
    reason: string;
    nextExactAction: string;
  }>;
  dirtyFiles: Array<{
    path: string;
    classification: ChatRealtimeDirtyClassification;
  }>;
  oldLogicClassification: Array<{
    reference: string;
    classification: "still_required" | "superseded" | "removed" | "unsafe_unknown";
    reason: string;
  }>;
  validationFailures: string[];
};

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE_PATH = "agent/state/chat-realtime-cost-control.generated.json";
const DOC_PATH = "docs/agent-truth/chat-realtime-cost-control.md";

function readJson(relativePath: string): Record<string, unknown> {
  const fullPath = join(repoRoot, relativePath);
  if (!existsSync(fullPath)) return {};
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function git(args: string[]) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function listDirtyFiles() {
  const changed = git(["diff", "--name-only"]).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  return [...new Set([...changed, ...untracked])].sort();
}

export function classifyChatRealtimeDirtyFile(path: string): ChatRealtimeDirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === STATE_PATH) return "current_generated_artifact_to_commit";
  if (
    normalized === "agent/state/public-beta-score.generated.json"
    || normalized === "agent/state/chat-functionality-score-lock.generated.json"
    || normalized === "agent/state/chat-telemetry-admin-truth.generated.json"
  ) return "current_generated_artifact_to_commit";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "stale_generated_artifact_to_regenerate";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (
    normalized === "docs/agent-truth/chat-functionality-score-lock.md"
    || normalized === "docs/agent-truth/chat-telemetry-admin-truth.md"
  ) return "documentation_artifact_expected";
  if (normalized.startsWith("docs/agent-truth/")) return "stale_generated_artifact_to_regenerate";
  if (normalized === "scripts/agent/validate-chat-realtime-cost-control.ts") return "validator_artifact_expected";
  if (
    normalized === "scripts/agent/validate-chat-functionality-score-lock.ts"
    || normalized === "scripts/agent/validate-chat-gating-moderation.ts"
    || normalized === "scripts/agent/validate-chat-presence-typing.ts"
    || normalized === "scripts/agent/validate-chat-telemetry-admin-truth.ts"
    || normalized === "scripts/agent/validate-event-translation-bridge.ts"
    || normalized === "scripts/agent/validate-feature-registration-gate.ts"
    || normalized === "scripts/agent/validate-debug-tracking-simplification.ts"
  ) return "validator_artifact_expected";
  if (normalized === "tests/unit/chat-realtime-cost-control.spec.ts") return "test_artifact_expected";
  if (
    normalized === "tests/unit/chat-functionality-score-lock.spec.ts"
    || normalized === "tests/unit/chat-telemetry-admin-truth.spec.ts"
    || normalized === "tests/unit/user-management-refactor.spec.ts"
  ) return "test_artifact_expected";
  if (normalized === "src/lib/chat/chat-realtime-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/chat/chat-realtime-telemetry.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/chat/chat-telemetry-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Chat/ChatExperience.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts") return "real_source_change_needs_review";
  if (
    normalized === "src/app/api/admin/debug/route.ts"
    || normalized === "src/lib/server/admin-debug/summary.ts"
    || normalized === "src/lib/server/chat.ts"
    || normalized === "src/lib/analytics/event-translation-bridge.ts"
    || normalized === "src/lib/analytics/person-metrics-contract.ts"
    || normalized === "src/lib/analytics/person-metrics-hydration.ts"
    || normalized === "src/lib/behavioral/normalize-event-fact.ts"
    || normalized === "src/lib/debug/debug-panel-tracking-summary.ts"
  ) return "real_source_change_needs_review";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/stale|duplicate|old-chat-realtime|legacy-chat-realtime/iu.test(normalized)) return "stale_activity_signal_logic_to_remove";
  return "unsafe_unknown";
}

function scoreImpactByDimension(score: Record<string, unknown>): ChatRealtimeCostControlReport["scoreImpactByDimension"] {
  const values = {
    sourceHealth: readNumber(score.sourceHealthScore),
    runtimeHealth: readNumber(score.runtimeHealthScore),
    evidenceCompleteness: readNumber(score.evidenceCompletenessScore),
    freshness: readNumber(score.freshnessScore),
    costRisk: readNumber(score.costRiskScore),
    regressionRisk: readNumber(score.regressionRiskScore),
  } satisfies Record<typeof CHAT_REALTIME_SCORE_DIMENSIONS[number], number>;

  return Object.fromEntries(CHAT_REALTIME_SCORE_DIMENSIONS.map((dimension) => {
    const value = values[dimension];
    const impacted = ["runtimeHealth", "evidenceCompleteness", "costRisk", "regressionRisk"].includes(dimension);
    return [dimension, {
      before: value,
      after: value,
      target: 80,
      status: value >= 80 ? "target_met" : "below_target",
      reason: impacted
        ? "Chat realtime listener scope, cleanup, propagation telemetry, and debug evidence are source-ready; below-target score movement still depends on formal runtime/evidence/cost gates."
        : "Chat realtime cleanup does not negatively affect this dimension.",
      nextExactAction: value >= 80
        ? "No score action needed for this dimension."
        : "Attach formal runtime/debug/cost evidence through existing score lanes; do not treat missing future chat activity as a failure.",
    }];
  })) as ChatRealtimeCostControlReport["scoreImpactByDimension"];
}

function telemetryEventsInCatalog(catalogSource: string) {
  return CHAT_REALTIME_TELEMETRY_EVENTS
    .filter((event) => !catalogSource.includes(`eventName: "${event.eventName}"`))
    .map((event) => `${event.eventName} missing from telemetry catalog.`);
}

function oldLogicClassification(sourceValidation: ReturnType<typeof validateChatRealtimeSource>) {
  return [
    {
      reference: "ChatExperience Firestore thread listener",
      classification: sourceValidation.threadListenerBounded ? "still_required" : "unsafe_unknown",
      reason: "Viewer-scoped thread listener owns thread list and unread propagation.",
    },
    {
      reference: "ChatExperience Firestore selected-thread message listener",
      classification: sourceValidation.messageListenerSelectedThreadOnly && sourceValidation.messageListenerBounded ? "still_required" : "unsafe_unknown",
      reason: "Selected-thread-only listener owns realtime message reconciliation without all-message fan-out.",
    },
    {
      reference: "ChatExperience RTDB presence listener",
      classification: "still_required",
      reason: "Presence/typing uses RTDB onDisconnect cleanup for ephemeral state.",
    },
  ] satisfies ChatRealtimeCostControlReport["oldLogicClassification"];
}

export function buildChatRealtimeCostControlReport(input: {
  chatExperienceSource?: string;
  telemetryCatalogSource?: string;
  changedFiles?: string[];
  currentHead?: string;
  generatedAtUtc?: string;
} = {}): ChatRealtimeCostControlReport {
  const chatExperienceSource = input.chatExperienceSource
    ?? readFileSync(join(repoRoot, "src/components/Chat/ChatExperience.tsx"), "utf8");
  const telemetryCatalogSource = input.telemetryCatalogSource
    ?? readFileSync(join(repoRoot, "src/lib/telemetry-catalog.ts"), "utf8");
  const sourceValidation = validateChatRealtimeSource(chatExperienceSource);
  const score = readJson("agent/state/public-beta-score.generated.json");
  const debugLane = buildChatRealtimeDebugLane();
  const dirtyFiles = (input.changedFiles ?? listDirtyFiles()).map((path) => ({
    path,
    classification: classifyChatRealtimeDirtyFile(path),
  }));
  const telemetryFailures = [
    ...validateChatRealtimeTelemetryContract(),
    ...telemetryEventsInCatalog(telemetryCatalogSource),
  ];

  return {
    reportKey: "chat-realtime-cost-control",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead ?? git(["rev-parse", "HEAD"]),
    productionReadsRequired: false,
    liveDataMutationAllowed: false,
    deployRequired: false,
    formalGateImpact: {
      clearsFormalProvider: false,
      clearsDeployedRuntime: false,
      clearsFormalAdminTruth: false,
    },
    listenerScope: {
      threadListScope: CHAT_REALTIME_CONTRACT.threadListListener.scope,
      selectedThreadMessageScope: CHAT_REALTIME_CONTRACT.selectedThreadMessageListener.scope,
      maxOpenFirestoreListenersPerMountedChat: CHAT_REALTIME_CONTRACT.costControls.maxOpenFirestoreListenersPerMountedChat,
      noBroadAllMessageListener: CHAT_REALTIME_CONTRACT.costControls.noBroadAllMessageListener,
    },
    sourceValidation,
    telemetryEvents: CHAT_REALTIME_TELEMETRY_EVENTS,
    telemetryFailures,
    debugLane: {
      ...debugLane,
      label: "Chat realtime",
      listenerLimits: {
        threadList: debugLane.threadListLimit,
        selectedThreadMessages: debugLane.messageListenerLimit,
      },
    },
    scoreImpactByDimension: scoreImpactByDimension(score),
    dirtyFiles,
    oldLogicClassification: oldLogicClassification(sourceValidation),
    validationFailures: [],
  };
}

export function validateChatRealtimeCostControlReport(report: ChatRealtimeCostControlReport) {
  const failures = [
    ...report.sourceValidation.failures,
    ...report.telemetryFailures,
  ];

  if (!report.listenerScope.noBroadAllMessageListener) failures.push("message listener is broad/unbounded.");
  if (!report.debugLane.detachVerified) failures.push("listener cleanup missing.");
  if (!report.debugLane.propagationStates.length) failures.push("realtime propagation states missing.");
  if (report.telemetryEvents.length !== 11) failures.push("chat realtime telemetry missing.");
  if (Object.keys(report.scoreImpactByDimension).length !== CHAT_REALTIME_SCORE_DIMENSIONS.length) {
    failures.push("score dimension impact missing.");
  }
  if (report.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) failures.push("dirty files are unclassified.");
  if (report.dirtyFiles.some((entry) => /(?:payment|paypal|wallet|gumdrop|gumdrops|topnav|bottomnav|nav)/iu.test(entry.path))) {
    failures.push("chat UI redesign or forbidden surface file changed.");
  }

  return [...new Set(failures)];
}

function writeReport(report: ChatRealtimeCostControlReport) {
  const fullPath = join(repoRoot, STATE_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(report, null, 2)}\n`);
}

function writeDoc(report: ChatRealtimeCostControlReport) {
  const scoreRows = CHAT_REALTIME_SCORE_DIMENSIONS.map((dimension) => {
    const score = report.scoreImpactByDimension[dimension];
    return `| ${dimension} | ${score.before} | ${score.after} | ${score.status} | ${score.nextExactAction} |`;
  }).join("\n");
  const doc = `# Chat Realtime Cost Control\n\nGenerated: ${report.generatedAtUtc}\n\n## Listener Scope\n\n- Thread list listener: ${report.listenerScope.threadListScope}, limit ${report.debugLane.listenerLimits.threadList}\n- Message listener: ${report.listenerScope.selectedThreadMessageScope}, limit ${report.debugLane.listenerLimits.selectedThreadMessages}\n- Broad all-message listener: forbidden\n- Detach on unmount/thread switch: ${report.debugLane.detachVerified ? "verified" : "missing"}\n\n## Propagation States\n\n${report.debugLane.propagationStates.map((state) => `- ${state}`).join("\n")}\n\n## Telemetry\n\n${report.telemetryEvents.map((event) => `- ${event.eventName}: ${event.debugLane}, ${event.materializerLane}`).join("\n")}\n\n## Score Impact\n\n| Dimension | Before | After | Status | Next action |\n| --- | ---: | ---: | --- | --- |\n${scoreRows}\n\n## Old Logic Classification\n\n${report.oldLogicClassification.map((entry) => `- ${entry.reference}: ${entry.classification} - ${entry.reason}`).join("\n")}\n`;
  const fullPath = join(repoRoot, DOC_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, doc);
}

function main() {
  const report = buildChatRealtimeCostControlReport();
  report.validationFailures = validateChatRealtimeCostControlReport(report);
  writeReport(report);
  writeDoc(report);
  if (report.validationFailures.length > 0) {
    console.error("Chat realtime cost control validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Chat realtime cost control passed: threadLimit=${report.debugLane.listenerLimits.threadList}, messageLimit=${report.debugLane.listenerLimits.selectedThreadMessages}, telemetryEvents=${report.telemetryEvents.length}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
