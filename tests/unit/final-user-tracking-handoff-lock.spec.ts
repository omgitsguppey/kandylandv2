import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { expectSourceValidatorWithDirtyTreeIsolation } from "./utils/source-validator-contract";

const REPORT_PATH = "agent/state/final-user-tracking-handoff-lock.generated.json";

describe("final user tracking handoff lock", () => {
  it("generates the final lock report with identity, envelope, metrics, legacy, debug, and future telemetry gates", () => {
    expectSourceValidatorWithDirtyTreeIsolation({
      command: "npm run check:final-user-tracking-handoff-lock",
      artifact: REPORT_PATH,
      isolationCheck: ["chatNavUntouched", "paymentGumdropMathUntouched"],
      expectedIsolationFailure: [
        "chatNavUntouched failed.",
        "paymentGumdropMathUntouched failed.",
      ],
      allowedIsolationFailures: [
        "chatNavUntouched failed.",
        "paymentGumdropMathUntouched failed.",
        /^protected file changed: /u,
      ],
    });

    const report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));

    expect(report.guestTrackingStatus).toBe("pass");
    expect(report.signupHandoffStatus).toBe("pass");
    expect(report.loggedInTrackingStatus).toBe("pass");
    expect(report.linkedPersonMetricsStatus).toBe("pass");
    expect(report.consentModeStatus).toBe("pass");
    expect(report.eventEnvelopeStatus).toBe("pass");
    expect(report.legacyRecoveryStatus).toBe("pass");
    expect(report.debugPanelSimplificationStatus).toBe("pass");
    expect(report.futureFeatureTelemetryStatus).toBe("pass");
    expect(report.duplicateDebugLaneCount).toBe(0);
    expect(report.orphanMetricCount).toBe(0);
    expect(report.nextExactSteps.length).toBeGreaterThan(0);
    expect(report.protectedRuntimeStatus).toMatchObject({
      productionReadsRequired: false,
      legacyMutationAllowed: false,
    });
    expect(report.protectedRuntimeStatus.paymentGumdropMathTouched).toBe(report.checks.paymentGumdropMathUntouched === false);
    expect(report.protectedRuntimeStatus.chatNavTouched).toBe(report.checks.chatNavUntouched === false);
  }, 30000);
});
