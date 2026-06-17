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
    expect(report.manualFallbackPushCheckRisks).toEqual([]);
    expect(report.externalCheckProviders.map((provider) => provider.githubCheckName)).toEqual(
      expect.arrayContaining(["App Hosting - Rollout (kandydrops-by-ikandy/us-central1/kandydrops)", "Google Cloud Build", "Graphite App"]),
    );
    expect(report.externalCheckProviders.every((provider) => provider.canBeClearedBySourceChecks === false)).toBe(true);
    expect(report.externalCheckProviders.every((provider) => provider.stuckPendingSymptom.length > 0)).toBe(true);
    expect(report.externalCheckProviders.every((provider) => provider.providerAction.length > 0)).toBe(true);
    expect(validation.ok).toBe(true);
  });

  it("records App Hosting Build queued as an external provider blocker", () => {
    const report = buildCiReleaseDisciplineReport();
    const appHosting = report.externalCheckProviders.find((provider) => provider.provider === "firebase_app_hosting");

    expect(appHosting?.githubCheckName).toBe("App Hosting - Rollout (kandydrops-by-ikandy/us-central1/kandydrops)");
    expect(appHosting?.stuckPendingSymptom).toContain("Build queued");
    expect(appHosting?.sourceSafeDisposition).toBe("external_provider_blocker");
    expect(appHosting?.providerAction).toContain("Do not use another source commit as the retry mechanism");
    expect(appHosting?.canBeClearedBySourceChecks).toBe(false);
  });

  it("keeps Graphite out of source-owned beta exit gates", () => {
    const report = buildCiReleaseDisciplineReport();
    const graphite = report.externalCheckProviders.find((provider) => provider.provider === "graphite");

    expect(graphite?.releaseGateClassification).toBe("not_authoritative_for_source_release");
    expect(graphite?.requiredBeforeBetaExit).toBe(false);
    expect(graphite?.sourceSafeDisposition).toBe("branch_protection_cleanup");
    expect(graphite?.nextExactAction).toContain("remove it from required branch checks");
  });

  it("keeps manual fallback workflows from creating push-time status checks", () => {
    const report = buildCiReleaseDisciplineReport();
    const releaseNotesWorkflow = report.workflows.find((workflow) => workflow.file === ".github/workflows/public-release-notes.yml");

    expect(releaseNotesWorkflow?.classification).toBe("release_notes_fallback");
    expect(releaseNotesWorkflow?.trigger).toBe("workflow_dispatch");
    expect(report.staleReleaseRisks).toEqual([]);
  });
});
