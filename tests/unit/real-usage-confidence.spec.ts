import { describe, expect, it } from "vitest";

import {
  buildRealUsageConfidenceReport,
  validateRealUsageConfidenceReport,
  type RealUsageConfidenceReport,
} from "@/lib/analytics/real-usage-confidence-engine";

describe("real usage confidence engine", () => {
  it("keeps operator-confirmed usage as context while source telemetry carries confidence", () => {
    const report = buildRealUsageConfidenceReport({
      currentHead: "abc123",
      generatedAtUtc: "2026-05-21T12:00:00.000Z",
      operatorConfirmedEvents: [
        {
          signalId: "purchase_flow_seen",
          eventName: "gumdrops_purchase_completed",
          confirmationSource: "operator_confirmed",
          count: 1,
          sourcePath: "agent/state/operator-revenue-smoke.generated.json",
        },
      ],
      telemetryLaneStatus: {
        purchase: "closed",
        gumdrop_balance: "closed",
        creator_experience: "closed",
        creator_subscription: "closed",
        creator_drop_submission: "closed",
        behavior_signal: "closed",
        page_view: "closed",
      },
      materializerPresence: {
        purchase: true,
        gumdrop_balance: true,
        creator_experience: true,
        creator_subscription: true,
        creator_drop_submission: true,
        behavior_signal: true,
        page_view: true,
      },
      sourceTruthFreshness: "fresh",
      behaviorMathConfidence: "exact",
    });

    expect(report.status).toBe("source_ready_real_usage_confidence");
    expect(report.confidenceScore).toBeGreaterThan(0);
    expect(report.formalGateImpact).toMatchObject({
      clearsFormalProvider: false,
      clearsDeployedRuntime: false,
    });
    expect(report.limits).toEqual(
      expect.arrayContaining([
        "does_not_clear_formal_provider",
        "does_not_clear_deployed_runtime",
      ]),
    );
    expect(report.signals.purchase_flow_seen).toMatchObject({
      status: "source_ready",
      operatorConfirmed: true,
      sourcePath: "agent/state/operator-revenue-smoke.generated.json",
    });
    expect(report.summary.observedSignals).toBe(0);
    expect(report.signals.wallet_flow_source_ready?.status).toBe("source_ready");
    expect(validateRealUsageConfidenceReport(report)).toEqual([]);
  });

  it("does not count unknown usage as source evidence", () => {
    const report = buildRealUsageConfidenceReport({
      currentHead: "abc123",
      generatedAtUtc: "2026-05-21T12:00:00.000Z",
      operatorConfirmedEvents: [
        {
          signalId: "purchase_flow_seen",
          eventName: "gumdrops_purchase_completed",
          confirmationSource: "unknown",
          count: 25,
          sourcePath: "unknown-dashboard",
        },
      ],
      telemetryLaneStatus: { purchase: "closed" },
      materializerPresence: { purchase: true },
      sourceTruthFreshness: "fresh",
      behaviorMathConfidence: "exact",
    });

    expect(report.signals.purchase_flow_seen?.status).toBe("ignored_unknown");
    expect(report.signals.purchase_flow_seen?.confidenceContribution).toBe(0);
    expect(report.ignoredUnknownUsage).toHaveLength(1);
    expect(validateRealUsageConfidenceReport(report)).toEqual([]);
  });

  it("fails validation when a signal lacks a source path or claims typed evidence gates", () => {
    const invalid: RealUsageConfidenceReport = {
      reportKey: "real-usage-confidence",
      generatedAtUtc: "2026-05-21T12:00:00.000Z",
      currentHead: "abc123",
      sourceCommit: "abc123",
      status: "source_ready_real_usage_confidence",
      passed: true,
      productionReadsRequired: false,
      confidenceScore: 80,
      confidenceSignals: ["purchase_flow_seen"],
      evidence: ["confidenceScore=80"],
      limits: [],
      formalGateImpact: {
        clearsFormalProvider: true,
        clearsDeployedRuntime: false,
      },
      ignoredUnknownUsage: [],
      signals: {
        purchase_flow_seen: {
          id: "purchase_flow_seen",
          label: "Purchase flow seen",
          status: "observed",
          telemetryLaneId: "purchase",
          sourcePath: "",
          sourcePathStatus: "validated",
          materializerPresent: true,
          operatorConfirmed: true,
          confidenceContribution: 30,
          evidence: [],
          limitations: [],
          nextAction: "",
        },
        gumdrop_credit_flow_seen: null,
        user_dashboard_seen: null,
        creator_dashboard_seen: null,
        creator_drop_manager_seen: null,
        fan_pass_flow_seen: null,
        broadcast_flow_source_ready: null,
        wallet_flow_source_ready: null,
      },
      summary: {
        observedSignals: 1,
        sourceReadySignals: 0,
        ignoredUnknownUsage: 0,
        confidenceScore: 80,
      },
      nextAction: "Attach provider-backed site activity or deployed route evidence separately.",
    };

    expect(validateRealUsageConfidenceReport(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("must not clear provider-backed site activity evidence"),
        expect.stringContaining("limits must include does_not_clear_formal_provider"),
        expect.stringContaining("purchase_flow_seen lacks source path"),
        expect.stringContaining("purchase_flow_seen lacks next action"),
        expect.stringContaining("purchase_flow_seen turns operator context into observed site activity evidence"),
      ]),
    );
  });
});
