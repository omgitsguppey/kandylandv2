import { describe, expect, it } from "vitest";

import {
  buildOperatorFinalQaPacketReport,
  buildReleaseReadinessContext,
  validateOperatorFinalQaPacketReport,
} from "@/lib/release-readiness/final-release-readiness";

describe("operator final QA packet", () => {
  it("keeps optional visual reproduction outside Codex score gates", () => {
    const context = buildReleaseReadinessContext(process.cwd(), { currentHead: "head", openPrs: [], artifacts: [], dirtyFiles: [] });
    const report = buildOperatorFinalQaPacketReport(context);

    expect(report.outsideCodexScoreGate).toBe(true);
    expect(report.surfaces.map((surface) => surface.surfaceId)).toEqual(expect.arrayContaining(["homepage", "wallet-purchase-modal", "admin-debug"]));
    expect(report.operatorFinalStatus).toBe("source_checked");
    expect(report.surfaces.every((surface) => surface.browserReproductionRequired === false)).toBe(true);
    expect(report.surfaces.every((surface) => surface.status === "source_checked")).toBe(true);
    expect(validateOperatorFinalQaPacketReport(report)).toEqual([]);
  });
});
