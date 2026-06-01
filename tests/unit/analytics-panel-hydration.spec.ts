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

  it("keeps source-ready panel mappings distinct from runtime proof", () => {
    const panel = resolvePanelHydration({
      panelId: "package_selections",
      eventLivenessAudit: {
        classifications: [
          {
            eventName: "purchase_package_selected",
            livenessStatus: "source_ready_waiting_for_activity",
          },
        ],
      },
    });

    expect(panel.hydrationStatus).toBe("source_ready_waiting_for_activity");
    expect(panel.liveEvidenceContribution).toBe("source_exists_collecting");
    expect(panel.reason).toContain("not runtime proof");
    expect(panel.canDisplayZero).toBe(false);
  });

  it("keeps expected but unobserved panels actionable without calling them source-missing", () => {
    const panel = resolvePanelHydration({
      panelId: "drop_opens",
      eventLivenessAudit: {
        classifications: [
          {
            eventName: "drop_preview_opened",
            livenessStatus: "not_observed_but_expected",
          },
        ],
      },
    });

    expect(panel.hydrationStatus).toBe("not_observed_but_expected");
    expect(panel.liveEvidenceContribution).toBe("actionable_gap");
    expect(panel.userSafeDisplayState).toBe("show_not_connected");
  });

  it("keeps external provider payment panels external-required", () => {
    const panel = resolvePanelHydration({ panelId: "payment_approvals" });

    expect(panel.hydrationStatus).toBe("provider_gated");
    expect(panel.liveEvidenceContribution).toBe("external_or_manual");
    expect(panel.userSafeDisplayState).toBe("show_external_required");
  });

  it("keeps GumDrop balances in protected payment proof instead of generic source-missing", () => {
    const panel = resolvePanelHydration({ panelId: "gumdrop_balances" });

    expect(panel.hydrationStatus).toBe("protected_payment_required");
    expect(panel.liveEvidenceContribution).toBe("external_or_manual");
    expect(panel.userSafeDisplayState).toBe("show_external_required");
    expect(panel.nextExactAction).toContain("payment");
  });

  it("maps journey funnel to the existing admin snapshot materializer instead of a stale source path", () => {
    const panel = resolvePanelHydration({ panelId: "journey_funnel" });

    expect(panel.hydrationStatus).toBe("source_ready_waiting_for_activity");
    expect(panel.sourcePath).toBe("src/app/api/admin/analytics/historical/route.ts");
    expect(panel.materializerPath).toBe("admin_analytics_materializers:journey_funnel");
    expect(panel.reason).toContain("canonical");
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

    const traffic = report.panelStatus.traffic_overview;
    expect(traffic?.hydrationStatus).toBe("hydrated");
    expect(Object.values(report.panelStatus).some((panel) => panel.canDisplayZero && panel.hydrationStatus !== "hydrated")).toBe(false);
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
    expect(report.debugLane.sourceReadyWaitingForActivity).toBeGreaterThanOrEqual(0);
    expect(livePanelEvidence.decisions.length).toBe(report.totalPanels);
    expect(livePanelEvidence.liveEvidencePanelIds).toContain("traffic_overview");
  });
});
