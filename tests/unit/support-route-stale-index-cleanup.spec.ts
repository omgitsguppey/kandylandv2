import { describe, expect, it } from "vitest";

import { buildSupportRouteStaleIndexCleanupReport } from "@/lib/debug/debug-cockpit-batch20-stale-route-sweep";

describe("support route stale index cleanup", () => {
  it("keeps missing index actionable and stale support samples out of live health", () => {
    const report = buildSupportRouteStaleIndexCleanupReport();

    expect(report.supportIndexStatus).toBe("missing_firestore_index_actionable");
    expect(report.supportStaleSampleStatus).toBe("needs_fresh_support_smoke");
    expect(report.broadReadFallbackAllowed).toBe(false);
  });
});
