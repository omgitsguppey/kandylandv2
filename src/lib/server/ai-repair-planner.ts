import "server-only";

import { GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL } from "@/lib/admin-ai-models";
import { buildAiRepairContextPacket } from "@/lib/debug/ai-repair-context-packet";
import { createAiRepairProposalRecord } from "@/lib/debug/ai-repair-proposal-store";
import { buildDeterministicRepairPlan, chooseValidators } from "@/lib/debug/ai-repair-triage-engine";
import type { AiRepairContextPacket, AiRepairProposal, AiRepairWorkItem } from "@/lib/debug/ai-repair-workbench-contract";

type PlannerRunner = (input: {
  model: string;
  prompt: string;
  maxOutputTokens: number;
}) => Promise<string>;

function parsePlannerJson(value: string): Partial<AiRepairProposal> & {
  summary?: string;
  filesToChange?: string[];
  validatorsToRun?: string[];
  rollbackPlan?: string;
  proposedMode?: AiRepairProposal["mode"];
  unknowns?: unknown[];
} {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export async function planAiRepair(input: {
  workItem: AiRepairWorkItem;
  explicitLiveGenerationRequested: boolean;
  aiEnabled?: boolean;
  model?: string;
  maxInputTokens?: number;
  settings?: { enabled: boolean; model: string };
  contextPacket?: AiRepairContextPacket;
  maxOutputTokens?: number;
  runner?: PlannerRunner;
  project: string;
}) {
  const aiEnabled = input.aiEnabled ?? input.settings?.enabled ?? false;
  const model = input.model ?? input.settings?.model ?? GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL;
  const packet = input.contextPacket ?? buildAiRepairContextPacket({
    workItemId: input.workItem.workItemId,
    boundedEvidence: input.workItem.sourceEvidence,
    validatorRefs: input.workItem.validators,
    routeRefs: input.workItem.filesToInspect.filter((file) => file.startsWith("route:")),
    maxInputTokens: input.maxInputTokens ?? 9000,
    modelRole: "admin_debug_fix_planner",
    selectedMode: input.workItem.selectedMode,
  });

  const deterministicProposal = buildDeterministicRepairPlan(input.workItem);
  if (
    !input.explicitLiveGenerationRequested
    || !aiEnabled
    || model !== GEMINI_3_1_FLASH_LITE_PREVIEW_MODEL
    || packet.costDecision !== "within_budget"
    || packet.privacyDecision === "blocked_for_manual_review"
    || !input.runner
  ) {
    return {
      status: "deterministic_plan_ready" as const,
      model,
      providerCalled: false,
      contextPacket: packet,
      proposal: deterministicProposal,
      unknowns: packet.missingContextReasons,
    };
  }

  try {
    const response = await input.runner({
      model,
      prompt: JSON.stringify({
        project: input.project,
        workItem: input.workItem,
        contextPacket: packet,
      }),
      maxOutputTokens: input.maxOutputTokens ?? 1200,
    });
    const parsed = parsePlannerJson(response);
    const proposal = createAiRepairProposalRecord({
      workItemId: input.workItem.workItemId,
      mode: parsed.proposedMode ?? parsed.mode ?? input.workItem.selectedMode,
      filesToChange: parsed.filesToChange ?? input.workItem.filesPotentiallyTouched,
      validators: parsed.validatorsToRun ?? chooseValidators(input.workItem),
      patchSummary: parsed.summary ?? input.workItem.nextAction,
      rollbackPlan: parsed.rollbackPlan ?? input.workItem.rollbackPlan,
      createdBy: "live_ai_planner",
      source: "live_ai",
    });
    const reviewedProposal: AiRepairProposal = {
      ...proposal,
      status: "critic_required",
      autoApplyAllowed: false,
    };
    return {
      status: "ai_plan_ready" as const,
      model,
      providerCalled: true,
      contextPacket: packet,
      proposal: reviewedProposal,
      unknowns: Array.isArray(parsed.unknowns) ? parsed.unknowns : [],
    };
  } catch (error) {
    return {
      status: "provider_failed" as const,
      model,
      providerCalled: true,
      contextPacket: packet,
      proposal: deterministicProposal,
      unknowns: [error instanceof Error ? error.message : "planner_failed"],
    };
  }
}
