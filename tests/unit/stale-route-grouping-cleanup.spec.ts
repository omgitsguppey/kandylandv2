import { describe, expect, it } from "vitest";

import { groupStaleRouteSamples } from "@/lib/debug/stale-route-grouping";

describe("stale route grouping cleanup", () => {
  it("groups stale routes by age and error history for default cockpit output", () => {
    const groups = groupStaleRouteSamples([
      { routeKey: "paypal/capture:POST", risk: "critical", lastResult: "success", ageDays: 2, serverErrors: 1, clientErrors: 0, hasSample: true },
      { routeKey: "creator/bookings:POST", risk: "high", lastResult: "server_error", ageDays: 20, serverErrors: 2, clientErrors: 0, hasSample: true },
      { routeKey: "admin/ai/drop-covers/template:DELETE", risk: "medium", lastResult: "no_sample", ageDays: null, serverErrors: 0, clientErrors: 0, hasSample: false },
    ]);

    expect(groups.criticalStale.routeKeys).toContain("paypal/capture:POST");
    expect(groups.staleWithServerErrorHistory.routeKeys).toContain("creator/bookings:POST");
    expect(groups.noSampleOptional.routeKeys).toContain("admin/ai/drop-covers/template:DELETE");
    expect(groups.defaultCollapsed).toBe(true);
  });
});
