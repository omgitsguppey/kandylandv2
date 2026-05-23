import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import {
  CHAT_GATING_MODERATION_TELEMETRY_EVENTS,
  buildChatGatingDebugLane,
  validateChatGatingSource,
  type ChatGatingSourceValidation,
} from "@/lib/chat/chat-gating-contract";

export const CHAT_GATING_SCORE_DIMENSIONS = [
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

export type ChatGatingModerationReport = {
  reportKey: "chat-gating-moderation";
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
  gatingContract: {
    textPriceGd: 1;
    imagePriceGd: 5;
    videoPriceGd: 10;
    paidGdOnly: true;
    rewardFreeGdDisallowed: true;
    fanPassSubscriberBypass: true;
    creatorReplyBypass: true;
    clientPriceTrusted: false;
    clientBalanceTrusted: false;
  };
  sourceValidation: ChatGatingSourceValidation;
  telemetryEvents: typeof CHAT_GATING_MODERATION_TELEMETRY_EVENTS;
  debugLane: ReturnType<typeof buildChatGatingDebugLane>;
  scoreImpactByDimension: Record<typeof CHAT_GATING_SCORE_DIMENSIONS[number], {
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
const STATE_PATH = "agent/state/chat-gating-moderation.generated.json";
const DOC_PATH = "docs/agent-truth/chat-gating-moderation.md";

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

export function classifyChatGatingDirtyFile(path: string): DirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === STATE_PATH || normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-chat-gating-moderation.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/chat-gating-moderation.spec.ts") return "test_artifact_expected";
  if (
    normalized === "src/lib/chat/chat-gating-contract.ts"
    || normalized === "src/lib/server/chat.ts"
    || normalized === "src/app/api/chat/threads/[threadId]/messages/route.ts"
    || normalized === "src/components/Chat/ChatExperience.tsx"
    || normalized === "src/lib/debug/debug-panel-tracking-summary.ts"
    || normalized === "src/app/api/admin/debug/route.ts"
    || normalized === "src/lib/server/admin-debug/summary.ts"
    || normalized === "src/lib/telemetry-catalog.ts"
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

function scoreImpactByDimension(): ChatGatingModerationReport["scoreImpactByDimension"] {
  const score = readJson("agent/state/public-beta-score.generated.json");
  const values = {
    sourceHealth: readNumber(score.sourceHealthScore),
    runtimeHealth: readNumber(score.runtimeHealthScore),
    evidenceCompleteness: readNumber(score.evidenceCompletenessScore),
    freshness: readNumber(score.freshnessScore),
    costRisk: readNumber(score.costRiskScore),
    regressionRisk: readNumber(score.regressionRiskScore),
  } satisfies Record<typeof CHAT_GATING_SCORE_DIMENSIONS[number], number>;

  return Object.fromEntries(CHAT_GATING_SCORE_DIMENSIONS.map((dimension) => {
    const value = values[dimension];
    const impacted = ["sourceHealth", "runtimeHealth", "evidenceCompleteness", "regressionRisk"].includes(dimension);
    return [dimension, {
      before: value,
      after: value,
      target: 80,
      status: value >= 80 ? "target_met" : "below_target",
      reason: impacted
        ? "Chat paid-GD gating, media blocking, bypass telemetry, and moderation status are source-ready; below-target movement still depends on existing formal/runtime evidence gates."
        : "Chat gating hardening does not negatively affect this dimension.",
      nextExactAction: value >= 80
        ? "No score action needed for this dimension."
        : "Attach formal runtime/admin/cost evidence through existing score lanes; do not change GumDrop math or payment runtime.",
    }];
  })) as ChatGatingModerationReport["scoreImpactByDimension"];
}

function telemetryMissing(catalogSource: string) {
  return CHAT_GATING_MODERATION_TELEMETRY_EVENTS
    .filter((event) => !catalogSource.includes(`eventName: "${event.eventName}"`))
    .map((event) => `${event.eventName} missing from telemetry catalog.`);
}

function validateSource(input: {
  chatServerSource: string;
  chatRouteSource: string;
  attachmentPrepareSource: string;
  attachmentCompleteSource: string;
  chatExperienceSource: string;
  telemetryCatalogSource: string;
}): ChatGatingSourceValidation {
  const server = input.chatServerSource;
  const route = input.chatRouteSource;
  const attachments = `${input.attachmentPrepareSource}\n${input.attachmentCompleteSource}`;
  const telemetry = input.telemetryCatalogSource;
  const backendEnforcesPaidOnly = server.includes('spendCreatorExperienceGumdrops(participantBalance, costGd, "message")')
    && server.includes("purchasedAmountSpent: spend.purchasedSpent")
    && server.includes("rewardAmountSpent: spend.rewardSpent");
  const rejectsRewardFreeGd = backendEnforcesPaidOnly
    && server.includes("purchasedBalanceGd: participantBalance.purchased")
    && !/rewardAmountSpent:\s*[1-9]/u.test(server);
  const doesNotTrustClientPriceOrBalance = !/(priceGd|clientPrice|balanceGd|clientBalance|purchasedBalanceGd)\s*[:=]/u.test(route)
    && server.includes("const costGd = viewerRole === \"creator\"");
  const idempotencyKeyRequired = /idempotencyKey:\s*z\.string\(\)\.trim\(\)\.min\(1\)\.max\(180\)(?!\.optional\(\))/u.test(route)
    && server.includes("buildCreatorExperienceIdempotencyKey");
  const blockedSendTelemetry = server.includes('trackServerEvent("chat_send_blocked"')
    && input.chatExperienceSource.includes('trackEvent("chat_insufficient_paid_gd_viewed"')
    && input.chatExperienceSource.includes('trackEvent("chat_media_upload_blocked"');
  const humanSafeBlockedErrors = server.includes("buildChatErrorBody")
    && server.includes("buildInsufficientFundsPayload")
    && route.includes("toChatClientError(error)");
  const mediaLimitsEnforcedServerSide = attachments.includes("resolveServerChatMediaLimitPolicy")
    && attachments.includes("CHAT_MEDIA_LIMIT_BYTES_FAN_PASS")
    && attachments.includes("isSupportedChatAttachmentMimeType");
  const moderationStatusDebugVisible = telemetry.includes('eventName: "chat_moderation_blocked"')
    && server.includes("moderationRemovedAt")
    && server.includes("moderationRemovedBy");
  const gumdropMathUntouched = backendEnforcesPaidOnly
    && !/spendSourceAwareGumdrops\([^)]*purchasedOnly:\s*false/u.test(server);

  const validation: ChatGatingSourceValidation = {
    backendEnforcesPaidOnly,
    rejectsRewardFreeGd,
    doesNotTrustClientPriceOrBalance,
    idempotencyKeyRequired,
    blockedSendTelemetry,
    humanSafeBlockedErrors,
    mediaLimitsEnforcedServerSide,
    moderationStatusDebugVisible,
    gumdropMathUntouched,
    failures: [],
  };
  validation.failures = validateChatGatingSource(validation);
  return validation;
}

function oldLogicClassification(sourceValidation: ChatGatingSourceValidation) {
  return [
    {
      reference: "ChatExperience paid-GD guidance card",
      classification: "still_required",
      reason: "UI guidance remains user-facing only; backend spend is still authoritative.",
    },
    {
      reference: "Server chat purchased-only spend",
      classification: sourceValidation.backendEnforcesPaidOnly ? "still_required" : "unsafe_unknown",
      reason: "Chat send route enforces creator message spend through purchased-only creator experience policy.",
    },
    {
      reference: "Legacy reward/free GD fallback for paid chat",
      classification: sourceValidation.rejectsRewardFreeGd ? "removed" : "unsafe_unknown",
      reason: "Paid chat validation rejects reward/free balance for creator message spend.",
    },
    {
      reference: "Client-computed chat price/balance",
      classification: sourceValidation.doesNotTrustClientPriceOrBalance ? "removed" : "unsafe_unknown",
      reason: "Send route accepts message fields only; server computes price and reads balance from canonical user records.",
    },
  ] satisfies ChatGatingModerationReport["oldLogicClassification"];
}

export function buildChatGatingModerationReport(input: {
  chatServerSource?: string;
  chatRouteSource?: string;
  attachmentPrepareSource?: string;
  attachmentCompleteSource?: string;
  chatExperienceSource?: string;
  telemetryCatalogSource?: string;
  changedFiles?: string[];
  currentHead?: string;
  generatedAtUtc?: string;
} = {}): ChatGatingModerationReport {
  const sources = {
    chatServerSource: input.chatServerSource ?? readRequired("src/lib/server/chat.ts"),
    chatRouteSource: input.chatRouteSource ?? readRequired("src/app/api/chat/threads/[threadId]/messages/route.ts"),
    attachmentPrepareSource: input.attachmentPrepareSource ?? readRequired("src/app/api/chat/attachments/prepare/route.ts"),
    attachmentCompleteSource: input.attachmentCompleteSource ?? readRequired("src/app/api/chat/attachments/complete/route.ts"),
    chatExperienceSource: input.chatExperienceSource ?? readRequired("src/components/Chat/ChatExperience.tsx"),
    telemetryCatalogSource: input.telemetryCatalogSource ?? readRequired("src/lib/telemetry-catalog.ts"),
  };
  const sourceValidation = validateSource(sources);
  const dirtyFiles = (input.changedFiles ?? listDirtyFiles()).map((path) => ({
    path,
    classification: classifyChatGatingDirtyFile(path),
  }));

  return {
    reportKey: "chat-gating-moderation",
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
    gatingContract: {
      textPriceGd: 1,
      imagePriceGd: 5,
      videoPriceGd: 10,
      paidGdOnly: true,
      rewardFreeGdDisallowed: true,
      fanPassSubscriberBypass: true,
      creatorReplyBypass: true,
      clientPriceTrusted: false,
      clientBalanceTrusted: false,
    },
    sourceValidation,
    telemetryEvents: CHAT_GATING_MODERATION_TELEMETRY_EVENTS,
    debugLane: buildChatGatingDebugLane(),
    scoreImpactByDimension: scoreImpactByDimension(),
    dirtyFiles,
    oldLogicClassification: oldLogicClassification(sourceValidation),
    validationFailures: [],
  };
}

export function validateChatGatingModerationReport(report: ChatGatingModerationReport) {
  const failures = [
    ...validateChatGatingSource(report.sourceValidation),
    ...telemetryMissing(readRequired("src/lib/telemetry-catalog.ts")),
  ];
  if (!report.debugLane.backendEnforcement || report.debugLane.uiOnlyGate) failures.push("UI-only gate without backend enforcement.");
  if (!report.debugLane.moderationStatusVisible) failures.push("moderation status not debug-visible.");
  if (report.telemetryEvents.length !== 8) failures.push("blocked send lacks telemetry.");
  if (Object.keys(report.scoreImpactByDimension).length !== CHAT_GATING_SCORE_DIMENSIONS.length) failures.push("score dimension impact missing.");
  if (report.dirtyFiles.some((entry) => entry.classification === "unsafe_unknown")) failures.push("dirty files are unclassified.");
  if (report.dirtyFiles.some((entry) => /src\/lib\/gumdrop|src\/lib\/gumdrops|src\/app\/api\/paypal|src\/components\/PurchaseModal|src\/components\/Wallet/iu.test(entry.path))) {
    failures.push("GumDrop math/source-of-funds changed.");
  }
  return [...new Set(failures)];
}

function writeReport(report: ChatGatingModerationReport) {
  const fullPath = join(repoRoot, STATE_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(report, null, 2)}\n`);
}

function writeDoc(report: ChatGatingModerationReport) {
  const scoreRows = CHAT_GATING_SCORE_DIMENSIONS.map((dimension) => {
    const score = report.scoreImpactByDimension[dimension];
    return `| ${dimension} | ${score.before} | ${score.after} | ${score.status} | ${score.nextExactAction} |`;
  }).join("\n");
  const doc = `# Chat Gating Moderation\n\nGenerated: ${report.generatedAtUtc}\n\n## Enforcement\n\n- Text price: ${report.gatingContract.textPriceGd} paid GD\n- Image price: ${report.gatingContract.imagePriceGd} paid GD\n- Video price: ${report.gatingContract.videoPriceGd} paid GD\n- Paid GD only: ${report.gatingContract.paidGdOnly}\n- Reward/free GD accepted for paid chat: false\n- Fan Pass/subscriber bypass: ${report.gatingContract.fanPassSubscriberBypass}\n- Creator reply bypass: ${report.gatingContract.creatorReplyBypass}\n- Client price trusted: false\n- Client balance trusted: false\n\n## Debug Lane\n\n- Lane: ${report.debugLane.label}\n- Backend enforcement: ${report.debugLane.backendEnforcement}\n- Blocked attempts: ${report.debugLane.blockedAttempts}\n- Insufficient paid GD attempts: ${report.debugLane.insufficientPaidGdAttempts}\n- Moderation blocks: ${report.debugLane.moderationBlocks}\n- Media limit blocks: ${report.debugLane.mediaLimitBlocks}\n- Source-of-funds truth: ${report.debugLane.sourceOfFundsTruthStatus}\n\n## Telemetry\n\n${report.telemetryEvents.map((event) => `- ${event.eventName}: ${event.debugLane}, ${event.materializerLane}`).join("\n")}\n\n## Score Impact\n\n| Dimension | Before | After | Status | Next action |\n| --- | ---: | ---: | --- | --- |\n${scoreRows}\n\n## Old Logic Classification\n\n${report.oldLogicClassification.map((entry) => `- ${entry.reference}: ${entry.classification} - ${entry.reason}`).join("\n")}\n`;
  const fullPath = join(repoRoot, DOC_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, doc);
}

function main() {
  const report = buildChatGatingModerationReport();
  report.validationFailures = validateChatGatingModerationReport(report);
  writeReport(report);
  writeDoc(report);
  if (report.validationFailures.length > 0) {
    console.error("Chat gating moderation validation failed:");
    for (const failure of report.validationFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Chat gating moderation passed: paidGdOnly=${report.gatingContract.paidGdOnly}, telemetryEvents=${report.telemetryEvents.length}, debugLane=${report.debugLane.label}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
