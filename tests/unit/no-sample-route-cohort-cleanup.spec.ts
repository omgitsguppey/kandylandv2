import { describe, expect, it } from "vitest";

import { classifyNoSampleRouteCohort } from "@/lib/debug/no-sample-route-cohort-classifier";

describe("no-sample route cohort classifier", () => {
  it("keeps quiet optional routes out of live health while requiring smoke for high-risk writes", () => {
    expect(classifyNoSampleRouteCohort("admin/ai/drop-covers/template:DELETE")).toMatchObject({
      cohort: "optional_quiet",
      status: "unseen_optional_quiet",
      displaysLive: false,
    });

    expect(classifyNoSampleRouteCohort("creator/payouts:POST")).toMatchObject({
      cohort: "creator_payouts_write",
      status: "unseen_required_smoke_needed",
      risk: "critical",
      sampleRequiredForBeta: true,
      displaysLive: false,
    });
  });
});
