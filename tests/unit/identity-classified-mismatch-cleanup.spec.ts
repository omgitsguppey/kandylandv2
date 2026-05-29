import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { runValidation } from "../../scripts/agent/validate-identity-classified-mismatch-cleanup";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    default: {
      ...actual.default,
      existsSync: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      mkdirSync: vi.fn(),
    },
  };
});

function makeClosureData(overrides: Record<string, any> = {}) {
  const { execSync } = require("node:child_process");
  const latestHead = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
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
    currentHead: latestHead,
    ...overrides,
  };
}

function setupMocks(closureData: any, docContent = "- Active global vs user mismatches: 0") {
  vi.mocked(fs.existsSync).mockImplementation((p: any) => {
    if (typeof p === "string" && p.includes("identity-mismatch-closure.generated.json")) return true;
    if (typeof p === "string" && p.includes("docs/agent-truth/")) return true;
    return false;
  });
  vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
    if (typeof p === "string" && p.includes("identity-mismatch-closure.generated.json")) {
      return JSON.stringify(closureData);
    }
    if (typeof p === "string" && p.includes(".md")) {
      return `- Global vs user mismatches surfaced: 3\n${docContent}`;
    }
    return "";
  });
  vi.mocked(fs.writeFileSync).mockImplementation(() => {});
  vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
}

describe("Identity Classified Mismatch Cleanup Validation Suite", () => {
  it("should pass when closure data is correct and docs include breakdown", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    setupMocks(makeClosureData());

    runValidation();
    expect(mockConsoleLog).toHaveBeenCalledWith("Identity Classified Mismatch Cleanup OK.");

    mockExit.mockRestore();
    mockConsoleLog.mockRestore();
  });

  it("should fail if closure file is missing", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(fs.existsSync).mockReturnValue(false);

    expect(() => runValidation()).toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it("should fail if activeMismatchCount > 0", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    setupMocks(makeClosureData({
      activeGlobalVsUserMismatchCount: 1,
      classifiedNonBlockingMismatchCount: 2,
    }));

    expect(() => runValidation()).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("unclassified mismatches remain")
    );

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it("should fail if classified mismatch has scoreDrag=true", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const data = makeClosureData();
    data.mismatches[0].scoreDrag = true;
    setupMocks(data);

    expect(() => runValidation()).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("incorrectly marked as score drag")
    );

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it("should fail if doc shows total without active breakdown", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    setupMocks(makeClosureData(), "");  // doc without active breakdown

    expect(() => runValidation()).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("without clarified active/classified breakdown")
    );

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it("should fail if total does not equal active + classified", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    setupMocks(makeClosureData({
      globalVsUserMismatchCount: 5,
      activeGlobalVsUserMismatchCount: 0,
      classifiedNonBlockingMismatchCount: 3,
    }));

    expect(() => runValidation()).toThrow("process.exit");
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("!=")
    );

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });

  it("should write cleanup report artifacts when passing", () => {
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit"); });
    const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    setupMocks(makeClosureData());

    runValidation();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "agent/state/identity-classified-mismatch-cleanup.generated.json",
      expect.stringContaining("activeMismatchCount")
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      "docs/agent-truth/identity-classified-mismatch-cleanup.md",
      expect.stringContaining("Identity Classified Mismatch Cleanup")
    );

    mockExit.mockRestore();
    mockConsoleLog.mockRestore();
  });
});
