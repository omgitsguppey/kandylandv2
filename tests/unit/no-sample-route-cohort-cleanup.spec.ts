import { describe, expect, it } from "vitest";

import { classifyNoSampleRouteCohort } from "@/lib/debug/no-sample-route-cohort-classifier";

describe("no-sample route cohort classifier", () => {
  it("keeps quiet optional routes out of live health while requiring smoke for high-risk writes", () => {
    expect(classifyNoSampleRouteCohort("admin/ai/drop-covers/template:DELETE")).toMatchObject({
      cohort: "optional_admin_delete",
      status: "unseen_optional_quiet",
      displaysLive: false,
    });

    expect(classifyNoSampleRouteCohort("admin/creator-account-controls:POST")).toMatchObject({
      cohort: "required_admin_write",
      status: "unseen_required_smoke_needed",
      displaysLive: false,
    });
  });
});
