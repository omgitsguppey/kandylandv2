import { describe, expect, it } from "vitest";

import { resolveUserTrackingLiveEvidence } from "@/lib/identity-truth/user-tracking-live-evidence";

describe("user tracking live evidence", () => {
  it("does not let global activity clear user-level tracking evidence", () => {
    const evidence = resolveUserTrackingLiveEvidence({
      globalMetricsHydrated: 12,
      signedInMetricsHydrated: 0,
      linkedPersonMetricsHydrated: 0,
      identityConfidence: "weak",
      missingIdentityLinkCount: 2,
    });

    expect(evidence.status).toBe("actionable_gap");
    expect(evidence.clearsUserTrackingGate).toBe(false);
    expect(evidence.gaps).toContain("identity_link_missing");
  });
});
