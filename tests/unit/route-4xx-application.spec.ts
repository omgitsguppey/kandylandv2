import { describe, expect, it } from "vitest";

import {
  HIGH_RISK_4XX_ROUTE_FAMILIES,
  buildRoute4xxApplicationReport,
  validateRoute4xxApplicationReport,
} from "@/lib/route-hardening/route-4xx-application";

describe("route 4xx application", () => {
  it("covers high-risk route families without changing payment or GumDrop runtime", () => {
    const report = buildRoute4xxApplicationReport();

    expect(validateRoute4xxApplicationReport(report)).toEqual([]);
    expect(report.paymentRuntimeChanged).toBe(false);
    expect(report.gumdropRuntimeChanged).toBe(false);
    expect(report.defaultDiagnosticMode).toBe("grouped_hourly_rollup");
    expect(HIGH_RISK_4XX_ROUTE_FAMILIES.map((entry) => entry.routeFamily)).toEqual(
      expect.arrayContaining(["wallet_payment_package_selection", "drops_unlock", "analytics_ingest", "admin_debug_admin_analytics"]),
    );
  });
});
