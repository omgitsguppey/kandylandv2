import { describe, expect, it } from "vitest";

import {
  REQUIRED_MANUAL_SCREENSHOT_ROUTES,
  validateManualScreenshotEvidenceDocument,
} from "../../scripts/agent/validate-manual-screenshot-evidence";
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
  validateAdminTruthSampleEvidenceDocument,
} from "../../scripts/agent/validate-admin-truth-sample-evidence";

const basePath = "agent/evidence/manual-screenshot-qa/screenshots/home__mobile__2026-05-17.png";

describe("evidence artifact schemas", () => {
  it("does not count manual screenshot templates as complete evidence", () => {
    const failures = validateManualScreenshotEvidenceDocument(
      {
        status: "template_not_evidence",
        capturedAtUtc: "",
        appBaseUrl: "",
        device: "",
        browser: "",
        routes: [],
        redactions: [],
        operatorNotes: "Template only.",
      },
      { requireComplete: true, existingPaths: new Set() },
    );

    expect(failures).toContain("manual screenshot evidence template is not completed evidence.");
  });

  it("requires all manual screenshot route groups for complete evidence", () => {
    const failures = validateManualScreenshotEvidenceDocument(
      {
        status: "complete",
        capturedAtUtc: "2026-05-17T05:30:00.000Z",
        appBaseUrl: "https://example.test",
        device: "iPhone",
        browser: "Safari",
        routes: REQUIRED_MANUAL_SCREENSHOT_ROUTES.slice(1).map((route) => ({
          route,
          surface: "user",
          screenshotPath: basePath,
          status: "pass",
          notes: "",
        })),
        redactions: ["none"],
        operatorNotes: "",
      },
      { requireComplete: true, existingPaths: new Set([basePath]) },
    );

    expect(failures).toContain('manual screenshot complete evidence must include route "/".');
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
});
