import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildRepoDoctrineResetReport,
  validateRepoDoctrineResetReport,
} from "../../scripts/agent/validate-repo-doctrine-reset";

const root = process.cwd();
const report = buildRepoDoctrineResetReport(new Date("2026-05-14T18:00:00.000Z"));

function read(pathFromRoot: string): string {
  return readFileSync(join(root, pathFromRoot), "utf8");
}

describe("repo doctrine reset", () => {
  it("builds a valid reset report with required authority lanes", () => {
    expect(report.reportKey).toBe("repo-doctrine-reset");
    expect(report.generatedAtUtc).toBe("2026-05-14T18:00:00.000Z");
    expect(validateRepoDoctrineResetReport(report)).toEqual([]);

    expect(report.doctrineAuthorities.map((authority) => authority.lane)).toEqual(expect.arrayContaining([
      "operator workflow",
      "public beta score",
      "release notes",
      "admin debug",
      "admin analytics",
      "watch time",
      "creator feature connections",
      "repo cleanup inventory",
    ]));
  });

  it("leaves no P0 stale doctrine findings", () => {
    expect(report.summary.p0Count).toBe(0);
    expect(report.staleDoctrineFindings.some((finding) => finding.severity === "P0")).toBe(false);
  });

  it("records the release-note skip exception", () => {
    const doctrine = read("docs/agent-truth/current-operator-doctrine.md");
    const releaseNotes = read("docs/agent-truth/public-beta-release-notes.md");

    expect(doctrine).toContain("Release-note-only commits must not trigger another release-note loop");
    expect(releaseNotes).toContain("Release-note-only commits must include `[skip release-notes]`");
    expect(releaseNotes).toMatch(/skipped Public Beta Release Notes workflow is not a failure/i);
  });

  it("contains full-loop, metric cadence, and no-additive measurement rules", () => {
    const doctrine = read("docs/agent-truth/current-operator-doctrine.md");

    expect(doctrine).toContain("Full-Loop Closure");
    expect(doctrine).toContain("Metric Cadence + Math Precision");
    expect(doctrine).toContain("Missing data is not zero");
    expect(doctrine).toContain("No fake realtime");
    expect(doctrine).toContain("Do not add a new measurement lane");
    expect(doctrine).toContain("add no new event volume");
    expect(doctrine).toContain("No Additive Patch Stacking");
  });

  it("keeps screenshot debugging source-rooted", () => {
    const doctrine = read("docs/agent-truth/current-operator-doctrine.md");

    expect(doctrine).toContain("Screenshots are symptom receipts");
    expect(doctrine).toContain("component -> hook/state -> API route/server action");
  });

  it("keeps generated reports as snapshot/evidence unless fresh current authority", () => {
    const doctrine = read("docs/agent-truth/current-operator-doctrine.md");
    const repoSpring = read("docs/agent-truth/repo-spring-cleaning-rewire.md");

    expect(doctrine).toContain("generated-report snapshot treated as live authority");
    expect(repoSpring).toContain("Old generated reports are not authority unless they are consumed by the current score, Debug, or readiness path and are fresh");
    expect(repoSpring).toContain("Cleanup should demote first and delete later only with human approval");
  });

  it("keeps operator-reported PayPal out of formal provider pass", () => {
    const doctrine = read("docs/agent-truth/current-operator-doctrine.md");
    const scoreDoc = read("docs/agent-truth/public-beta-score.md");

    expect(doctrine).toContain("Operator-reported PayPal is tracked, not formal provider smoke");
    expect(scoreDoc).toContain("Operator-reported PayPal is tracked, not passing");
  });
});
