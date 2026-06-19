import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildAnalyticsPanelHydrationReport,
  resolveAllPanelHydration,
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

function lineCount(path: string) {
  return readFileSync(path, "utf8").split(/\r?\n/u).length;
}

describe("analytics panel hydration", () => {
  it("keeps the panel registry derived instead of rebuilding a static duplicate registry", () => {
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
    expect(records.some((panel) => panel.panelId === "payment_approvals" && panel.hydrationStatus === "provider_gated")).toBe(true);
    expect(records.some((panel) => panel.canDisplayZero && panel.hydrationStatus !== "hydrated")).toBe(false);
  });

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

  it("keeps expected but unobserved panels visible without calling them disconnected", () => {
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
    expect(panel.liveEvidenceContribution).toBe("source_exists_collecting");
    expect(panel.userSafeDisplayState).toBe("show_no_recent_activity");
    expect(panel.nextExactAction).toContain("no recent activity");
  });

  it("keeps external provider payment panels external-required", () => {
    const panel = resolvePanelHydration({ panelId: "payment_approvals" });

    expect(panel.hydrationStatus).toBe("provider_gated");
    expect(panel.liveEvidenceContribution).toBe("formal_evidence_required");
    expect(panel.userSafeDisplayState).toBe("show_external_required");
  });

  it("keeps GumDrop balances in protected payment proof instead of generic source-missing", () => {
    const panel = resolvePanelHydration({ panelId: "gumdrop_balances" });

    expect(panel.hydrationStatus).toBe("protected_payment_required");
    expect(panel.liveEvidenceContribution).toBe("formal_evidence_required");
    expect(panel.userSafeDisplayState).toBe("show_external_required");
    expect(panel.nextExactAction).toContain("payment");
  });

  it("splits runtime and admin truth evidence needs without manual-proof buckets", () => {
    const runtime = resolvePanelHydration({ panelId: "error_rate_4xx" });
    const adminTruth = resolvePanelHydration({ panelId: "creator_count" });
    const externalCost = resolvePanelHydration({ panelId: "cost_risk" });
    const report = buildAnalyticsPanelHydrationReport({ currentHead: "head", scoreDimensions });

    expect(runtime.hydrationStatus).toBe("runtime_evidence_required");
    expect(runtime.liveEvidenceContribution).toBe("formal_evidence_required");
    expect(runtime.userSafeDisplayState).toBe("show_not_connected");
    expect(runtime.reason).toContain("route or debug runtime evidence");
    expect(adminTruth.hydrationStatus).toBe("admin_truth_source_required");
    expect(adminTruth.nextExactAction).toContain("redacted admin truth source sample");
    expect(externalCost.hydrationStatus).toBe("external_required");
    expect(report.runtimeEvidenceRequiredPanels).toBeGreaterThan(0);
    expect(report.adminTruthSourceRequiredPanels).toBeGreaterThan(0);
    expect(report.liveEvidenceContribution.runtimeEvidenceRequired).toContain("error_rate_4xx");
    expect(report.liveEvidenceContribution.adminTruthSourceRequired).toContain("creator_count");
    expect(report.liveEvidenceContribution.externalRequired).toContain("cost_risk");
    expect(report.liveEvidenceContribution.externalRequired).not.toContain("error_rate_4xx");
    expect(report.debugLane.runtimeEvidenceRequired).toBe(report.runtimeEvidenceRequiredPanels);
    expect(report.debugLane.adminTruthSourceRequired).toBe(report.adminTruthSourceRequiredPanels);
    expect(report).not.toHaveProperty("manualOrRuntimeRequiredPanels");
    expect(report.debugLane).not.toHaveProperty("manualOrRuntimeRequired");
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

  it("builds launch recovery from source agreement in-process instead of a generated report hop", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");
    const agreementIndex = source.indexOf("buildLaunchSourceAgreementDetail();");
    const recoveryIndex = source.indexOf("buildLaunchAnalyticsRecoveryReport({");

    expect(agreementIndex).toBeGreaterThanOrEqual(0);
    expect(recoveryIndex).toBeGreaterThan(agreementIndex);
    expect(source).not.toContain('readJson("agent/state/source-agreement-failure-detail.generated.json")');
    expect(source).not.toContain("validateSourceAgreementFailureDetail();");
  });

  it("uses the canonical source-agreement classifier instead of local drift logic", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");

    expect(source).toContain("classifySourceAgreementCoverage");
    expect(source).not.toContain("function classifySourceAgreementDisagreements");
  });

  it("keeps launch recovery partial until first-party coverage and source agreement both pass", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");

    expect(source).toContain('firstPartyCoverageState !== "available"');
    expect(source).toContain('sourceAgreementState !== "pass"');
    expect(source).toContain("allLaunchRangeProven");
    expect(source).toContain("launchSourceGateCanClear");
    expect(source).toContain('canClearSourceGate: launchSourceGateCanClear');
    expect(source).toContain("all-launch range proof exists");
    expect(source).toContain("GA4, historical snapshots, and legacy support remain evidence-only");
    expect(source).toContain('productTruthRole: "primary_product_truth"');
    expect(source).toContain('productTruthRole: "second_source_evidence_only"');
    expect(source).toContain('productTruthRole: "fallback_evidence_only"');
    expect(source).toContain("launch recovery source inventory entries require productTruthRole and promotionRule.");
  });

  it("allows approved all-range export proof without treating it as formal admin truth", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");

    expect(source).toContain('"all_range_historical_export"');
    expect(source).toContain("approved all-range historical export");
    expect(source).toContain("formal admin truth sample or approved all-range historical export");
    expect(source).toContain("canClearAdminTruthGate: false");
  });

  it("surfaces legacy purgatory in launch recovery without making it product truth", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");

    expect(source).toContain("compactLegacyRecoverySummary");
    expect(source).toContain("classifyGeneratedArtifactFromGit");
    expect(source).toContain("legacyRecoveryOwnedSourcePaths");
    expect(source).toContain("current_by_impact");
    expect(source).toContain("analytics-legacy-purgatory-queue.generated.json");
    expect(source).toContain("currentTotalsEligibleCount");
    expect(source).toContain("productTruthEligibleCount");
    expect(source).toContain("historical_evidence_only");
    expect(source).toContain("legacy recovery cannot mark purgatory rows current/product-truth eligible");
    expect(source).toContain("## Legacy Recovery Queue");
    expect(source).toContain("Legacy, historical snapshot, and GA4 evidence can explain gaps or seed manual review only.");
  });

  it("does not treat optimized task context churn as an analytics artifact to commit", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");

    expect(source).toContain('agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore"');
  });

  it("keeps launch recovery day rows actionable instead of top-level-only", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");

    expect(source).toContain("missingRangesBySource");
    expect(source).toContain("duplicateRanges");
    expect(source).toContain("## Daily Recovery Rows");
    expect(source).toContain("perDayMetricDeltas");
    expect(source).toContain("Count delta details");
  });
});
