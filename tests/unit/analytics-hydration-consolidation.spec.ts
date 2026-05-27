import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildAnalyticsPanelHydrationReport,
  resolveAllPanelHydration,
} from "@/lib/admin-analytics/panel-hydration-resolver";

const scoreDimensions = {
  sourceHealth: 100,
  runtimeHealth: 84.2,
  evidenceCompleteness: 84.6,
  freshness: 91.88,
  costRisk: 42,
  regressionRisk: 86,
};

function lineCount(path: string) {
  return readFileSync(path, "utf8").split(/\r?\n/u).length;
}

describe("analytics hydration consolidation", () => {
  it("keeps the panel registry as a derived adapter instead of a static duplicate registry", () => {
    const source = readFileSync("src/lib/admin-analytics/panel-hydration-registry.ts", "utf8");

    expect(source).toContain("PERSON_METRIC_DEFINITIONS");
    expect(source).toContain("derivePanelFromPersonMetric");
    expect(source).not.toContain("expectedEvents: [");
    expect(lineCount("src/lib/admin-analytics/panel-hydration-registry.ts")).toBeLessThanOrEqual(260);
  });

  it("keeps the generated hydration report compact while retaining panel lookup", () => {
    const report = buildAnalyticsPanelHydrationReport({
      currentHead: "head",
      scoreDimensions,
      runtimeSignals: [{ panelId: "traffic_overview", hasData: true, sourceLoaded: true }],
    });

    expect(report.panelStatus.traffic_overview.hydrationStatus).toBe("hydrated");
    expect(report.topPanelHydrationFailures.length).toBeLessThanOrEqual(10);
    expect("panels" in report).toBe(false);
  });

  it("still covers every panel through resolver drilldown records", () => {
    const records = resolveAllPanelHydration({ scoreDimensions });

    expect(records).toHaveLength(41);
    expect(records.some((panel) => panel.panelId === "payment_approvals" && panel.hydrationStatus === "external_required")).toBe(true);
    expect(records.some((panel) => panel.canDisplayZero && panel.hydrationStatus !== "hydrated")).toBe(false);
  });
});
