import { describe, expect, it } from "vitest";

import {
  buildBatch12ReadinessRefreshReport,
  validateBatch12ReadinessRefreshReport,
} from "../../scripts/agent/debug-cockpit-batch12-shared";

describe("Batch 12 readiness refresh", () => {
  it("keeps refreshed device, hydration, content, and GumDrop economy artifacts current without touching protected runtime behavior", () => {
    const report = buildBatch12ReadinessRefreshReport();

    expect(report.deviceUiAgeAfter).toBeLessThanOrEqual(72);
    expect(report.deviceLayoutAgeAfter).toBeLessThanOrEqual(72);
    expect(report.hydrationAgeAfter).toBeLessThanOrEqual(72);
    expect(report.contentProtectionAgeAfter).toBeLessThanOrEqual(72);
    expect(report.gumdropEconomyAgeAfter).toBeLessThanOrEqual(72);
    expect(report.gumdropMathChanged).toBe(false);
    expect(report.contentProtectionWeakened).toBe(false);
    expect(report.deviceLayoutFindings.every((finding) => finding.classification !== "unsafe_unknown")).toBe(true);
    expect(validateBatch12ReadinessRefreshReport(report)).toEqual([]);
  });
});
