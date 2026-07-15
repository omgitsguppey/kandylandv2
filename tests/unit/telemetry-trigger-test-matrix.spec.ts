import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  REQUIRED_TELEMETRY_TRIGGER_FAMILIES,
  TELEMETRY_TRIGGER_TEST_MATRIX,
  buildTelemetryTriggerTestMatrixReport,
  evaluateTelemetryTriggerTestMatrix,
} from "@/lib/testing/telemetry-trigger-test-matrix";

describe("telemetry trigger test matrix", () => {
  it("does not classify the canonical final lock adversarial fixture as a duplicate validator", () => {
    const validatorSource = readFileSync("scripts/agent/validate-telemetry-trigger-test-matrix.ts", "utf8");

    expect(validatorSource).toContain('path === "tests/unit/final-testing-tracking-telemetry-lock.spec.ts"');
  });

  it("covers every required trigger family from event envelope to score input", () => {
    const report = buildTelemetryTriggerTestMatrixReport({
      generatedAtUtc: "2026-05-23T08:00:00.000Z",
      currentHead: "test",
      dirtyFiles: [],
    });

    expect(report.productionReadsRequired).toBe(false);
    expect(report.liveDataMutationAllowed).toBe(false);
    expect(report.status).toBe("pass");
    expect(report.debugLane).toMatchObject({
      label: "Testing coverage",
      missingTriggerTests: 0,
      uiOnlyTests: 0,
      waitingOnActivityDeterministicGaps: 0,
    });

    for (const family of REQUIRED_TELEMETRY_TRIGGER_FAMILIES) {
      expect(report.coverageByFamily[family]).toMatchObject({
        required: true,
        covered: true,
        missingCoverageReason: null,
      });
    }

    for (const row of report.rows) {
      expect(row.currentStatus).toBe("covered");
      expect(row.missingCoverageReason).toBeNull();
      expect(row.expectedEnvelope.eventName).toBe(row.eventName);
      expect(row.expectedFeatureActivity.status).toBe("mapped");
      expect(row.expectedPersonMetric.metricId).toEqual(expect.any(String));
      expect(row.expectedDebugLane).toBe("Testing coverage");
      expect(row.expectedScoreDimension).toEqual(expect.any(String));
      expect(row.requiredValidatorTest).toContain("tests/unit/telemetry-trigger-test-matrix.spec.ts");
    }
  });

  it("proves deterministic bridge, hydration, activity, debug, and score paths for each trigger", () => {
    const evaluations = evaluateTelemetryTriggerTestMatrix({
      generatedAtUtc: "2026-05-23T08:00:00.000Z",
    });

    expect(evaluations).toHaveLength(TELEMETRY_TRIGGER_TEST_MATRIX.length);
    expect(evaluations.every((entry) => entry.pathVerified)).toBe(true);
    expect(evaluations.every((entry) => entry.envelope.pipelineStatus === "normal")).toBe(true);
    expect(evaluations.every((entry) => entry.featureActivity.producerConnected)).toBe(true);
    expect(evaluations.every((entry) => entry.featureActivity.materializerMapped)).toBe(true);
    expect(evaluations.every((entry) => entry.featureActivity.debugLaneMapped)).toBe(true);
    expect(evaluations.every((entry) => entry.featureActivity.scoreInputMapped)).toBe(true);
    expect(evaluations.every((entry) => entry.personMetric.classificationStatus === "mapped")).toBe(true);
    expect(evaluations.every((entry) => entry.debugEvidence.status === "live")).toBe(true);
    expect(evaluations.every((entry) => entry.activityVerification.verificationStatus === "verified_by_activity")).toBe(true);
    expect(evaluations.every((entry) => entry.hydration.metricStatus[entry.row.expectedPersonMetric.metricId].count > 0)).toBe(true);
    expect(evaluations.every((entry) => entry.waitingOnActivity.reason !== "future_real_activity_pending")).toBe(true);
    expect(evaluations.every((entry) => entry.gap.hasGap === false)).toBe(true);
  });

  it("keeps checkout starts separate from payment approvals and consent choices out of behavioral-only tracking", () => {
    const report = buildTelemetryTriggerTestMatrixReport({
      generatedAtUtc: "2026-05-23T08:00:00.000Z",
      dirtyFiles: [],
    });
    const checkout = report.rows.find((row) => row.triggerId === "wallet_checkout_start");
    const approval = report.rows.find((row) => row.triggerId === "wallet_payment_approval");
    const consent = report.rows.find((row) => row.triggerId === "consent_cookie_choice");

    expect(checkout?.eventName).toBe("begin_checkout");
    expect(checkout?.expectedPersonMetric.metricId).toBe("checkout_starts");
    expect(approval?.expectedPersonMetric.metricId).toBe("payment_approvals");
    expect(consent?.eventName).toBe("cookie_consent_updated");
    expect(consent?.expectedPersonMetric.metricId).toBe("settings_actions");
    expect(report.validation.checkoutStartCountsAsPaymentSuccess).toBe(false);
    expect(report.validation.consentTrackedUnderDisallowedMode).toBe(false);
  });

  it("reports score impact by dimension and classifies dirty files", () => {
    const report = buildTelemetryTriggerTestMatrixReport({
      generatedAtUtc: "2026-05-23T08:00:00.000Z",
      currentHead: "test",
      dirtyFiles: [
        "src/lib/testing/telemetry-trigger-test-matrix.ts",
        "scripts/agent/validate-telemetry-trigger-test-matrix.ts",
        "tests/unit/telemetry-trigger-test-matrix.spec.ts",
      ],
    });

    expect(Object.keys(report.scoreImpactByDimension).sort()).toEqual([
      "costRisk",
      "evidenceCompleteness",
      "freshness",
      "regressionRisk",
      "runtimeHealth",
      "sourceHealth",
    ]);
    expect(Object.values(report.scoreImpactByDimension).every((impact) => impact.after >= impact.before)).toBe(true);
    expect(report.dirtyFiles.every((file) => file.classification !== "unsafe_unknown")).toBe(true);
    expect(report.validatorAuthority).toMatchObject({
      packageScript: "check:telemetry-trigger-test-matrix",
      validator: "scripts/agent/validate-telemetry-trigger-test-matrix.ts",
      unitTest: "tests/unit/telemetry-trigger-test-matrix.spec.ts",
    });
  });
});
