import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import {
  CHAT_PRESENCE_CONTRACT,
  CHAT_PRESENCE_TELEMETRY_EVENTS,
  buildChatPresenceDebugLane,
  validateChatPresenceSource,
} from "@/lib/chat/chat-presence-contract";

export const CHAT_PRESENCE_SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
] as const satisfies readonly PublicBetaHealthDimension[];

type DirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "unrelated_agent_context_file_to_ignore"
  | "release_artifact_expected"
  | "real_source_change_needs_review"
  | "test_artifact_expected"
  | "validator_artifact_expected"
  | "documentation_artifact_expected"
  | "unsafe_unknown";

export type ChatPresenceTypingReport = {
  reportKey: "chat-presence-typing";
  generatedAtUtc: string;
  currentHead: string;
  productionReadsRequired: false;
  liveDataMutationAllowed: false;
  deployRequired: false;
  sourceValidation: ReturnType<typeof validateChatPresenceSource>;
  contract: typeof CHAT_PRESENCE_CONTRACT;
  telemetryEvents: typeof CHAT_PRESENCE_TELEMETRY_EVENTS;
  debugLane: ReturnType<typeof buildChatPresenceDebugLane> & {
    label: "Chat presence/typing";
  };
  scoreImpactByDimension: Record<typeof CHAT_PRESENCE_SCORE_DIMENSIONS[number], {
    before: number;
    after: number;
    target: 80;
    status: "target_met" | "below_target";
    reason: string;
    nextExactAction: string;
  }>;
  dirtyFiles: Array<{ path: string; classification: DirtyClassification }>;
  oldLogicClassification: Array<{
    reference: string;
    classification: "removed" | "superseded" | "still_required" | "unsafe_unknown";
    reason: string;
  }>;
  validationFailures: string[];
};

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATE_PATH = "agent/state/chat-presence-typing.generated.json";
const DOC_PATH = "docs/agent-truth/chat-presence-typing.md";

function git(args: string[]) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function listDirtyFiles() {
  const changed = git(["diff", "--name-only"]).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  return [...new Set([...changed, ...untracked])].sort();
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

export function classifyChatPresenceTypingDirtyFile(path: string): DirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (
    normalized === STATE_PATH
    || normalized === "agent/state/public-beta-score.generated.json"
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
  if (normalized === "scripts/agent/validate-chat-presence-typing.ts") return "validator_artifact_expected";
  if (
    normalized === "scripts/agent/validate-chat-functionality-score-lock.ts"
    || normalized === "scripts/agent/validate-chat-gating-moderation.ts"
    || normalized === "scripts/agent/validate-chat-realtime-cost-control.ts"
    || normalized === "scripts/agent/validate-chat-telemetry-admin-truth.ts"
    || normalized === "scripts/agent/validate-event-translation-bridge.ts"
    || normalized === "scripts/agent/validate-feature-registration-gate.ts"
    || normalized === "scripts/agent/validate-debug-tracking-simplification.ts"
  ) return "validator_artifact_expected";
  if (normalized === "tests/unit/chat-presence-typing.spec.ts") return "test_artifact_expected";
  if (
    normalized === "tests/unit/chat-functionality-score-lock.spec.ts"
    || normalized === "tests/unit/chat-telemetry-admin-truth.spec.ts"
    || normalized === "tests/unit/user-management-refactor.spec.ts"
  ) return "test_artifact_expected";
  if (
    normalized === "src/lib/chat/chat-presence-contract.ts"
    || normalized === "src/lib/chat/chat-typing-controller.ts"
    || normalized === "src/lib/chat/chat-telemetry-contract.ts"
    || normalized === "src/components/Chat/ChatExperience.tsx"
    || normalized === "src/lib/telemetry-catalog.ts"
    || normalized === "src/app/api/admin/debug/route.ts"
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
  return "unsafe_unknown";
}

function scoreImpactByDimension(): ChatPresenceTypingReport["scoreImpactByDimension"] {
  const score = readJson("agent/state/public-beta-score.generated.json");
  const values = {
    sourceHealth: readNumber(score.sourceHealthScore),
    runtimeHealth: readNumber(score.runtimeHealthScore),
    evidenceCompleteness: readNumber(score.evidenceCompletenessScore),
    freshness: readNumber(score.freshnessScore),
    costRisk: readNumber(score.costRiskScore),
    regressionRisk: readNumber(score.regressionRiskScore),
  } satisfies Record<typeof CHAT_PRESENCE_SCORE_DIMENSIONS[number], number>;

  return Object.fromEntries(CHAT_PRESENCE_SCORE_DIMENSIONS.map((dimension) => {
    const value = values[dimension];
    const impacted = ["runtimeHealth", "evidenceCompleteness", "costRisk"].includes(dimension);
    return [dimension, {
      before: value,
      after: value,
      target: 80,
      status: value >= 80 ? "target_met" : "below_target",
      reason: impacted
        ? "Chat typing and presence are bounded, ephemeral, self-cleaning, and debug-visible; below-target movement still depends on formal runtime/evidence/cost gates."
        : "Chat presence hardening does not negatively affect this dimension.",
      nextExactAction: value >= 80
        ? "No score action needed for this dimension."
        : "Attach formal runtime/debug/cost evidence through existing score lanes; do not treat absence of live typing as a failure.",
    }];
  })) as ChatPresenceTypingReport["scoreImpactByDimension"];
}

function oldLogicClassification(sourceValidation: ReturnType<typeof validateChatPresenceSource>) {
  return [
    {
      reference: "ChatExperience direct per-change typing write",
      classification: sourceValidation.noPerKeystrokeTypingWrites ? "superseded" : "unsafe_unknown",
      reason: "Typing writes now pass through the throttled controller before RTDB writes.",
    },
    {
      reference: "ChatExperience RTDB onDisconnect presence cleanup",
      classification: sourceValidation.onDisconnectAttached ? "still_required" : "unsafe_unknown",
      reason: "Presence stays ephemeral and self-cleaning through RTDB onDisconnect and unmount removal.",
    },
    {
      reference: "ChatExperience counterpart presence read",
      classification: "still_required",
      reason: "Counterpart presence remains a participant-scoped RTDB read and is normalized for stale typing expiry.",
    },
  ] satisfies ChatPresenceTypingReport["oldLogicClassification"];
}

export function buildChatPresenceTypingReport(input: {
  chatExperienceSource?: string;
  changedFiles?: string[];
  currentHead?: string;
  generatedAtUtc?: string;
} = {}): ChatPresenceTypingReport {
  const source = input.chatExperienceSource
    ?? readFileSync(join(repoRoot, "src/components/Chat/ChatExperience.tsx"), "utf8");
  const sourceValidation = validateChatPresenceSource(source);
  const dirtyFiles = (input.changedFiles ?? listDirtyFiles()).map((path) => ({
    path,
    classification: classifyChatPresenceTypingDirtyFile(path),
  }));

  return {
    reportKey: "chat-presence-typing",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead ?? git(["rev-parse", "HEAD"]),
    productionReadsRequired: false,
    liveDataMutationAllowed: false,
    deployRequired: false,
    sourceValidation,
    contract: CHAT_PRESENCE_CONTRACT,
    telemetryEvents: CHAT_PRESENCE_TELEMETRY_EVENTS,
    debugLane: {
      ...buildChatPresenceDebugLane(),
      label: "Chat presence/typing",
    },
    scoreImpactByDimension: scoreImpactByDimension(),
    dirtyFiles,
    oldLogicClassification: oldLogicClassification(sourceValidation),
    validationFailures: [],
  };
}

export function validateChatPresenceTypingReport(report: ChatPresenceTypingReport) {
  const failures = [...report.sourceValidation.failures];
  if (!report.debugLane.onDisconnectAttached) failures.push("onDisconnect missing.");
  if (!report.debugLane.writeThrottleActive) failures.push("write throttle inactive.");
  if (!report.debugLane.staleTypingCleanupActive) failures.push("stale typing cleanup inactive.");
  if (report.telemetryEvents.some((event) => event.perKeystrokeAllowed || !event.sampled)) {
    failures.push("telemetry can spam per keystroke.");
  }
  if (Object.keys(report.scoreImpactByDimension).length !== CHAT_PRESENCE_SCORE_DIMENSIONS.length) {
    failures.push("score dimension impact missing.");
  }
  if (report.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) failures.push("dirty files are unclassified.");
  if (report.dirtyFiles.some((entry) => /(?:payment|paypal|wallet|gumdrop|gumdrops|topnav|bottomnav|nav)/iu.test(entry.path))) {
    failures.push("chat UI broadly redesigned or forbidden surface changed.");
  }
  return [...new Set(failures)];
}

function writeReport(report: ChatPresenceTypingReport) {
  const fullPath = join(repoRoot, STATE_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(report, null, 2)}\n`);
}

function writeDoc(report: ChatPresenceTypingReport) {
  const scoreRows = CHAT_PRESENCE_SCORE_DIMENSIONS.map((dimension) => {
    const score = report.scoreImpactByDimension[dimension];
    return `| ${dimension} | ${score.before} | ${score.after} | ${score.status} | ${score.nextExactAction} |`;
  }).join("\n");
  const doc = `# Chat Presence Typing\n\nGenerated: ${report.generatedAtUtc}\n\n## Ephemeral State\n\n- Presence path: ${report.contract.storage.presencePathPattern}\n- Typing path: ${report.contract.storage.typingPathPattern}\n- Typing write throttle: ${report.contract.typing.writeThrottleMs}ms\n- Typing stop timeout: ${report.contract.typing.stopTimeoutMs}ms\n- Stale typing max age: ${report.contract.typing.maxStaleTypingMs}ms\n- Presence TTL: ${report.contract.presence.ttlMs}ms\n- onDisconnect cleanup: ${report.contract.cleanup.onDisconnectRemove ? "required" : "missing"}\n\n## Debug Lane\n\n- Lane: ${report.debugLane.label}\n- Write throttle active: ${report.debugLane.writeThrottleActive}\n- Stale typing cleanup active: ${report.debugLane.staleTypingCleanupActive}\n- Cost risk: ${report.debugLane.costRisk}\n\n## Telemetry\n\n${report.telemetryEvents.map((event) => `- ${event.eventName}: sampled=${event.sampled}, perKeystrokeAllowed=${event.perKeystrokeAllowed}, debugVisible=${event.debugVisible}`).join("\n")}\n\n## Score Impact\n\n| Dimension | Before | After | Status | Next action |\n| --- | ---: | ---: | --- | --- |\n${scoreRows}\n\n## Old Logic Classification\n\n${report.oldLogicClassification.map((entry) => `- ${entry.reference}: ${entry.classification} - ${entry.reason}`).join("\n")}\n`;
  const fullPath = join(repoRoot, DOC_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, doc);
}

function main() {
  const report = buildChatPresenceTypingReport();
  report.validationFailures = validateChatPresenceTypingReport(report);
  writeReport(report);
  writeDoc(report);
  if (report.validationFailures.length > 0) {
    console.error("Chat presence typing validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Chat presence typing passed: throttle=${report.contract.typing.writeThrottleMs}ms, timeout=${report.contract.typing.stopTimeoutMs}ms, telemetryEvents=${report.telemetryEvents.length}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
