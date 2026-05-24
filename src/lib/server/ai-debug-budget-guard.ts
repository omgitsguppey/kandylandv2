import "server-only";

import { AI_DEBUG_ASSISTANT_MODEL, AI_DEBUG_FIX_PLANNER_MODEL } from "@/lib/ai-debug-assistant";

const AI_DEBUG_ASSISTANT_DISABLED = process.env.AI_DEBUG_ASSISTANT_KILL_SWITCH === "1";
const AI_DEBUG_PROMPT_CHAR_CAP = 36_000;
const AI_DEBUG_MAX_ESTIMATED_INPUT_TOKENS = 9_000;
const AI_DEBUG_MAX_OUTPUT_TOKENS = 700;
const AI_DEBUG_TIMEOUT_CAP_MS = 8_000;
const AI_DEBUG_MODEL_ALLOWLIST = [
  AI_DEBUG_ASSISTANT_MODEL,
  AI_DEBUG_FIX_PLANNER_MODEL,
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

export const AI_DEBUG_BUDGET_GUARD_EVIDENCE = {
  killSwitch: true,
  killSwitchEnv: "AI_DEBUG_ASSISTANT_KILL_SWITCH",
  modelAllowlist: true,
  allowedModels: AI_DEBUG_MODEL_ALLOWLIST,
  timeoutCapMs: AI_DEBUG_TIMEOUT_CAP_MS,
  promptCharCap: AI_DEBUG_PROMPT_CHAR_CAP,
  estimatedInputTokenCap: AI_DEBUG_MAX_ESTIMATED_INPUT_TOKENS,
  outputTokenCap: AI_DEBUG_MAX_OUTPUT_TOKENS,
  requestFrequencyPolicy: "admin_debug_assistant_rate_limited_route",
  budgetClass: "ai_paid_admin_debug",
  providerCallsInValidators: false,
  fallbackWithoutProviderCall: true,
} as const;

export type AiDebugBudgetDecision = ReturnType<typeof buildAiDebugBudgetDecision>;

export function estimateAiDebugInputTokens(prompt: string) {
  const normalized = prompt.trim();
  if (!normalized) return 0;
  // token estimate: deterministic local estimate avoids paid provider countTokens calls in validators.
  return Math.max(1, Math.ceil(normalized.length / 4));
}

export function buildAiDebugBudgetDecision(input: {
  enabled: boolean;
  model: string;
  prompt: string;
  project?: string | null;
  timeoutMs?: number;
}) {
  const estimatedInputTokens = estimateAiDebugInputTokens(input.prompt);
  const timeoutMs = Math.min(input.timeoutMs ?? AI_DEBUG_TIMEOUT_CAP_MS, AI_DEBUG_TIMEOUT_CAP_MS);
  const allowedModel = AI_DEBUG_MODEL_ALLOWLIST.includes(input.model as (typeof AI_DEBUG_MODEL_ALLOWLIST)[number]);
  const debugEvidence = {
    ...AI_DEBUG_BUDGET_GUARD_EVIDENCE,
    model: input.model,
    allowedModel,
    estimatedInputTokens,
    maxEstimatedInputTokens: AI_DEBUG_MAX_ESTIMATED_INPUT_TOKENS,
    maxOutputTokens: AI_DEBUG_MAX_OUTPUT_TOKENS,
    timeoutMs,
    promptCharLength: input.prompt.length,
    projectConfigured: Boolean(input.project?.trim()),
  };

  if (AI_DEBUG_ASSISTANT_DISABLED || !input.enabled) {
    return {
      providerCallAllowed: false,
      fallbackReason: "assistant_disabled" as const,
      costGuardState: "disabled" as const,
      debugEvidence,
    };
  }
  if (!input.project?.trim()) {
    return {
      providerCallAllowed: false,
      fallbackReason: "missing_vertex_project" as const,
      costGuardState: "blocked" as const,
      debugEvidence,
    };
  }
  if (!allowedModel) {
    return {
      providerCallAllowed: false,
      fallbackReason: "model_not_allowlisted" as const,
      costGuardState: "blocked" as const,
      debugEvidence,
    };
  }
  if (input.prompt.length > AI_DEBUG_PROMPT_CHAR_CAP || estimatedInputTokens > AI_DEBUG_MAX_ESTIMATED_INPUT_TOKENS) {
    return {
      providerCallAllowed: false,
      fallbackReason: "prompt_budget_exceeded" as const,
      costGuardState: "blocked" as const,
      debugEvidence,
    };
  }

  return {
    providerCallAllowed: true,
    fallbackReason: null,
    costGuardState: "admin_gated" as const,
    debugEvidence,
  };
}

export function getAiDebugBudgetLimits() {
  return {
    maxPromptChars: AI_DEBUG_PROMPT_CHAR_CAP,
    maxEstimatedInputTokens: AI_DEBUG_MAX_ESTIMATED_INPUT_TOKENS,
    maxOutputTokens: AI_DEBUG_MAX_OUTPUT_TOKENS,
    timeoutCapMs: AI_DEBUG_TIMEOUT_CAP_MS,
  };
}
