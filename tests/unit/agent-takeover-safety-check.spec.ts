import { describe, expect, it, vi } from "vitest";
import { runValidation } from "../../scripts/agent/validate-agent-takeover-safety-check";
import { fileExists, readJsonFile } from "../../scripts/agent/shared";

describe("Agent Takeover Safety Check Validation Suite", () => {
  it("should find the generated takeover safety check json", () => {
    expect(fileExists("agent/state/agent-takeover-safety-check.generated.json")).toBe(true);
  });

  it("should have correct schema checks in takeover safety check json", () => {
    const data = readJsonFile<any>("agent/state/agent-takeover-safety-check.generated.json");
    expect(data.takeoverStatus).toBe("verified_safe");
    expect(data.checks.latestCommitIdentified).toBe("cfd39b411b08374c8a698bb07bb42f473ebba278");
    expect(data.checks.noOverlapWithInFlightWork).toBe(true);
    expect(data.checks.noStaleArtifactTreatedAsCurrent).toBe(true);
    expect(data.checks.noPaymentRuntimeViolations).toBe(true);
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
