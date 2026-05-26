import { describe, expect, it } from "vitest";

import {
  buildCurrentHeadReleaseReconciliationReport,
  buildReleaseReadinessContext,
  validateCurrentHeadReleaseReconciliationReport,
} from "@/lib/release-readiness/final-release-readiness";

const head = "head";

describe("current head release reconciliation", () => {
  it("fails when score or current beta artifacts lag the current head", () => {
    const context = buildReleaseReadinessContext(process.cwd(), {
      currentHead: head,
      publicBetaScore: { currentHead: "old", healthScore: 85, sourceHealthScore: 100 },
      currentBetaExitStatus: { currentHead: "old" },
      openPrs: [],
      artifacts: [],
      dirtyFiles: [],
    });
    const report = buildCurrentHeadReleaseReconciliationReport(context);

    expect(validateCurrentHeadReleaseReconciliationReport(report)).toEqual(
      expect.arrayContaining([
        "public beta score currentHead is behind latest main.",
        "current beta exit status currentHead is behind latest main.",
      ]),
    );
  });
});
