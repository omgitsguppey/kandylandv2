import { describe, expect, it } from "vitest";

import {
  buildCiReleaseDisciplineReport,
  validateCiReleaseDisciplineReport,
} from "../../src/lib/config-hardening/ci-release-discipline";

describe("ci release discipline", () => {
  it("keeps deploy/provider risk out of normal validation lanes", () => {
    const report = buildCiReleaseDisciplineReport();
    const validation = validateCiReleaseDisciplineReport(report);

    expect(report.workflows.length).toBeGreaterThan(0);
    expect(report.workflows.some((workflow) => workflow.file === ".github/workflows/ci.yml")).toBe(true);
    expect(report.releaseNotesFreshnessOwner).toBe("check:release-notes");
    expect(report.externalCheckProviderBoundaries).toBe(true);
    expect(report.externalCheckProviders.map((provider) => provider.githubCheckName)).toEqual(
      expect.arrayContaining(["Firebase App Hosting", "Google Cloud Build", "Graphite App"]),
    );
    expect(report.externalCheckProviders.every((provider) => provider.canBeClearedBySourceChecks === false)).toBe(true);
    expect(validation.ok).toBe(true);
  });

  it("keeps Graphite out of source-owned beta exit gates", () => {
    const report = buildCiReleaseDisciplineReport();
    const graphite = report.externalCheckProviders.find((provider) => provider.provider === "graphite");

    expect(graphite?.releaseGateClassification).toBe("not_authoritative_for_source_release");
    expect(graphite?.requiredBeforeBetaExit).toBe(false);
    expect(graphite?.nextExactAction).toContain("remove it from required branch checks");
  });
});
