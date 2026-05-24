import { describe, expect, it } from "vitest";

import {
  buildDebugCockpitBatch19ProductRoutesReport,
  validateDebugCockpitBatch19ProductRoutesReport,
} from "@/lib/debug/debug-cockpit-batch19-product-routes";

describe("debug cockpit batch 19 product routes", () => {
  it("locks product route hotspot cleanup without hiding unresolved route evidence", () => {
    const report = buildDebugCockpitBatch19ProductRoutesReport();

    expect(report.tasksRotateStatusAfter).toBe("expected_typed_client_error");
    expect(report.adminUsersLatencyStatusAfter).toBe("summary_first_policy");
    expect(report.supportThreadsIndexStatus).toBe("firestore_indexes_configured");
    expect(report.viewerWatchSessionStatusAfter).toBe("expected_typed_client_error");
    expect(report.staleCriticalRoutes).toContain("paypal/capture:POST");
    expect(report.scoreAfter).toBeGreaterThan(report.scoreBefore);
    expect(validateDebugCockpitBatch19ProductRoutesReport(report)).toEqual([]);
  });
});
