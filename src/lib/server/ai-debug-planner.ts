import "server-only";

import { AI_DEBUG_FIX_PLANNER_MODEL } from "@/lib/ai-debug-assistant";
import { buildAiDebugBudgetDecision, estimateAiDebugInputTokens } from "@/lib/server/ai-debug-budget-guard";
import type {
  AiDebugContextPacket,
  AiDebugRepairProposal,
  AiDebugWorkItem,
} from "@/lib/debug/ai-debug-orchestration-contract";

type AiDebugPlannerSettings = {
  enabled: boolean;
  model: string;
};

type AiDebugPlannerRunner = (input: {
  prompt: string;
  model: string;
  project: string;
}) => Promise<Partial<AiDebugRepairProposal>>;

const RAW_BODY_KEYS = /body|message|content|password|token|payment|private/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu;

function toSnakeCase(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function redactFact(key: string, value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const redacted = text
    .replace(EMAIL_PATTERN, "[redacted-email]")
    .replace(/password\s+is\s+\S+/giu, "credential [redacted]")
    .replace(/\b(password|token|secret)\b/giu, "credential");
  if (RAW_BODY_KEYS.test(key)) {
    return `[redacted:${key}] ${redacted.slice(0, 120)}`;
  }
  return `${key}: ${redacted.slice(0, 240)}`;
}

export function buildAiDebugContextPacket(input: {
  workItem: AiDebugWorkItem;
  sourceFacts: Record<string, unknown>;
  fileRefs: string[];
  validatorRefs: string[];
  scoreDebugRefs?: string[];
  maxTokenBudget: number;
  modelRole: "admin_debug_assistant" | "admin_debug_fix_planner";
}): AiDebugContextPacket {
  const forbiddenPayloadFlags: string[] = [];
  const facts = Object.entries(input.sourceFacts);
  const redactedUserSupportTaskFacts = facts.map(([key, value]) => {
    if (/support|bug|task|body|message|content/i.test(key)) forbiddenPayloadFlags.push(`raw_${toSnakeCase(key)}_redacted`);
    if (/privateCreatorContent/i.test(key)) forbiddenPayloadFlags.push("private_creator_content_redacted");
    return redactFact(key, value);
  });
  const boundedSourceFacts = [
    `workItem=${input.workItem.workItemId}`,
    `source=${input.workItem.source}`,
    `severity=${input.workItem.severity}`,
    `nextAction=${input.workItem.nextAction}`,
  ];
  const promptLikeText = [...boundedSourceFacts, ...redactedUserSupportTaskFacts, ...input.fileRefs, ...input.validatorRefs].join("\n");
  const tokenEstimate = estimateAiDebugInputTokens(promptLikeText);
  const reasons: string[] = [];
  if (input.workItem.status === "blocked_missing_context") reasons.push("work item is missing deterministic context");
  if (tokenEstimate > input.maxTokenBudget) reasons.push("context packet exceeds token budget");

  return {
    packetId: `packet-${input.workItem.workItemId}`,
    workItemId: input.workItem.workItemId,
    boundedSourceFacts,
    redactedUserSupportTaskFacts,
    relevantFileRefs: input.fileRefs,
    validatorRefs: input.validatorRefs,
    scoreDebugRefs: input.scoreDebugRefs ?? [],
    forbiddenPayloadFlags: [...new Set(forbiddenPayloadFlags)],
    tokenEstimate,
    maxTokenBudget: input.maxTokenBudget,
    modelRole: input.modelRole,
    deterministicPreflight: {
      status: reasons.length > 0 ? "blocked" : "pass",
      reasons,
    },
  };
}

function buildFallbackProposal(input: { workItem: AiDebugWorkItem; contextPacket: AiDebugContextPacket; reason: string }): AiDebugRepairProposal {
  return {
    proposalId: `fallback-${input.workItem.workItemId}`,
    workItemId: input.workItem.workItemId,
    mode: "inspect_only",
    filesToInspect: input.contextPacket.relevantFileRefs,
    filesToChange: [],
    validatorsToRun: input.contextPacket.validatorRefs,
    rollbackPlan: "No source mutation is proposed by deterministic fallback.",
    humanApprovalRequired: true,
    autoApplyAllowed: false,
    riskScore: input.workItem.contaminationRisk === "high" ? 80 : 20,
    criticReviewRequired: false,
  };
}

function normalizeProposal(input: Partial<AiDebugRepairProposal>, workItem: AiDebugWorkItem, contextPacket: AiDebugContextPacket): AiDebugRepairProposal {
  const mode = input.mode ?? "inspect_only";
  return {
    proposalId: input.proposalId || `proposal-${workItem.workItemId}`,
    workItemId: workItem.workItemId,
    mode,
    filesToInspect: input.filesToInspect?.length ? input.filesToInspect : contextPacket.relevantFileRefs,
    filesToChange: input.filesToChange ?? [],
    validatorsToRun: input.validatorsToRun?.length ? input.validatorsToRun : contextPacket.validatorRefs,
    rollbackPlan: input.rollbackPlan || "Revert the bounded repair proposal changes.",
    humanApprovalRequired: true,
    autoApplyAllowed: false,
    riskScore: Math.max(0, Math.min(100, input.riskScore ?? 50)),
    criticReviewRequired: mode === "source_patch_candidate",
  };
}

export async function planAiDebugWorkItem(input: {
  workItem: AiDebugWorkItem;
  contextPacket: AiDebugContextPacket;
  settings: AiDebugPlannerSettings;
  project?: string | null;
  runner?: AiDebugPlannerRunner;
}) {
  const model = input.settings.model || AI_DEBUG_FIX_PLANNER_MODEL;
  const prompt = JSON.stringify(input.contextPacket);
  const budgetDecision = buildAiDebugBudgetDecision({
    enabled: input.settings.enabled,
    model,
    prompt,
    project: input.project,
  });

  if (input.contextPacket.deterministicPreflight.status !== "pass" || !budgetDecision.providerCallAllowed || !input.runner) {
    return {
      status: "deterministic_fallback" as const,
      providerCallAttempted: false,
      budgetDecision,
      proposal: buildFallbackProposal({
        workItem: input.workItem,
        contextPacket: input.contextPacket,
        reason: budgetDecision.fallbackReason ?? "deterministic_preflight_blocked",
      }),
    };
  }

  const plan = await input.runner({
    prompt,
    model,
    project: input.project || "",
  });

  return {
    status: "ai_plan_ready" as const,
    providerCallAttempted: true,
    budgetDecision,
    proposal: normalizeProposal(plan, input.workItem, input.contextPacket),
  };
}
