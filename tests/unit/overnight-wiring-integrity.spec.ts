import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  REQUIRED_OVERNIGHT_WIRING_LANES,
  buildOvernightWiringIntegrityReport,
  validateOvernightWiringIntegrityReport,
} from "../../scripts/agent/validate-overnight-wiring-integrity";

const repoRoot = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

describe("overnight wiring integrity", () => {
  it("maps every required lane with status and next action", () => {
    const report = buildOvernightWiringIntegrityReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      changedFiles: [],
      untrackedFiles: [],
      openPrs: [],
      fileContents: new Map(),
      packageJson: read("package.json"),
    });

    expect(report.lanes.map((lane) => lane.lane).sort()).toEqual([...REQUIRED_OVERNIGHT_WIRING_LANES].sort());
    expect(report.lanes.every((lane) => lane.status && lane.nextAction)).toBe(true);
    expect(report.summary.betaExitReadyMarked).toBe(false);
    expect(validateOvernightWiringIntegrityReport(report)).toEqual([]);
  });

  it("keeps creator drops separate from the user My KandyDrops library", () => {
    const routing = read("src/lib/creator-profile-routing.ts");
    const creatorWorkspace = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
    const creatorQuickActions = read("src/components/Dashboard/creator-workspace/CreatorDashboardQuickActions.tsx");
    const dropPage = read("src/app/dashboard/creator/drops/page.tsx");

    expect(routing).toContain('CREATOR_DROP_MANAGE_ROUTE = "/dashboard/creator/drops"');
    expect(routing).toContain('USER_LIBRARY_ROUTE = "/dashboard/library"');
    expect(creatorQuickActions).toContain("CREATOR_DROP_MANAGE_ROUTE");
    expect(dropPage).toContain("CreatorDropManager");
    expect(creatorWorkspace).not.toContain('href="/dashboard/library"');
  });

  it("fails reports with protected chat changes or unclassified dirty files", () => {
    const report = buildOvernightWiringIntegrityReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      changedFiles: ["src/components/Chat/ChatExperience.tsx", "src/components/UnknownThing.tsx"],
      untrackedFiles: [],
      openPrs: [],
      fileContents: new Map(),
      packageJson: read("package.json"),
    });

    const failures = validateOvernightWiringIntegrityReport(report);
    expect(failures).toContain("protected chat files changed.");
    expect(failures).toContain("dirty files are unclassified.");
  });

  it("flags broken telemetry/event contract wiring", () => {
    const report = buildOvernightWiringIntegrityReport({
      generatedAtUtc: "2026-05-20T12:00:00.000Z",
      currentHead: "head",
      changedFiles: [],
      untrackedFiles: [],
      openPrs: [],
      packageJson: '"check:overnight-wiring-integrity"',
      fileContents: new Map([
        ["src/lib/analytics/telemetry-dependency-graph.ts", "export const TELEMETRY_DEPENDENCY_GRAPH = []"],
        ["src/lib/analytics/analytics-event-contract.ts", ""],
        ["src/components/Creators/CreatorDropManager.tsx", 'trackEvent("creator_drop_submitted")'],
        ["src/app/api/creator/drops/route.ts", 'trackCreatorDropEvent("creator_drop_submitted")'],
      ]),
    });

    expect(validateOvernightWiringIntegrityReport(report)).toContain("telemetry events are not covered by the graph or contract.");
  });
});
