import { describe, expect, it } from "vitest";

import {
  buildFinalOpenPrClosureReport,
  validateFinalOpenPrClosureReport,
} from "@/lib/release-readiness/final-beta-exit-closure";

const root = process.cwd();

describe("final open PR closure", () => {
  it("treats security PRs with current-source equivalent patches as classified, not blocking", () => {
    const report = buildFinalOpenPrClosureReport(root, [
      {
        number: 319,
        title: "Sentinel HIGH: Fix open redirect via protocol-relative URLs",
        mergeStateStatus: "CLEAN",
        isDraft: false,
      },
      {
        number: 311,
        title: "Sentinel MEDIUM: Fix insecure error logging exposing stack traces in API routes",
        mergeStateStatus: "CLEAN",
        isDraft: false,
      },
      {
        number: 306,
        title: "Sentinel MEDIUM: Replace console.warn with secure recordRouteWarning in creator settings API",
        mergeStateStatus: "CLEAN",
        isDraft: false,
      },
    ]);

    expect(report.unclassifiedOpenPrCount).toBe(0);
    expect(report.blockingOpenPrCount).toBe(0);
    expect(validateFinalOpenPrClosureReport(report)).toEqual([]);
  });

  it("keeps protected payment and broad runtime PRs classified without marking them landed", () => {
    const report = buildFinalOpenPrClosureReport(root, [
      { number: 316, title: "Audit package metadata and source-of-funds truth" },
      { number: 308, title: "Audit package metadata and source-of-funds truth" },
      { number: 312, title: "Harden realtime truth for user-facing runtime surfaces" },
    ]);

    expect(report.unclassifiedOpenPrCount).toBe(0);
    expect(report.handledPrs.find((pr) => pr.number === 316)?.status).toBe("protected_payment_manual_review");
    expect(report.handledPrs.find((pr) => pr.number === 308)?.status).toBe("protected_payment_manual_review");
    expect(report.handledPrs.find((pr) => pr.number === 312)?.status).toBe("broad_runtime_deferred_post_beta");
    expect(validateFinalOpenPrClosureReport(report)).toEqual([]);
  });
});
