import { describe, expect, it } from "vitest";

import {
  buildAnalyticsPanelHydrationReport,
  resolvePanelHydration,
  validateAnalyticsPanelHydrationReport,
} from "@/lib/admin-analytics/panel-hydration-resolver";
import { buildLivePanelEvidenceReport } from "@/lib/release-readiness/live-panel-evidence-resolver";

const scoreDimensions = {
  sourceHealth: 100,
  runtimeHealth: 84.2,
  evidenceCompleteness: 84.6,
  freshness: 91.88,
  costRisk: 42,
  regressionRisk: 86,
};

describe("analytics panel hydration", () => {
  it("classifies source-missing event liveness as actionable instead of collecting", () => {
    const panel = resolvePanelHydration({
      panelId: "drop_opens",
      eventLivenessAudit: {
        classifications: [
          {
            eventName: "drop_preview_opened",
            livenessStatus: "source_missing",
          },
        ],
      },
    });

    expect(panel.hydrationStatus).toBe("source_missing");
    expect(panel.userSafeDisplayState).toBe("show_not_connected");
    expect(panel.canDisplayZero).toBe(false);
  });

  it("keeps external provider payment panels external-required", () => {
    const panel = resolvePanelHydration({ panelId: "payment_approvals" });

    expect(panel.hydrationStatus).toBe("external_required");
    expect(panel.liveEvidenceContribution).toBe("external_or_manual");
    expect(panel.userSafeDisplayState).toBe("show_external_required");
  });

  it("lets runtime signals hydrate panels without showing missing data as zero", () => {
    const report = buildAnalyticsPanelHydrationReport({
      currentHead: "head",
      scoreDimensions,
      runtimeSignals: [
        {
          panelId: "traffic_overview",
          hasData: true,
          sourceLoaded: true,
          lastSeenAt: "2026-05-26T12:00:00.000Z",
        },
      ],
    });

    const traffic = report.panels.find((panel) => panel.panelId === "traffic_overview");
    expect(traffic?.hydrationStatus).toBe("hydrated");
    expect(report.panels.some((panel) => panel.canDisplayZero && panel.hydrationStatus !== "hydrated")).toBe(false);
    expect(validateAnalyticsPanelHydrationReport(report)).toEqual([]);
  });

  it("feeds panel hydration into debug and live evidence", () => {
    const report = buildAnalyticsPanelHydrationReport({
      currentHead: "head",
      scoreDimensions,
      runtimeSignals: [
        {
          panelId: "traffic_overview",
          hasData: true,
          sourceLoaded: true,
        },
      ],
    });
    const livePanelEvidence = buildLivePanelEvidenceReport(report);

    expect(report.debugLane.label).toBe("Analytics panel hydration");
    expect(report.debugLane.totalPanels).toBe(report.totalPanels);
    expect(livePanelEvidence.decisions.length).toBe(report.totalPanels);
    expect(livePanelEvidence.liveEvidencePanelIds).toContain("traffic_overview");
  });
});
