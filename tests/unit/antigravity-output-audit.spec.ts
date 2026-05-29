import { describe, expect, it, vi } from "vitest";
import { runValidation } from "../../scripts/agent/validate-antigravity-output-audit";
import { fileExists, readJsonFile } from "../../scripts/agent/shared";

describe("Antigravity Output Audit Validation Suite", () => {
  it("should find the generated output audit json", () => {
    expect(fileExists("agent/state/antigravity-output-audit.generated.json")).toBe(true);
  });

  it("should have correct schema checks in output audit json", () => {
    const data = readJsonFile<any>("agent/state/antigravity-output-audit.generated.json");
    expect(data.auditedCommit).toContain("61a0f236");
    expect(data.productSourceUnexpectedFiles).toContain("src/lib/identity-truth/individual-user-metric-truth.ts");
    expect(data.identityMetricFileAudit.altersRuntimeBehavior).toBe(false);
    expect(data.identityMetricFileAudit.userMetricMathOrCountingChanged).toBe(false);
    expect(data.openPrCount).toBe(6);
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
