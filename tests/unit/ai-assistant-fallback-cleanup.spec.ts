import { describe, expect, it } from "vitest";

import { classifyAiAssistantRuntimeStatus } from "@/lib/debug/ai-assistant-runtime-status";

describe("ai assistant fallback cleanup", () => {
  it("separates deterministic fallback from feed preflight failure without provider calls", () => {
    const result = classifyAiAssistantRuntimeStatus({
      enabled: true,
      runtimeReady: true,
      fallbackUsed: true,
      responseState: "fallback",
      feedStatus: "failed",
      latencyMs: 0,
      configuredModel: "gemini-3.1-flash-lite-preview",
      fallbackInputStale: false,
    });

    expect(result.status).toBe("fallback_due_to_feed_failure");
    expect(result.fallbackStatus).toBe("deterministic_fallback_accepted");
    expect(result.feedStatus).toBe("failed");
    expect(result.providerCallAttempted).toBe(false);
    expect(result.degradesSystemState).toBe(false);
    expect(result.nextAction).toContain("preflight");
  });
});
