import { describe, expect, it, vi } from "vitest";
import { runValidation } from "../../scripts/agent/validate-antigravity-agent-self-knowledge";
import { fileExists, readJsonFile } from "../../scripts/agent/shared";

describe("Antigravity Self-Knowledge Audit Validation Suite", () => {
  it("should find the generated self-knowledge json file", () => {
    expect(fileExists("agent/state/antigravity-agent-self-knowledge.generated.json")).toBe(true);
  });

  it("should have correct schema shapes in self-knowledge json file", () => {
    const data = readJsonFile<any>("agent/state/antigravity-agent-self-knowledge.generated.json");
    expect(data).toHaveProperty("generatedAtUtc");
    expect(data.currentHead).toBe("cfd39b411b08374c8a698bb07bb42f473ebba278");
    expect(data.latestScore).toBe(76.61);
    expect(data.betaExitReady).toBe(false);
    expect(data.unsafeActionsBlocked.length).toBeGreaterThan(0);
    expect(data.noTouchDomains.length).toBeGreaterThan(0);
  });

  it("should execute validation without process.exit if clean", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null | undefined): never => {
      throw new Error(`process.exit called with ${code}`);
    });

    try {
      runValidation();
      expect(exitSpy).not.toHaveBeenCalled();
    } catch (e: any) {
      // If it throws process.exit, fail the test
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
