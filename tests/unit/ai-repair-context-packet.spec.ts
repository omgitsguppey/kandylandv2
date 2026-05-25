import { describe, expect, it } from "vitest";

import {
  buildAiRepairContextPacket,
  redactAiDebugContext,
  validateAiContextSafety,
} from "@/lib/debug/ai-repair-context-packet";

describe("AI repair context packet", () => {
  it("redacts private identifiers and blocks forbidden raw payloads before AI planning", () => {
    const redacted = redactAiDebugContext({
      text: "User abcdef1234567890abcdef12 emailed test@example.com. raw support body: help me. token=secret",
    });

    expect(redacted.redactedText).toContain("[redacted_id]");
    expect(redacted.redactedText).toContain("[redacted_email]");
    expect(redacted.redactedText).not.toContain("test@example.com");
    expect(redacted.forbiddenPayloadsDetected).toContain("raw_support_body");
    expect(redacted.forbiddenPayloadsDetected).toContain("secret_or_token");

    const packet = buildAiRepairContextPacket({
      workItemId: "wi-support-private",
      boundedEvidence: ["Support body mentions user test@example.com"],
      maxInputTokens: 10,
      modelRole: "admin_debug_fix_planner",
    });

    expect(packet.privacyDecision).toBe("blocked_for_manual_review");
    expect(packet.tokenEstimate).toBeGreaterThan(0);
    expect(packet.costDecision).toBe("within_budget");
    expect(validateAiContextSafety(packet).safe).toBe(false);
  });

  it("marks oversized context packets as inspect-only without provider calls", () => {
    const packet = buildAiRepairContextPacket({
      workItemId: "wi-large",
      boundedEvidence: [Array(400).fill("bounded evidence").join(" ")],
      maxInputTokens: 20,
      modelRole: "admin_debug_assistant",
    });

    expect(packet.costDecision).toBe("blocked_token_budget");
    expect(packet.providerCallRequired).toBe(false);
    expect(packet.selectedModeAfterSafety).toBe("inspect_only");
  });
});
