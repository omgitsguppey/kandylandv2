import { describe, expect, it } from "vitest";

import {
  buildReleaseNotesIntegrityReport,
  buildReleaseReadinessContext,
  validateReleaseNotesIntegrityReport,
} from "@/lib/release-readiness/final-release-readiness";

describe("release notes integrity", () => {
  it("blocks false beta-exit and provider-proof claims", () => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      currentHead: "head",
      releaseNotes: { currentVersion: "1.5.9", notes: [{ summary: "beta exit ready with provider smoke passed" }] },
      openPrs: [],
      artifacts: [],
      dirtyFiles: [],
    });
    const report = buildReleaseNotesIntegrityReport(context);

    expect(report.claimsBetaExit).toBe(true);
    expect(report.claimsProviderRuntimeProof).toBe(true);
    expect(validateReleaseNotesIntegrityReport(report)).toEqual(
      expect.arrayContaining([
        "release notes claim false readiness.",
        "release notes mention provider/runtime proof when not formally passed.",
      ]),
    );
  });
});
