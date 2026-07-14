import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { runValidation } from "../../scripts/agent/validate-identity-mismatch-closure";

vi.mock("../../src/lib/agent-score/generated-artifact-version-policy", () => ({
  classifyGeneratedArtifactFromGit: vi.fn(() => ({ needsRefresh: false, reason: "current test fixture" })),
}));

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

function makeClosureData(overrides: Record<string, any> = {}) {
  return {
    individualMetricHydrationStatus: "classified",
    globalVsUserMismatchCount: 3,
    activeGlobalVsUserMismatchCount: 0,
    classifiedNonBlockingMismatchCount: 3,
    expectedNoUserMappingCount: 3,
    missingIdentityLinkCount: 1,
    unsafeUnknownMismatchCount: 0,
    mismatches: [
      { mismatchId: "mismatch_visits_global_only", metricAffected: "visits", reason: "expected_no_user_mapping", action: "classified_non_blocking", activeBug: false, scoreDrag: false, nextAction: "wait" },
      { mismatchId: "mismatch_active_days_global_only", metricAffected: "active_days", reason: "expected_no_user_mapping", action: "classified_non_blocking", activeBug: false, scoreDrag: false, nextAction: "wait" },
      { mismatchId: "mismatch_page_views_global_only", metricAffected: "page_views", reason: "expected_no_user_mapping", action: "classified_non_blocking", activeBug: false, scoreDrag: false, nextAction: "wait" },
    ],
    remainingGaps: [
      { gapId: "identity_link_missing", source: "client_session_without_guest_id", nextAction: "preserve journey continuity" },
    ],
    currentHead: "test-head",
    ...overrides,
  };
}

function makeIdentityReport(overrides: Record<string, any> = {}) {
  return {
    individualMetricHydrationStatus: "classified",
    currentHead: "test-head",
    ...overrides,
  };
}

describe("Identity Mismatch Closure Validation Suite", () => {
  // classifyGeneratedArtifactFromGit calls git execSync which can be slow on Windows
  const TEST_TIMEOUT = 15_000;

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

  it("should pass when all files are correct with classified mismatches", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    vi.mocked(fs.existsSync).mockReturnValue(true);

    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (path.includes("identity-mismatch-closure.generated.json")) {
        return JSON.stringify(makeClosureData());
      }
      return JSON.stringify(makeIdentityReport());
    });

    runValidation();
    expect(mockConsoleLog).toHaveBeenCalledWith("Identity Mismatch Closure OK.");

    mockExit.mockRestore();
    mockConsoleLog.mockRestore();
  });

  it("should fail if activeGlobalVsUserMismatchCount is missing", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(fs.existsSync).mockReturnValue(true);

    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (path.includes("identity-mismatch-closure.generated.json")) {
        const data = makeClosureData();
        delete (data as any).activeGlobalVsUserMismatchCount;
        return JSON.stringify(data);
      }
      return JSON.stringify(makeIdentityReport());
    });

    expect(() => runValidation()).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("activeGlobalVsUserMismatchCount is missing")
    );

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it("should fail if classified non-blocking mismatch has activeBug=true", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(fs.existsSync).mockReturnValue(true);

    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (path.includes("identity-mismatch-closure.generated.json")) {
        const data = makeClosureData();
        data.mismatches[0].activeBug = true;
        return JSON.stringify(data);
      }
      return JSON.stringify(makeIdentityReport());
    });

    expect(() => runValidation()).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("classified non-blocking but marked activeBug=true")
    );

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it("should fail if classified non-blocking mismatch has scoreDrag=true", { timeout: TEST_TIMEOUT }, () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(fs.existsSync).mockReturnValue(true);

    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (path.includes("identity-mismatch-closure.generated.json")) {
        const data = makeClosureData();
        data.mismatches[1].scoreDrag = true;
        return JSON.stringify(data);
      }
      return JSON.stringify(makeIdentityReport());
    });

    expect(() => runValidation()).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("classified non-blocking but marked scoreDrag=true")
    );

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it("should fail if total does not equal active + classified", { timeout: TEST_TIMEOUT }, () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(fs.existsSync).mockReturnValue(true);

    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (path.includes("identity-mismatch-closure.generated.json")) {
        return JSON.stringify(makeClosureData({ classifiedNonBlockingMismatchCount: 2 }));
      }
      return JSON.stringify(makeIdentityReport());
    });

    expect(() => runValidation()).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("does not equal active + classified")
    );

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it("should fail if identity_link_missing gap lacks source", { timeout: TEST_TIMEOUT }, () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(fs.existsSync).mockReturnValue(true);

    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (path.includes("identity-mismatch-closure.generated.json")) {
        return JSON.stringify(makeClosureData({
          remainingGaps: [{ gapId: "identity_link_missing", nextAction: "a" }],
        }));
      }
      return JSON.stringify(makeIdentityReport());
    });

    expect(() => runValidation()).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("identity_link_missing lacks source or nextAction")
    );

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it("should fail if hydration status is still 'review'", { timeout: TEST_TIMEOUT }, () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(fs.existsSync).mockReturnValue(true);

    vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
      if (path.includes("identity-mismatch-closure.generated.json")) {
        return JSON.stringify(makeClosureData({ individualMetricHydrationStatus: "review" }));
      }
      return JSON.stringify(makeIdentityReport());
    });

    expect(() => runValidation()).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("vague 'review'")
    );

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });
});
