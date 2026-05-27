import { describe, expect, it } from "vitest";

import {
  FRONTEND_TELEMETRY_RULES,
  buildFrontendTelemetryConsolidationReport,
  validateFrontendTelemetryConsolidationReport,
} from "@/lib/frontend-hardening/frontend-telemetry-usage";

describe("frontend telemetry consolidation", () => {
  it("classifies direct component telemetry behind canonical surface helper rules", () => {
    const report = buildFrontendTelemetryConsolidationReport({ currentHead: "test-head" });

    expect(FRONTEND_TELEMETRY_RULES).toContain("Components should call a thin surface telemetry helper, not build raw event objects repeatedly.");
    expect(report.directTelemetryCallsAudited).toBeGreaterThan(0);
    expect(report.directTelemetryCallsReduced).toBeGreaterThan(0);
    expect(report.telemetryOwners).toContain("src/lib/telemetry.ts");
  });

  it("keeps high-frequency and PII telemetry as classified risks", () => {
    const report = buildFrontendTelemetryConsolidationReport({ currentHead: "test-head" });
    const validation = validateFrontendTelemetryConsolidationReport(report);

    expect(report.unsafeUnknowns).toEqual([]);
    expect(validation.failures).toEqual([]);
  });
});
