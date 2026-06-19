import { describe, expect, it } from "vitest";

import {
  buildAnalyticsSemanticsFinalLockReport,
  validateAnalyticsSemanticsFinalLockReport,
  type AnalyticsSemanticsFinalLockInputs,
} from "../../scripts/agent/validate-analytics-semantics-final-lock";

function inputsFixture(
  overrides: Partial<AnalyticsSemanticsFinalLockInputs> = {},
): AnalyticsSemanticsFinalLockInputs {
  const inputs: AnalyticsSemanticsFinalLockInputs = {
    currentHead: "head",
    generatedAtUtc: "2026-05-18T15:00:00.000Z",
    identityInventory: {
      reportKey: "analytics-identity-transfer-inventory",
      summary: {
        guestIdentitySources: 2,
        userIdentitySources: 2,
        transferCandidates: 5,
        productTruthSources: 2,
        evidenceOnlySources: 2,
        cloudSqlStatus: "cloud_sql_agent_context_mirror_detected_no_product_runtime_dependency",
        geminiCloudAssistStatus: "vertex_admin_ai_detected_outside_analytics_identity_transfer",
      },
    },
    guestUserTransfer: {
      reportKey: "guest-user-identity-transfer",
      summary: {
        linkHelperCreated: true,
        eventContractIdentityState: true,
        historicalGuestEventsDuplicated: false,
        cloudSqlStatus: "cloud_sql_not_detected_in_transfer_runtime",
        geminiCloudAssistStatus: "gemini_cloud_assist_not_involved",
      },
    },
    legacyRecovery: {
      reportKey: "analytics-legacy-history-reconciliation",
      summary: {
        overwritesCurrentTruth: false,
        evidenceOnlyCount: 1,
      },
      costFindings: [
        { lane: "cloud_sql", status: "cloud_sql_not_used_by_reconciler" },
        { lane: "gemini_cloud_assist", status: "gemini_cloud_assist_not_used" },
      ],
    },
    runtimeWatchTime: {
      reportKey: "runtime-watch-time-v2",
      summary: {
        canonicalModelCreated: true,
        serverDeltaRulesModeled: true,
        integrationStatus: "deferred_source_ready",
        cloudRunCostStatus: "cost_safe_10s_heartbeat_no_request_path_backfill",
        cloudSqlStatus: "cloud_sql_not_detected_in_runtime_watch_v2",
        geminiCloudAssistStatus: "gemini_cloud_assist_not_involved",
        route4xxStatus: "invalid_payload_returns_calm_non_retryable_422",
      },
    },
    publicBetaScore: {
      overallScore: 45,
      readinessStatus: "Stale evidence",
    },
    currentBetaExitStatus: {
      reportKey: "current-beta-exit-status",
      summary: {
        canStartBetaExitReview: false,
        visualEvidenceStatus: "source_only_screenshotEvidenceAttached_false",
        providerSmokeStatus: "missing_formal_evidence",
        runtimeSmokeStatus: "runtime_unverified",
        adminTruthSampleStatus: "missing_or_unknown",
        analyticsSemanticsSourceStatus: "analytics_semantics_source_ready_runtime_proof_required",
      },
      nextExactSteps: [
        "Analytics semantics are source-ready; runtime watch-time accuracy still needs deployed media evidence.",
      ],
    },
  };

  return {
    ...inputs,
    ...overrides,
  };
}

describe("analytics semantics final lock", () => {
  it("fails if runtime watch-time report is missing", () => {
    const report = buildAnalyticsSemanticsFinalLockReport(
      inputsFixture({ runtimeWatchTime: null }),
    );

    expect(validateAnalyticsSemanticsFinalLockReport(report)).toContain(
      "runtime watch-time v2 report must be represented.",
    );
  });

  it("fails if guest-user transfer report is missing", () => {
    const report = buildAnalyticsSemanticsFinalLockReport(
      inputsFixture({ guestUserTransfer: null }),
    );

    expect(validateAnalyticsSemanticsFinalLockReport(report)).toContain(
      "guest-to-user transfer report must be represented.",
    );
  });

  it("keeps beta exit false without runtime, provider, admin, and UI source coverage evidence", () => {
    const report = buildAnalyticsSemanticsFinalLockReport(inputsFixture());

    expect(report.betaScoreImpact.betaExitReady).toBe(false);
    expect(report.betaScoreImpact.runtimeEvidenceComplete).toBe(false);
    expect(validateAnalyticsSemanticsFinalLockReport(report)).toEqual([]);
  });

  it("exposes Cloud Run, Cloud SQL, Gemini, and 4xx cost lanes without marking not detected as pass", () => {
    const report = buildAnalyticsSemanticsFinalLockReport(inputsFixture());

    expect(report.cloudRunCostStatus).toContain("heartbeat");
    expect(report.cloudSqlCostStatus).toContain("not_detected");
    expect(report.geminiCloudAssistStatus).toContain("not_involved");
    expect(report.route4xxStatus).toContain("non_retryable");
    expect(report.cloudSqlCostStatus).not.toMatch(/\bpass(ed)?\b/iu);
  });

  it("distinguishes source-ready analytics from runtime-proven analytics", () => {
    const report = buildAnalyticsSemanticsFinalLockReport(inputsFixture());

    expect(report.runtimeWatchTimeStatus).toContain("source_ready");
    expect(report.runtimeWatchTimeStatus).toContain("runtime_proof_required");
    expect(report.betaScoreImpact.analyticsSemanticsSourceReady).toBe(true);
    expect(report.betaScoreImpact.runtimeEvidenceComplete).toBe(false);
  });
});
