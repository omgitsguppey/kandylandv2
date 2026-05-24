import { describe, expect, it } from "vitest";

import {
  buildStaleRouteSampleClassificationReport,
  validateStaleRouteSampleClassificationReport,
} from "@/lib/debug/debug-cockpit-batch19-product-routes";

describe("stale route sample classification", () => {
  it("keeps stale payment/provider samples separate from current route health", () => {
    const report = buildStaleRouteSampleClassificationReport();

    expect(report.paypalCaptureStatus).toBe("critical_payment_evidence_required");
    expect(report.paypalFreshnessFaked).toBe(false);
    expect(report.groupedActionList.length).toBeGreaterThan(0);
    expect(validateStaleRouteSampleClassificationReport(report)).toEqual([]);
  });
});
