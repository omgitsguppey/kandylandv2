import { describe, expect, it } from "vitest";

import {
  buildOrphanMetricRegistry,
  validateOrphanMetricRegistry,
  type OrphanMetricRegistryItem,
} from "@/lib/debug/orphan-metric-registry";
import {
  buildMonolithRiskRegistry,
  validateMonolithRiskRegistry,
  type MonolithRiskRegistryItem,
} from "@/lib/debug/monolith-risk-registry";

describe("monolith and orphan metric registry", () => {
  it("maps telemetry metrics from producer to UI and evidence consumers", () => {
    const registry = buildOrphanMetricRegistry();
    const pageViews = registry.find((item) => item.metricId === "page_views");

    expect(pageViews).toMatchObject({
      displayLabel: "Page views",
      producer: expect.stringContaining("DeepTracker"),
      persistenceSource: expect.stringContaining("analytics_event_facts"),
      uiConsumer: expect.stringContaining("Admin Analytics"),
      scoreEvidenceConsumer: expect.stringContaining("telemetry dependency graph"),
      owner: "analytics",
      orphanStatus: "linked",
    });

    expect(registry.every((item) => item.nextAction.length > 0)).toBe(true);
    expect(validateOrphanMetricRegistry(registry)).toEqual([]);
  });

  it("keeps source-ready metrics from appearing healthy when runtime evidence is missing", () => {
    const registry = buildOrphanMetricRegistry();
    const runtimeWatch = registry.find((item) => item.metricId === "runtime_watch_time");

    expect(runtimeWatch).toMatchObject({
      freshness: "runtime_unverified",
      orphanStatus: "source_ready_evidence_gap",
      debugPanelHealthClaim: "degraded",
    });
  });

  it("rejects UI metrics without a producer or source marker", () => {
    const invalid: OrphanMetricRegistryItem[] = [
      {
        metricId: "floating_metric",
        displayLabel: "Floating metric",
        producer: "",
        persistenceSource: "",
        materializer: "none",
        apiRoute: "/api/admin/debug",
        uiConsumer: "Admin Debug card",
        scoreEvidenceConsumer: "",
        freshness: "current",
        owner: "admin-debug",
        orphanStatus: "ui_without_source",
        debugPanelHealthClaim: "healthy",
        nextAction: "",
      },
    ];

    expect(validateOrphanMetricRegistry(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("floating_metric lacks producer/source"),
        expect.stringContaining("floating_metric appears healthy"),
        expect.stringContaining("floating_metric lacks next action"),
      ]),
    );
  });

  it("tracks high-risk monoliths with owners, split plans, routes, and linked metrics", () => {
    const registry = buildMonolithRiskRegistry();
    const debugRoute = registry.find((item) => item.filePath === "src/app/api/admin/debug/route.ts");

    expect(debugRoute).toMatchObject({
      owner: "admin-debug",
      riskLevel: "critical",
      linkedRoutes: ["/api/admin/debug"],
      linkedMetrics: expect.arrayContaining(["admin_debug_evidence", "runtime_watch_time"]),
    });
    expect(debugRoute?.splitRecommendation).toContain("section-specific");
    expect(debugRoute?.nextAction).toContain("drilldown");
    expect(validateMonolithRiskRegistry(registry)).toEqual([]);
  });

  it("rejects high-risk monoliths without a split plan or next action", () => {
    const invalid: MonolithRiskRegistryItem[] = [
      {
        filePath: "src/app/api/admin/debug/route.ts",
        lineCount: 6371,
        domainsMixed: ["admin-debug", "telemetry"],
        riskLevel: "critical",
        splitRecommendation: "",
        owner: "",
        linkedMetrics: [],
        linkedRoutes: [],
        nextAction: "",
      },
    ];

    expect(validateMonolithRiskRegistry(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("src/app/api/admin/debug/route.ts lacks owner"),
        expect.stringContaining("src/app/api/admin/debug/route.ts lacks split recommendation"),
        expect.stringContaining("src/app/api/admin/debug/route.ts lacks next action"),
      ]),
    );
  });
});
