import { describe, expect, it, vi } from "vitest";
import { runValidation } from "../../scripts/agent/validate-identity-inflight-recovery-lock";
import { fileExists, readJsonFile } from "../../scripts/agent/shared";

describe("Identity Inflight Recovery Lock Validation Suite", () => {
  it("should find the generated recovery lock json", () => {
    expect(fileExists("agent/state/identity-inflight-recovery-lock.generated.json")).toBe(true);
  });

  it("should have correct schema checks in recovery lock json", () => {
    const data = readJsonFile<any>("agent/state/identity-inflight-recovery-lock.generated.json");
    expect(data.identityLaneStatus).toBe("completed_and_locked");
    expect(data.remainingUntrackedIdentityFiles.length).toBe(0);
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
