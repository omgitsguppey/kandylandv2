import { describe, expect, it } from "vitest";

import {
  AI_DEBUG_BUDGET_GUARD_EVIDENCE,
  buildAiDebugBudgetDecision,
  estimateAiDebugInputTokens,
} from "@/lib/server/ai-debug-budget-guard";

describe("AI debug budget guard", () => {
  it("estimates input tokens and exposes source-visible caps", () => {
    expect(estimateAiDebugInputTokens("abcd ".repeat(200))).toBeGreaterThan(0);
    expect(AI_DEBUG_BUDGET_GUARD_EVIDENCE).toMatchObject({
      killSwitch: true,
      modelAllowlist: true,
      timeoutCapMs: expect.any(Number),
      promptCharCap: expect.any(Number),
      estimatedInputTokenCap: expect.any(Number),
      outputTokenCap: expect.any(Number),
      providerCallsInValidators: false,
    });
  });

  it("blocks provider calls when disabled or over budget", () => {
    const disabled = buildAiDebugBudgetDecision({
      enabled: false,
      model: "gemini-3.1-flash-lite-preview",
      prompt: "small prompt",
      project: "kandydrops-by-ikandy",
    });
    const overBudget = buildAiDebugBudgetDecision({
      enabled: true,
      model: "gemini-3.1-flash-lite-preview",
      prompt: "x".repeat(AI_DEBUG_BUDGET_GUARD_EVIDENCE.promptCharCap + 1),
      project: "kandydrops-by-ikandy",
    });

    expect(disabled.providerCallAllowed).toBe(false);
    expect(disabled.fallbackReason).toBe("assistant_disabled");
    expect(overBudget.providerCallAllowed).toBe(false);
    expect(overBudget.fallbackReason).toBe("prompt_budget_exceeded");
  });

  it("allows only allowlisted models within budget", () => {
    const allowed = buildAiDebugBudgetDecision({
      enabled: true,
      model: "gemini-3.1-flash-lite-preview",
      prompt: "bounded prompt",
      project: "kandydrops-by-ikandy",
    });
    const blocked = buildAiDebugBudgetDecision({
      enabled: true,
      model: "unreviewed-model",
      prompt: "bounded prompt",
      project: "kandydrops-by-ikandy",
    });

    expect(allowed.providerCallAllowed).toBe(true);
    expect(allowed.debugEvidence.estimatedInputTokens).toBeGreaterThan(0);
    expect(blocked.providerCallAllowed).toBe(false);
    expect(blocked.fallbackReason).toBe("model_not_allowlisted");
  });
});
