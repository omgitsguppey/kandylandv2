import { describe, expect, it } from "vitest";

import {
  buildFormalEvidenceStatusLedgerReport,
  buildReleaseReadinessContext,
  validateFormalEvidenceStatusLedgerReport,
} from "@/lib/release-readiness/final-release-readiness";

describe("formal evidence status ledger", () => {
  it("keeps runtime/provider and admin truth as formal missing instead of source-passed", () => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      currentHead: "head",
      publicBetaScore: { currentHead: "head", healthScore: 85, costRiskScore: 42 },
      currentBetaExitStatus: { currentHead: "head" },
      openPrs: [],
      artifacts: [],
      dirtyFiles: [],
    });
    const report = buildFormalEvidenceStatusLedgerReport(context);

    expect(report.categories.find((entry) => entry.category === "live route/runtime evidence")?.status).toBe("formal_missing");
    expect(report.categories.find((entry) => entry.category === "external provider proof")?.status).toBe("formal_missing");
    expect(report.categories.find((entry) => entry.category === "admin live truth/redacted sample evidence")?.status).toBe("formal_missing");
    expect(report.categories.every((entry) => entry.whatItDoesNotProve)).toBe(true);
    expect(validateFormalEvidenceStatusLedgerReport(report)).toEqual([]);
  });
});
