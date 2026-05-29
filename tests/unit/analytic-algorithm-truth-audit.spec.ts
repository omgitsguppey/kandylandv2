import { describe, expect, it } from "vitest";

import {
  ANALYTIC_ALGORITHM_AUDIT,
  validateAnalyticAlgorithmAudit,
} from "@/lib/identity-truth/analytic-algorithm-audit";

describe("analytic algorithm truth audit", () => {
  it("requires identity/confidence inputs and missing-is-not-zero output", () => {
    expect(validateAnalyticAlgorithmAudit(ANALYTIC_ALGORITHM_AUDIT)).toEqual([]);
    expect(ANALYTIC_ALGORITHM_AUDIT.map((algorithm) => algorithm.algorithmId)).toEqual(expect.arrayContaining([
      "event_envelope_validation",
      "person_metrics_hydration",
      "journey_attribution",
      "live_evidence",
    ]));
  });
});
