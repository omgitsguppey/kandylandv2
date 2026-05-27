import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readJson(relativePath: string) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

describe("creator drop approval repair report", () => {
  it("summarizes submit flow, admin approval, visibility split, 4xx, evidence, and memory", () => {
    const report = readJson("agent/state/creator-drop-approval-repair.generated.json");

    expect(report.submitFlowStatus).toBe("fixed");
    expect(report.adminApprovalStatus).toBe("fixed");
    expect(report.creatorStatusParity).toBe("fixed");
    expect(report.userVisibilityGuard).toBe("guarded");
    expect(report.creator4xxClassesCovered).toBeGreaterThanOrEqual(13);
    expect(report.memoryEntriesAdded).toBeGreaterThanOrEqual(5);
    expect(report.remainingGaps).toEqual(expect.any(Array));
    expect(report.nextExactSteps).toEqual(expect.any(Array));
  });
});
