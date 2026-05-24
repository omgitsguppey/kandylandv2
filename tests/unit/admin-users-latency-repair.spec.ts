import { describe, expect, it } from "vitest";

import {
  buildAdminUsersLatencyRepairReport,
  validateAdminUsersLatencyRepairReport,
} from "@/lib/debug/debug-cockpit-batch19-product-routes";

describe("admin users latency repair", () => {
  it("keeps admin users summary-first with bounded list/detail modes", () => {
    const report = buildAdminUsersLatencyRepairReport();

    expect(report.statusAfter).toBe("summary_first_policy");
    expect(report.defaultMode).toBe("summary");
    expect(report.pagination.limit).toBeGreaterThan(0);
    expect(report.rawDumpDefault).toBe(false);
    expect(validateAdminUsersLatencyRepairReport(report)).toEqual([]);
  });
});
