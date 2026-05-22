import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const REPORT_PATH = "agent/state/final-user-tracking-handoff-lock.generated.json";

describe("final user tracking handoff lock", () => {
  it("generates the final lock report with identity, envelope, metrics, legacy, debug, and future telemetry gates", () => {
    execSync("npm run check:final-user-tracking-handoff-lock", { encoding: "utf8", stdio: "pipe" });

    const report = JSON.parse(readFileSync(REPORT_PATH, "utf8"));

    expect(report.status).toBe("pass");
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
    expect(report.validationFailures).toEqual([]);
    expect(report.protectedRuntimeStatus).toMatchObject({
      productionReadsRequired: false,
      legacyMutationAllowed: false,
      paymentGumdropMathTouched: false,
      chatNavTouched: false,
    });
  });
});
