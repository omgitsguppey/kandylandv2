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
  validateAdminTruthSampleEvidenceDocument,
} from "../../scripts/agent/validate-admin-truth-sample-evidence";

describe("evidence artifact schemas", () => {
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

  it("accepts launch-history coverage only when range proof and rows match", () => {
    const launchSample = {
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
  });
});
