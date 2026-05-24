import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = join(__dirname, "../..");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

describe("debug cockpit PR finalization gate", () => {
  it("records the requested cockpit PR finalization artifacts and package script", () => {
    expect(existsSync(join(root, "agent/state/debug-cockpit-pr-finalization.generated.json"))).toBe(true);
    expect(existsSync(join(root, "docs/agent-truth/debug-cockpit-pr-finalization.md"))).toBe(true);
    expect(existsSync(join(root, "scripts/agent/validate-debug-cockpit-pr-finalization.ts"))).toBe(true);

    expect(read("package.json")).toContain("\"check:debug-cockpit-pr-finalization\"");
  });

  it("classifies every open PR without landing Jules scratch files", () => {
    const report = JSON.parse(read("agent/state/debug-cockpit-pr-finalization.generated.json"));

    expect(report.unclassifiedPrCount).toBe(0);
    expect(report.nextBatchAllowed).toBe(true);
    expect(report.handledPrs.map((pr: { number: number }) => pr.number)).toEqual(expect.arrayContaining([285, 286, 287, 288, 289]));
    expect(report.handledPrs.flatMap((pr: { scratchFilesExcluded: string[] }) => pr.scratchFilesExcluded)).toEqual(expect.arrayContaining([".jules/bolt.md", ".Jules/palette.md"]));
    expect(JSON.stringify(report.dirtyFilesAfter)).not.toMatch(/\.jules|\.Jules/u);
  });
});
