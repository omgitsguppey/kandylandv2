import { describe, expect, it } from "vitest";

import { buildAdminHotCacheCostEstimate } from "@/lib/admin/admin-hot-cache-cost-estimator";

describe("admin hot-cache cost estimate", () => {
  it("lists old and new operation paths without dollar claims", () => {
    const estimate = buildAdminHotCacheCostEstimate();

    expect(estimate.oldReadPaths).toContain("users query up to 5000 docs");
    expect(estimate.oldReadPaths).toContain("drops query up to 5000 docs");
    expect(estimate.newReadPaths).toEqual([
      "admin_overview_snapshot hot-cache doc",
      "admin_overview_snapshot heartbeat doc",
      "optional bounded recent feed summary doc",
    ]);
    expect(estimate.oldEstimatedReadsPerLoad).toBeGreaterThan(10_000);
    expect(estimate.newEstimatedReadsPerLoad).toBe(3);
    expect(estimate.estimatedReadReductionPct).toBeGreaterThan(99);
    expect(estimate.newHeartbeatIntervalMs).toBe(3_600_000);
    expect(estimate.notes.join(" ")).not.toMatch(/\$|usd/i);
  });
});
