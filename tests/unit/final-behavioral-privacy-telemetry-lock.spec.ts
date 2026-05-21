import { describe, expect, it } from "vitest";

import {
  buildFinalBehavioralPrivacyTelemetryLock,
  validateFinalBehavioralPrivacyTelemetryLock,
} from "../../scripts/agent/validate-final-behavioral-privacy-telemetry-lock";

describe("final behavioral privacy telemetry lock", () => {
  it("locks consent-aware guest, login, per-user behavior, legacy, and future feature telemetry", () => {
    const report = buildFinalBehavioralPrivacyTelemetryLock({
      generatedAtUtc: "2026-05-21T16:00:00.000Z",
      currentHead: "test-head",
      scoreBefore: 77.76,
      scoreAfter: 77.76,
    });

    expect(report.overallStatus).toBe("locked_with_formal_gates_remaining");
    expect(report.consentContractStatus).toBe("pass");
    expect(report.cookieBannerStatus).toBe("pass");
    expect(report.guestIdentityStatus).toBe("pass");
    expect(report.signupHandoffStatus).toBe("pass");
    expect(report.loginHandoffStatus).toBe("pass");
    expect(report.perUserBehaviorStatus).toBe("pass");
    expect(report.minimalAnalyticsStatus).toBe("minimal_product_usage_only");
    expect(report.fullBehavioralStatus).toBe("full_behavioral_enabled");
    expect(report.legacyRecoveryStatus).toBe("pass");
    expect(report.futureFeatureTelemetryStatus).toBe("pass");
    expect(report.remainingManualOnlyItems).toEqual(expect.arrayContaining([
      "UI visual/manual smoke",
      "Runtime/provider smoke",
      "Admin truth/sample evidence",
    ]));
    expect(report.nextExactSteps.length).toBeGreaterThan(0);
    expect(validateFinalBehavioralPrivacyTelemetryLock(report)).toEqual([]);
  });

  it("fails if minimal analytics is treated as no tracking or unknown legacy becomes full behavior", () => {
    const report = buildFinalBehavioralPrivacyTelemetryLock({
      generatedAtUtc: "2026-05-21T16:00:00.000Z",
      currentHead: "test-head",
      scoreBefore: 77.76,
      scoreAfter: 77.76,
      overrides: {
        minimalProductUsageAllowed: false,
        legacyUnknownPromotesFullBehavior: true,
      },
    });

    expect(validateFinalBehavioralPrivacyTelemetryLock(report)).toEqual(expect.arrayContaining([
      expect.stringContaining("minimal analytics equals no tracking"),
      expect.stringContaining("legacy unknown consent can become full behavior"),
    ]));
  });
});
