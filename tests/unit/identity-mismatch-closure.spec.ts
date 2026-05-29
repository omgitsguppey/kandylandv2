import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { runValidation } from "../../scripts/agent/validate-identity-mismatch-closure";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    default: {
      ...actual.default,
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
    },
  };
});

describe("Identity Mismatch Closure Validation Suite", () => {
  it("should fail if closure JSON is missing", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    
    vi.mocked(fs.existsSync).mockReturnValue(false);

    expect(() => runValidation()).toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsoleError).toHaveBeenCalled();

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it("should pass if all files are correct and have correct heads", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    vi.mocked(fs.existsSync).mockReturnValue(true);
    
    // Mock git head retrieval
    const { execSync } = require("node:child_process");
    const latestHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (path.includes("identity-mismatch-closure.generated.json")) {
        return JSON.stringify({
          individualMetricHydrationStatus: "classified",
          globalVsUserMismatchCount: 3,
          mismatches: [
            { mismatchId: "m1", metricAffected: "visits" }
          ],
          remainingGaps: [
            { gapId: "identity_link_missing", source: "s", nextAction: "a" }
          ],
          currentHead: latestHead
        });
      }
      return JSON.stringify({
        individualMetricHydrationStatus: "classified",
        currentHead: latestHead
      });
    });

    runValidation();
    expect(mockConsoleLog).toHaveBeenCalledWith("Identity Mismatch Closure OK.");

    mockExit.mockRestore();
    mockConsoleLog.mockRestore();
  });
});
