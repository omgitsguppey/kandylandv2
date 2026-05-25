import { describe, expect, it } from "vitest";

import { resolveGa4AvailabilitySemantics } from "@/lib/analytics/ga4-availability-semantics";

describe("GA4 availability semantics", () => {
  it("separates report availability from usable chart data when samples are zero", () => {
    const status = resolveGa4AvailabilitySemantics({
      propertyConfigured: true,
      reportsAvailable: true,
      reportsLoaded: true,
      sampleCount: 0,
      dayBucketCount: 0,
      confidence: null,
      passAllowed: true,
    });

    expect(status.status).toBe("reports_loaded_empty");
    expect(status.setupPassAllowed).toBe(true);
    expect(status.provesUsableChartData).toBe(false);
    expect(status.provesSourceAgreement).toBe(false);
    expect(status.displayConfidence).toBe("n/a");
    expect(status.nextAction).toContain("sample rows or day buckets");
  });
});
