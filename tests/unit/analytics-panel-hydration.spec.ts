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

  it("prefers user parity gaps over global person metric hydration", () => {
    const panel = resolvePanelHydration({
      panelId: "traffic_overview",
      personMetricsHydration: {
        metricStatus: {
          visits: {
            metricId: "visits",
            state: "hydrated",
            count: 4,
            confidence: "exact",
            provenZero: false,
          },
        },
        userParityStatus: {
          visits: {
            metricId: "visits",
            state: "bridge_missing",
            globalCount: 4,
            guestCount: 0,
            signedInCount: 0,
            linkedPersonCount: 0,
            creatorRoleCount: 0,
            provenZero: false,
            blocksUserParity: true,
            debugNextAction: "Global visits exist, but user/person bridge is missing.",
          },
        },
      },
    });

    expect(panel.hydrationStatus).toBe("bridge_missing");
    expect(panel.userSafeDisplayState).toBe("show_not_connected");
    expect(panel.canDisplayZero).toBe(false);
  });

  it("keeps source-ready panel mappings distinct from runtime evidence", () => {
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
    expect(panel.reason).toContain("runtime evidence remains separate");
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

  it("keeps GumDrop balances in protected payment evidence instead of generic source-missing", () => {
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
    expect(adminTruth.nextExactAction).toContain("redacted admin source activity sample");
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
    expect(livePanelEvidence.decisions.find((decision) => decision.panelId === "drop_opens")).toMatchObject({
      status: "source_exists_collecting",
      betaExitImpact: "source_exists_but_not_recent",
    });
    expect(livePanelEvidence.decisions.find((decision) => decision.panelId === "package_selections")).toMatchObject({
      status: "source_exists_collecting",
      betaExitImpact: "source_exists_but_not_recent",
    });
    expect(livePanelEvidence.blockedPanelIds).not.toContain("drop_opens");
    expect(livePanelEvidence.blockedPanelIds).not.toContain("package_selections");
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

  it("uses the central recovery spine for launch-critical source coverage", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");
    const serverSource = readFileSync("src/lib/server/admin-analytics-historical-validation.ts", "utf8");

    expect(source).toContain("buildLaunchCriticalActiveSourceCoverageReport");
    expect(source).toContain("buildLaunchHistorySourceCoverageRowsState");
    expect(serverSource).toContain("buildLaunchHistorySourceCoverageRowsState");
    expect(source).not.toContain("buildLaunchHistoryDayRecoveryStatesFromSources");
    expect(serverSource).not.toContain("buildLaunchHistoryDayRecoveryStatesFromSources");
    expect(source).not.toContain("buildLaunchHistoryDayRecoveryState({");
    expect(serverSource).not.toContain("function buildLaunchHistoryDayCoverage");
    expect(source).toContain("buildLaunchCriticalRecoveryCoverageFromEvidence");
    expect(source).toContain("buildLaunchCriticalActiveSourceReferences");
    expect(source).not.toContain("buildLaunchCriticalObservedEventNamesFromSourceEvidence");
    expect(source).not.toContain("buildLaunchCriticalRecoveredMetricsFromSourceEvidence");
  });

  it("uses the canonical source-agreement classifier instead of local drift logic", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");

    expect(source).toContain("classifySourceAgreementCoverage");
    expect(source).toContain("buildSourceAgreementCoverageSummaryState");
    expect(source).toContain("sourceAgreementSummary.sourceAgreementStatus");
    expect(source).not.toContain("function classifySourceAgreementDisagreements");
    expect(source).not.toContain("sourceAgreementDetail.disagreementCount, 0) > 1");
    expect(source).not.toContain("sourceAgreementDetail.maxDeltaPct, 0) > 25");
  });

  it("keeps launch recovery partial until first-party coverage and source agreement both pass", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");
    const spine = readFileSync("src/lib/analytics/recovery-timeline-spine.ts", "utf8");

    expect(source).toContain("buildLaunchHistoryCoverageSummaryState");
    expect(source).toContain("const launchCoverageSummary = buildLaunchHistoryCoverageSummaryState");
    expect(source).toContain("firstPartyCoverageState: launchCoverageSummary.firstPartyCoverage.state");
    expect(source).toContain("sourceAgreementState,");
    expect(source).not.toContain('const firstPartyCoverageState =');
    expect(source).not.toContain('sourceAgreementState !== "pass"');
    expect(spine).toContain('const sourceAgreementPassed = input.sourceAgreementState === "pass"');
    expect(source).toContain("allLaunchRangeProven");
    expect(source).toContain("buildLaunchRecoverySourceGateState");
    expect(source).toContain("const launchSourceGate = buildLaunchRecoverySourceGateState");
    expect(source).toContain("canClearSourceGate: launchSourceGate.canClearSourceGate");
    expect(source).toContain("sourceGateReason: launchSourceGate.sourceGateReason");
    expect(source).toContain("sourceGateBlockers: launchSourceGate.sourceGateBlockers");
    expect(source).toContain("input.sourceAgreementResult.inputHead");
    expect(source).toContain("sourceAgreementEvidence.inputHead");
    expect(source).toContain("const hasLaunchCoverageInput");
    expect(source).toContain("typeof sourceAgreementHead !== \"string\"");
    expect(source).toContain("sourceAgreementHead !== input.currentHead");
    expect(source).not.toContain("const sourceAgreementHead = input.currentHead");
    expect(source).not.toContain("launchSourceGateCanClear");
    expect(source).not.toContain("const allLaunchRangeProofReason");
    expect(source).toContain("all-launch range evidence exists");
    expect(source).toContain("LAUNCH_ANALYTICS_FIRST_DAY_KEY");
    expect(source).toContain("normalizeLaunchHistoryRangeProofKind");
    expect(source).not.toContain("function publicLaunchRangeSource");
    expect(source).not.toContain('if (coverageWindowKind === "caller_supplied_expected_days" || coverageWindowKind === "local_source_window") return "local_source_window"');
    expect(source).toContain("formalLaunchRange");
    expect(source).toContain("buildFormalLaunchRangeRecoveryState");
    expect(source).toContain("buildLaunchHistoryRangeProofState");
    expect(source).toContain("rangeProof: buildLaunchHistoryRangeProofState");
    expect(source).toContain("localEvidenceDayCount");
    expect(source).toContain("unprovenRanges");
    expect(source).toContain("formalLaunchRange,");
    expect(source).not.toContain("formalRangeStartDayKey: formalLaunchRange.launchStartDayKey");
    expect(source).not.toContain("formalRangeEndDayKey: formalLaunchRange.expectedThroughDayKey");
    expect(source).not.toContain("formalExpectedDayCount: formalLaunchRange.expectedDayCount");
    expect(source).not.toContain("evidenceDayCount: formalLaunchRange.localEvidenceDayCount");
    expect(source).toContain("launch range evidence must expose the formal expected day count.");
    expect(source).toContain("localEvidenceDays: dayCoverage");
    expect(source).toContain("formalLaunchDayCoverage: summarizeRecoveredMetricMetadataCompleteness(formalLaunchRange.dayCoverage)");
    expect(source).not.toContain('sourceCountsKnown: false,');
    expect(source).not.toContain("No approved all-launch evidence covers this day yet; source counts are unknown, not zero.");
    expect(source).not.toContain("listInclusiveDays");
    expect(source).not.toContain("rangeLabel");
    expect(source).toContain("formal launch range must expose one dayCoverage row for every launch day.");
    expect(source).toContain("outside evidence window must use null source counts, not zero.");
    expect(source).toContain("Formal Launch Day Rows");
    expect(source).toContain("formal launch range must list unproven ranges");
    expect(spine).toContain("GA4, historical snapshots, and legacy support remain evidence-only");
    expect(source).toContain('productTruthRole: "primary_product_truth"');
    expect(source).toContain('productTruthRole: "second_source_evidence_only"');
    expect(source).toContain('productTruthRole: "fallback_evidence_only"');
    expect(source).toContain("launch recovery source inventory entries require productTruthRole and promotionRule.");
  });

  it("allows approved all-range export evidence without treating it as formal admin truth", () => {
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

    expect(source).toContain('normalized.startsWith("agent/context/")) return "unrelated_agent_context_file_to_ignore"');
    expect(source).toContain('^\\.agent\\/workflows\\/[a-z0-9-]+\\.md$');
  });

  it("keeps launch recovery day rows actionable instead of top-level-only", () => {
    const source = readFileSync("scripts/agent/validate-analytics-panel-hydration.ts", "utf8");

    expect(source).toContain("missingRangesBySource");
    expect(source).toContain("duplicateRanges");
    expect(source).toContain("productTruthRecoveredDayCount");
    expect(source).toContain("evidenceObservedDayCount");
    expect(source).toContain("sourceTruthState");
    expect(source).toContain("confidenceBand");
    expect(source).toContain("classifyRecoveryMetricConfidenceBand(day.confidenceScore)");
    expect(source).toContain("eventFamilyCoverage");
    expect(source).toContain("activeSourceCoverage");
    expect(source).toContain("targetCoveragePercent: activeSourceCoverage.targetCoveragePercent");
    expect(source).toContain("active source coverage must not clear historical launch evidence");
    expect(source).toContain("buildLaunchCriticalRecoveryCoverageFromEvidence");
    expect(source).toContain("modeled/inferred evidence calibration-only");
    expect(source).toContain("summarizeRecoveredMetricMetadataCompleteness");
    expect(source).toContain("recoveredMetricMetadataCompleteness");
    expect(source).toContain("sourceAgreementDisagreements: summarizeRecoveredMetricMetadataCompleteness(sourceAgreementDisagreements)");
    expect(source).toContain('"sourceAgreementDisagreements"');
    expect(source).toContain("compactLaunchAnalyticsRecoveryReport");
    expect(source).toContain("dayCoverageCount: compactFormalDays.dayCount");
    expect(source).toContain("omittedDayCoverageCount: compactFormalDays.omittedDayCount");
    expect(source).toContain("dayCoverageSummary: compactFormalDays.dayCoverageSummary");
    expect(source).toContain("compactSourceFamilyStates");
    expect(source).toContain("activeSourceFileCount: activeSourceFileSummary.count");
    expect(source).toContain("materializerFileCount: materializerFileSummary.count");
    expect(source).toContain("RECOVERY_METRIC_DEDUPE_RULES");
    expect(source).toContain("RECOVERY_METRIC_MODELING_POLICY");
    expect(source).toContain("RECOVERY_METRIC_POLICY_PROOF_BOUNDARY");
    expect(source).not.toContain('proofBoundary: "policy_metadata_only_not_runtime_provider_or_admin_truth_proof"');
    expect(source).toContain("recoveryPolicy");
    expect(source).toContain("eventIdIsPrimaryWhenPresent");
    expect(source).toContain("fallbackUsesSessionIdentityRouteObjectAndTimestampWindow");
    expect(source).toContain("modeled/visibility evidence policy");
    expect(source).toContain("metadata completeness must stay metadata-only");
    expect(source).toContain("policy metadata must not clear runtime/provider/admin truth gates");
    expect(source).toContain("RECOVERED_METRIC_METADATA_PROOF_BOUNDARY");
    expect(source).not.toContain('proofBoundary: "metadata_completeness_only_not_source_runtime_provider_or_admin_truth_proof"');
    expect(source).toContain("summarizeLaunchRecoveryFamilySourceStates");
    expect(source).toContain("displaySummary sourceWindowLabel must come from the recovery spine coverage window");
    expect(source).toContain("displaySummary sourceRoleCounts must agree with eventFamilyCoverage family source roles");
    expect(source).toContain("displaySummary must expose mathReasonSamples when launch-critical families are missing product truth");
    expect(source).toContain("coveredDayCount: sourceDayCounts.firstParty");
    expect(source).not.toContain("coveredDayCount: firstPartyDays.size");
    expect(source).toContain("collapseLaunchRecoveryDayRanges");
    expect(source).not.toContain("function collapseDayRanges");
    expect(source).toContain("Active source-code coverage");
    expect(source).toContain("Launch-critical observed first-party coverage");
    expect(source).toContain("Recovered metric metadata");
    expect(source).toContain("source-agreement disagreements ${report.recoveredMetricMetadataCompleteness.sourceAgreementDisagreements.status}");
    expect(source).toContain("Recovery policy");
    expect(source).toContain("launch day ${day.dayKey} cannot be product-truth recovered without first-party evidence.");
    expect(source).toContain("## Daily Recovery Rows");
    expect(source).toContain("perDayMetricDeltas");
    expect(source).toContain("Count delta details");
    expect(source).toContain("sourceAgreementMetricDeltas");
    expect(source).toContain("source-agreement count deltas");
    expect(source).toContain("sourceTruthState: typeof entry.sourceTruthState");
  });

  it("keeps analytics truth rebuild summary tied to the canonical recovery display summary", () => {
    const source = readFileSync("scripts/rebuild-analytics-truth.ts", "utf8");

    expect(source).toContain("buildLaunchHistoryDisplaySummaryState");
    expect(source).toContain("const displaySummary = buildLaunchHistoryDisplaySummaryState");
    expect(source).toContain("const sourceAgreementDisagreements = readRecordArray(sourceAgreement.disagreements)");
    expect(source).toContain("const sourceAgreementMetricDeltas = readRecordArray(sourceAgreement.perDayMetricDeltas)");
    expect(source).toContain("summarizeCurrentLaunchRecoveryMetadata");
    expect(source).toContain('status: "not_evaluated_stale_artifact"');
    expect(source).toContain("sourceAgreementMetricDeltas: summarizeCurrentLaunchRecoveryMetadata(artifactCurrent, sourceAgreementMetricDeltas, asRecord(artifactMetadataCompleteness.sourceAgreementMetricDeltas))");
    expect(source).toContain("readLaunchRecoveryDaySummary");
    expect(source).toContain("const artifactMetadataCompleteness = asRecord(report.recoveredMetricMetadataCompleteness)");
    expect(source).toContain("asRecord(artifactMetadataCompleteness.formalLaunchDayCoverage)");
    expect(source).toContain("sourceWindowLabel");
    expect(source).toContain("mathReasonSamples: (displaySummary.mathReasonSamples ?? [])");
    expect(source).not.toContain("asRecord(launchHistoryCoverage.displaySummary)");
    expect(source).not.toContain("readRecordArray(displaySummary.mathReasonSamples)");
    expect(source).not.toContain("Launch evidence window since ${");
    expect(source).not.toContain("Launch history recovered since ${");
  });
});
