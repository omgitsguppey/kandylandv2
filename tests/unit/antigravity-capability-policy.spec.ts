import { describe, expect, it, vi } from "vitest";
import { runValidation } from "../../scripts/agent/validate-antigravity-capability-policy";
import { ANTIGRAVITY_CAPABILITY_POLICY, validatePolicy } from "../../src/lib/agent-governance/antigravity-capability-policy";

describe("Antigravity Capability Policy Validation Suite", () => {
  it("should validate a compliant policy correctly", () => {
    const failures = validatePolicy(ANTIGRAVITY_CAPABILITY_POLICY);
    expect(failures.length).toBe(0);
  });

  it("should fail validation if deploy is allowed", () => {
    const badPolicy = { ...ANTIGRAVITY_CAPABILITY_POLICY, allowDeploy: true };
    const failures = validatePolicy(badPolicy);
    expect(failures).toContain("Policy violation: allowDeploy must be false.");
  });

  it("should fail validation if provider calls are allowed", () => {
    const badPolicy = { ...ANTIGRAVITY_CAPABILITY_POLICY, allowProviderCalls: true };
    const failures = validatePolicy(badPolicy);
    expect(failures).toContain("Policy violation: allowProviderCalls must be false.");
  });

  it("should fail validation if production mutation is allowed", () => {
    const badPolicy = { ...ANTIGRAVITY_CAPABILITY_POLICY, allowProductionMutation: true };
    const failures = validatePolicy(badPolicy);
    expect(failures).toContain("Policy violation: allowProductionMutation must be false.");
  });

  it("should fail validation if multi-agent no-overlap rule is missing", () => {
    const badPolicy = { ...ANTIGRAVITY_CAPABILITY_POLICY, multiAgentNoOverlapRule: false };
    const failures = validatePolicy(badPolicy);
    expect(failures).toContain("Policy violation: multiAgentNoOverlapRule must be true.");
  });

  it("should fail validation if memory writeback is missing", () => {
    const badPolicy = { ...ANTIGRAVITY_CAPABILITY_POLICY, requireMemoryWritebackAfterTask: false };
    const failures = validatePolicy(badPolicy);
    expect(failures).toContain("Policy violation: requireMemoryWritebackAfterTask must be true.");
  });

  it("should execute validation without process.exit if clean", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null | undefined): never => {
      throw new Error(`process.exit called with ${code}`);
    });

    try {
      runValidation();
      expect(exitSpy).not.toHaveBeenCalled();
    } catch (e: any) {
      if (e.message.startsWith("process.exit called")) {
        expect.fail(e.message);
      } else {
        throw e;
      }
    } finally {
      exitSpy.mockRestore();
    }
  });
});
