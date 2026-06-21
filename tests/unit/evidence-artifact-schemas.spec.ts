import { describe, expect, it } from "vitest";

import {
  REQUIRED_PROVIDER_SMOKE_CHECKS,
  validateProviderSmokeEvidenceDocument,
} from "../../scripts/agent/validate-provider-smoke-evidence";
import {
  REQUIRED_RUNTIME_SMOKE_CHECKS,
  validateRuntimeSmokeEvidenceDocument,
} from "../../scripts/agent/validate-runtime-smoke-evidence";
import {
  adminTruthSampleEvidenceStaleReasons,
  adminTruthSampleLaunchHistoryCoverageFailures,
  adminTruthSampleReadinessImpact,
  validateAdminTruthSampleEvidenceDocument,
} from "../../scripts/agent/validate-admin-truth-sample-evidence";
import {
  buildLaunchHistoryCoverageLocalExportDocument,
  buildLaunchHistoryCoverageReadinessForEvidence,
  resolveEvidenceCaptureMode,
} from "../../scripts/agent/capture-truthful-evidence";

describe("evidence artifact schemas", () => {
  it("keeps truthful evidence capture source-safe unless runtime smoke is explicit", () => {
    expect(resolveEvidenceCaptureMode([])).toEqual({
      runtime: false,
      admin: true,
      launchCoverageInputPath: "",
      launchCoverageOutputPath: "agent/evidence/launch-analytics/launch-history-coverage.local.json",
      reason: "source_safe_default",
    });
    expect(resolveEvidenceCaptureMode(["--admin-truth"])).toEqual({
      runtime: false,
      admin: true,
      launchCoverageInputPath: "",
      launchCoverageOutputPath: "agent/evidence/launch-analytics/launch-history-coverage.local.json",
      reason: "explicit_lane",
    });
    expect(resolveEvidenceCaptureMode(["--runtime-smoke"])).toEqual({
      runtime: true,
      admin: false,
      launchCoverageInputPath: "",
      launchCoverageOutputPath: "agent/evidence/launch-analytics/launch-history-coverage.local.json",
      reason: "explicit_lane",
    });
    expect(resolveEvidenceCaptureMode(["--all"])).toEqual({
      runtime: true,
      admin: true,
      launchCoverageInputPath: "",
      launchCoverageOutputPath: "agent/evidence/launch-analytics/launch-history-coverage.local.json",
      reason: "explicit_all",
    });
    expect(resolveEvidenceCaptureMode(["--launch-coverage-from", "tmp/export.json"])).toEqual({
      runtime: false,
      admin: false,
      launchCoverageInputPath: "tmp/export.json",
      launchCoverageOutputPath: "agent/evidence/launch-analytics/launch-history-coverage.export.json",
      reason: "explicit_launch_coverage_export",
    });
  });

  it("builds a compact launch coverage artifact from an approved redacted historical route export", () => {
    const document = buildLaunchHistoryCoverageLocalExportDocument({
      currentHead: "head-a",
      analyticsSourceHealth: {
        launchHistoryCoverage: {
          rangeStartDayKey: "2026-02-12",
          rangeEndDayKey: "2026-02-13",
          rangeProof: {
            expectedRangeSource: "approved_all_launch_export",
            coverageWindowKind: "all_range_historical_export",
            allLaunchRangeProven: true,
            reason: "Approved redacted all-range historical export.",
          },
          eventFamilyCoverage: {
            canonicalMappedFamilyCount: 13,
            canonicalMappingCoveragePercent: 100,
            observedFirstPartyFamilyCount: 2,
            observedFirstPartyCoveragePercent: 15.4,
            sourceCoverageStatus: "blocked",
            holdbackValidation: {
              observedFirstPartyRequired: true,
              modeledOrInferredCanCalibrateOnly: true,
              requiredObservedFirstPartyFamilyCount: 13,
              observedFirstPartyFamilyGapCount: 11,
              status: "blocked",
            },
            familySourceStates: [
              {
                familyId: "page_view",
                observedFirstParty: true,
                sourceCoverageState: "observed_first_party",
                sourceRole: "product_truth",
                strongestSourceTruth: "first_party_event_fact",
                strongestEvidenceKind: "observed",
                confidenceBand: "verified",
                productTruthEligible: true,
                nextAction: "Use first-party truth.",
              },
              {
                familyId: "purchase",
                observedFirstParty: false,
                sourceCoverageState: "source_missing",
                sourceRole: "missing_source",
                strongestSourceTruth: "source_missing",
                strongestEvidenceKind: "missing",
                confidenceBand: "missing",
                productTruthEligible: false,
                nextAction: "Recover server purchase facts.",
              },
            ],
          },
          days: [
            {
              dayKey: "2026-02-12",
              expected: true,
              sourceCounts: { first_party: 12, ga4: 11, historicalSnapshot: 0, legacySupport: 0 },
              internalAdminExcludedCount: 1,
            },
            {
              dayKey: "2026-02-13",
              expected: true,
              sourceCounts: { first_party: 9, ga4: 10, historicalSnapshot: 0, legacySupport: 0 },
              internalAdminExcludedCount: 0,
            },
          ],
        },
      },
      rawUserEmail: "must-not-survive@example.test",
    }, {
      generatedAtUtc: "2026-02-13T18:00:00.000Z",
      sourceInputPath: "local/admin-historical-export.redacted.json",
      sourceInputHead: "head-a",
    });

    expect(document).toMatchObject({
      status: "complete",
      surface: "launch_analytics_recovery",
      source: "redacted_local_historical_route_export",
      sourceCommit: "head-a",
      redaction: {
        rawUserIdentifiersIncluded: false,
        rawPaymentDetailsIncluded: false,
        secretsIncluded: false,
      },
      launchHistoryCoverage: {
        rangeStartDayKey: "2026-02-12",
        rangeEndDayKey: "2026-02-13",
        expectedDayCount: 2,
        recoveredDayCount: 2,
        rangeProof: {
          coverageWindowKind: "all_range_historical_export",
          allLaunchRangeProven: true,
        },
      },
    });
    expect(JSON.stringify(document)).not.toContain("must-not-survive");
    expect(document.launchHistoryCoverage.days).toHaveLength(2);
    expect(document.launchHistoryCoverage.days[0]?.sourceCounts.first_party).toBe(12);
    expect(document.launchHistoryCoverage.eventFamilyCoverage).toMatchObject({
      canonicalMappedFamilyCount: 13,
      observedFirstPartyFamilyCount: 2,
      sourceCoverageStatus: "blocked",
      holdbackValidation: {
        observedFirstPartyRequired: true,
        observedFirstPartyFamilyGapCount: 11,
      },
      familySourceStates: [
        expect.objectContaining({
          familyId: "page_view",
          observedFirstParty: true,
          productTruthEligible: true,
        }),
        expect.objectContaining({
          familyId: "purchase",
          sourceCoverageState: "source_missing",
        }),
      ],
    });
  });

  it("converts an all-range admin historical route response into a local launch export", () => {
    const document = buildLaunchHistoryCoverageLocalExportDocument({
      analyticsSourceHealth: {
        launchHistoryCoverage: {
          rangeStartDayKey: "2026-02-12",
          rangeEndDayKey: "2026-02-13",
          rangeProof: {
            expectedRangeSource: "all_range_historical_route",
            coverageWindowKind: "all_range_historical_route",
            allLaunchRangeProven: true,
            reason: "All-time historical route coverage is bounded by recovered first-party days and source agreement passed.",
          },
          days: [
            {
              dayKey: "2026-02-12",
              expected: true,
              sourceCounts: { firstParty: 12, ga4: 11, historical_snapshot: 2, legacy_support: 1 },
              internalAdminExcludedCount: 1,
            },
            {
              dayKey: "2026-02-13",
              expected: true,
              sourceCounts: { firstParty: 9, googleAnalytics: 10, historicalSnapshot: 2, legacySupport: 1 },
              internalAdminExcludedCount: 0,
            },
          ],
        },
      },
    }, {
      generatedAtUtc: "2026-02-13T18:00:00.000Z",
      sourceInputPath: "local/admin-historical-route.redacted.json",
    });

    expect(document.launchHistoryCoverage.rangeProof).toMatchObject({
      expectedRangeSource: "approved_all_launch_export",
      coverageWindowKind: "all_range_historical_export",
      allLaunchRangeProven: true,
    });
    expect(document.launchHistoryCoverage.days[0]?.sourceCounts).toEqual({
      first_party: 12,
      ga4: 11,
      historicalSnapshot: 2,
      legacySupport: 1,
    });
    expect(document.launchHistoryCoverage.days[1]?.sourceCounts.ga4).toBe(10);
  });

  it("rejects short launch exports that claim current all-range proof", () => {
    expect(() => buildLaunchHistoryCoverageLocalExportDocument({
      analyticsSourceHealth: {
        launchHistoryCoverage: {
          rangeStartDayKey: "2026-02-12",
          rangeEndDayKey: "2026-02-13",
          rangeProof: {
            expectedRangeSource: "approved_all_launch_export",
            coverageWindowKind: "all_range_historical_export",
            allLaunchRangeProven: true,
            reason: "Short export must not clear current launch history.",
          },
          days: [
            {
              dayKey: "2026-02-12",
              expected: true,
              sourceCounts: { first_party: 12, ga4: 11, historicalSnapshot: 0, legacySupport: 0 },
            },
            {
              dayKey: "2026-02-13",
              expected: true,
              sourceCounts: { first_party: 9, ga4: 10, historicalSnapshot: 0, legacySupport: 0 },
            },
          ],
        },
      },
    }, {
      generatedAtUtc: "2026-06-20T18:00:00.000Z",
      sourceInputPath: "local/admin-historical-route.redacted.json",
    })).toThrow(/does not prove the full February-to-current launch range/u);
  });

  it("rejects launch coverage exports that only prove a local evidence window", () => {
    expect(() => buildLaunchHistoryCoverageLocalExportDocument({
      launchHistoryCoverage: {
        rangeStartDayKey: "2026-02-12",
        rangeEndDayKey: "2026-02-12",
        rangeProof: {
          expectedRangeSource: "fixture_only_local_window",
          coverageWindowKind: "fixture_only_local_window",
          allLaunchRangeProven: true,
          reason: "Local fixture only.",
        },
        days: [
          {
            dayKey: "2026-02-12",
            expected: true,
            sourceCounts: { first_party: 1, ga4: 1, historicalSnapshot: 0, legacySupport: 0 },
          },
        ],
      },
    }, {
      generatedAtUtc: "2026-06-20T18:00:00.000Z",
      sourceInputPath: "local/window.json",
    })).toThrow(/does not prove the full February-to-current launch range/u);
  });

  it("requires provider smoke PayPal, GumDrop, and creator spend checks", () => {
    const checks = REQUIRED_PROVIDER_SMOKE_CHECKS
      .filter((id) => id !== "paid-bonus-purchased-balance")
      .map((id) => ({ id, status: "pass", artifactPath: "agent/evidence/provider-smoke/sample.redacted.json", notes: "" }));

    const failures = validateProviderSmokeEvidenceDocument(
      {
        status: "complete",
        capturedAtUtc: "2026-05-17T05:30:00.000Z",
        provider: "paypal",
        environment: "sandbox",
        checks,
        redactions: ["tokens"],
        operatorNotes: "",
      },
      { requireComplete: true, existingPaths: new Set(["agent/evidence/provider-smoke/sample.redacted.json"]) },
    );

    expect(failures).toContain('provider smoke complete evidence must include check "paid-bonus-purchased-balance".');
  });

  it("rejects raw provider secrets in provider smoke evidence", () => {
    const failures = validateProviderSmokeEvidenceDocument(
      {
        status: "complete",
        capturedAtUtc: "2026-05-17T05:30:00.000Z",
        provider: "paypal",
        environment: "sandbox",
        access_token: "paypal_access_token_should_not_be_written",
        checks: REQUIRED_PROVIDER_SMOKE_CHECKS.map((id) => ({
          id,
          status: "pass",
          artifactPath: "agent/evidence/provider-smoke/sample.redacted.json",
          notes: "",
        })),
        redactions: ["tokens"],
        operatorNotes: "",
      },
      { requireComplete: true, existingPaths: new Set(["agent/evidence/provider-smoke/sample.redacted.json"]) },
    );

    expect(failures).toContain("provider smoke evidence must not include raw secrets or provider tokens.");
  });

  it("requires runtime smoke route and no-provider-call checks", () => {
    const checks = REQUIRED_RUNTIME_SMOKE_CHECKS
      .filter((route) => route !== "no-provider-calls")
      .map((route) => ({ route, status: "pass", artifactPath: "agent/evidence/runtime-smoke/sample.json", notes: "" }));

    const failures = validateRuntimeSmokeEvidenceDocument(
      {
        status: "complete",
        capturedAtUtc: "2026-05-17T05:30:00.000Z",
        appBaseUrl: "https://example.test",
        environment: "preview",
        checks,
        redactions: ["none"],
        operatorNotes: "",
      },
      { requireComplete: true, existingPaths: new Set(["agent/evidence/runtime-smoke/sample.json"]) },
    );

    expect(failures).toContain('runtime smoke complete evidence must include check "no-provider-calls".');
  });

  it("requires admin truth source freshness, redactions, and artifact path for complete evidence", () => {
    const failures = validateAdminTruthSampleEvidenceDocument(
      {
        status: "complete",
        capturedAtUtc: "2026-05-17T05:30:00.000Z",
        surface: "admin_truth_sample",
        artifactPath: "agent/evidence/admin-truth-sample/sample.redacted.json",
        sourceFreshnessUtc: "",
        redactions: [],
        checks: [{ id: "source-freshness", status: "pass", notes: "" }],
        operatorNotes: "",
      },
      { requireComplete: true, existingPaths: new Set() },
    );

    expect(failures).toContain("admin truth complete evidence must include sourceFreshnessUtc.");
    expect(failures).toContain("admin truth complete evidence must include at least one redaction entry.");
    expect(failures).toContain("admin truth complete evidence artifactPath must exist.");
  });

  it("marks old admin truth samples stale instead of current formal proof", () => {
    const reasons = adminTruthSampleEvidenceStaleReasons(
      {
        status: "complete",
        capturedAtUtc: "2026-05-17T05:30:00.000Z",
        currentHead: "old-head",
        surface: "admin_truth_sample",
        artifactPath: "agent/evidence/admin-truth-sample/sample.redacted.json",
        sourceFreshnessUtc: "2026-05-17T05:30:00.000Z",
        redactions: ["none"],
        checks: [
          { id: "source-freshness", status: "pass", notes: "" },
          { id: "sample-count", status: "pass", notes: "" },
          { id: "source-state-label", status: "pass", notes: "" },
          { id: "redacted-artifact-attached", status: "pass", notes: "" },
        ],
      },
      {
        currentHead: "new-head",
        nowUtc: "2026-05-19T06:00:00.000Z",
        maxAgeHours: 24,
      },
    );

    expect(reasons).toEqual(expect.arrayContaining([
      "admin truth evidence currentHead old-head does not match new-head.",
      "admin truth sourceFreshnessUtc is older than 24h or missing.",
    ]));
  });

  it("allows current fresh admin truth samples to clear freshness checks", () => {
    const reasons = adminTruthSampleEvidenceStaleReasons(
      {
        status: "complete",
        capturedAtUtc: "2026-05-19T05:30:00.000Z",
        currentHead: "same-head",
        surface: "admin_truth_sample",
        artifactPath: "agent/evidence/admin-truth-sample/sample.redacted.json",
        sourceFreshnessUtc: "2026-05-19T05:30:00.000Z",
        redactions: ["none"],
        checks: [
          { id: "source-freshness", status: "pass", notes: "" },
          { id: "sample-count", status: "pass", notes: "" },
          { id: "source-state-label", status: "pass", notes: "" },
          { id: "redacted-artifact-attached", status: "pass", notes: "" },
        ],
      },
      {
        currentHead: "same-head",
        nowUtc: "2026-05-19T06:00:00.000Z",
        maxAgeHours: 24,
      },
    );

    expect(reasons).toEqual([]);
  });

  it("labels missing or incomplete admin truth samples as external proof requirements", () => {
    expect(adminTruthSampleReadinessImpact({ status: "missing", passingArtifacts: [] })).toMatchObject({
      phaseOneStatusCap: "External proof required",
      truthState: "admin_truth_sample_missing",
      actionState: "attach_admin_truth_sample",
      canClearAdminTruthGate: false,
      canClearRuntimeGate: false,
      canClearProviderGate: false,
    });

    expect(adminTruthSampleReadinessImpact({ status: "incomplete", passingArtifacts: [] })).toMatchObject({
      phaseOneStatusCap: "External proof required",
      truthState: "admin_truth_sample_incomplete",
      actionState: "repair_incomplete_sample",
      canClearAdminTruthGate: false,
    });
  });

  it("keeps launch-history coverage proof separate from general admin truth samples", () => {
    const generalSample = {
      status: "complete",
      capturedAtUtc: "2026-05-19T05:30:00.000Z",
      currentHead: "same-head",
      surface: "admin_truth_sample",
      artifactPath: "agent/evidence/admin-truth-sample/sample.redacted.json",
      sourceFreshnessUtc: "2026-05-19T05:30:00.000Z",
      redactions: ["no raw user data"],
      checks: [
        { id: "source-freshness", status: "pass", notes: "" },
        { id: "sample-count", status: "pass", notes: "" },
        { id: "source-state-label", status: "pass", notes: "" },
        { id: "redacted-artifact-attached", status: "pass", notes: "" },
      ],
    };

    expect(validateAdminTruthSampleEvidenceDocument(
      generalSample,
      { requireComplete: true, existingPaths: new Set(["agent/evidence/admin-truth-sample/sample.redacted.json"]) },
    )).toEqual([]);
    expect(adminTruthSampleLaunchHistoryCoverageFailures(generalSample)).toEqual([]);

    const falseLaunchClaim = {
      ...generalSample,
      checks: [
        ...generalSample.checks,
        { id: "launch-history-coverage", status: "pass", notes: "" },
      ],
      launchHistoryCoverage: {
        rangeStartDayKey: "2026-02-12",
        rangeEndDayKey: "2026-02-12",
        expectedDayCount: 1,
        days: [],
        rangeProof: {
          allLaunchRangeProven: false,
        },
      },
    };

    expect(adminTruthSampleLaunchHistoryCoverageFailures(falseLaunchClaim)).toEqual(expect.arrayContaining([
      "admin truth launch-history coverage check cannot pass unless rangeProof.allLaunchRangeProven is true.",
    ]));
  });

  it("accepts launch-history coverage only when range proof covers the freshness window", () => {
    const launchSample = {
      status: "complete",
      capturedAtUtc: "2026-02-13T05:30:00.000Z",
      currentHead: "same-head",
      surface: "admin_truth_sample",
      artifactPath: "agent/evidence/admin-truth-sample/sample.redacted.json",
      sourceFreshnessUtc: "2026-02-13T05:30:00.000Z",
      redactions: ["no raw user data"],
      checks: [
        { id: "source-freshness", status: "pass", notes: "" },
        { id: "sample-count", status: "pass", notes: "" },
        { id: "source-state-label", status: "pass", notes: "" },
        { id: "redacted-artifact-attached", status: "pass", notes: "" },
        { id: "launch-history-coverage", status: "pass", notes: "" },
      ],
      launchHistoryCoverage: {
        rangeStartDayKey: "2026-02-12",
        rangeEndDayKey: "2026-02-13",
        expectedDayCount: 2,
        days: [
          { dayKey: "2026-02-12", expected: true, sourceCounts: { first_party: 1, ga4: 1, historicalSnapshot: 0, legacySupport: 0 } },
          { dayKey: "2026-02-13", expected: true, sourceCounts: { first_party: 1, ga4: 1, historicalSnapshot: 0, legacySupport: 0 } },
        ],
        rangeProof: {
          allLaunchRangeProven: true,
        },
      },
    };

    expect(adminTruthSampleLaunchHistoryCoverageFailures(launchSample)).toEqual([]);
    expect(validateAdminTruthSampleEvidenceDocument(
      launchSample,
      { requireComplete: true, existingPaths: new Set(["agent/evidence/admin-truth-sample/sample.redacted.json"]) },
    )).toEqual([]);

    const shortCurrentSample = {
      ...launchSample,
      capturedAtUtc: "2026-05-19T05:30:00.000Z",
      sourceFreshnessUtc: "2026-05-19T05:30:00.000Z",
    };
    expect(adminTruthSampleLaunchHistoryCoverageFailures(shortCurrentSample)).toContain(
      "admin truth launchHistoryCoverage must prove the full February-to-current launch range; short sampled windows cannot clear launch-history coverage.",
    );
  });

  it("exposes launch-history readiness without promoting source-only recovery evidence", () => {
    expect(buildLaunchHistoryCoverageReadinessForEvidence({
      status: "source_agreement_failed",
      canClearSourceGate: false,
      sourceGateReason: "Formal all-launch evidence is missing.",
      launchHistoryCoverage: {
        rangeStartDayKey: "2026-02-12",
        rangeEndDayKey: "2026-06-20",
        expectedDayCount: 129,
        recoveredDayCount: 3,
        productTruthRecoveredDayCount: 1,
        rangeProof: {
          coverageWindowKind: "fixture_only_local_window",
          allLaunchRangeProven: false,
        },
        days: [
          { dayKey: "2026-06-18", expected: true },
          { dayKey: "2026-06-19", expected: true },
          { dayKey: "2026-06-20", expected: true },
        ],
      },
      sourceAgreement: {
        state: "failed",
      },
      nextAction: "Attach approved all-launch coverage.",
    })).toMatchObject({
      sourceArtifact: "agent/state/launch-analytics-recovery.generated.json",
      status: "source_agreement_failed",
      canClearSourceGate: false,
      canAttachFormalCoverage: false,
      allLaunchRangeProven: false,
      coverageWindowKind: "fixture_only_local_window",
      expectedDayCount: 129,
      recoveredDayCount: 3,
      productTruthRecoveredDayCount: 1,
      dayRowCount: 3,
      sourceAgreementState: "failed",
      sourceGateReason: "Formal all-launch evidence is missing.",
    });
  });
});
