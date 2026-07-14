import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildFinalBehavioralPrivacyTelemetryLock,
  validateFinalBehavioralPrivacyTelemetryLock,
} from "../../scripts/agent/validate-final-behavioral-privacy-telemetry-lock";
import { expectNoFailuresOrOnlyNamedIsolation } from "./utils/source-validator-contract";

describe("final behavioral privacy telemetry lock", () => {
  it("locks consent-aware guest, login, per-user behavior, legacy, and future feature telemetry", () => {
    const report = buildFinalBehavioralPrivacyTelemetryLock({
      generatedAtUtc: "2026-05-21T16:00:00.000Z",
      currentHead: "test-head",
      scoreBefore: 77.76,
      scoreAfter: 77.76,
      overrides: { protectedChanges: [] },
    });
    const consentArtifact = JSON.parse(readFileSync("agent/state/consent-tracking-contract.generated.json", "utf8")) as {
      validationFailures?: unknown[];
    };
    const legacyArtifact = JSON.parse(readFileSync("agent/state/privacy-behavior-legacy-recovery.generated.json", "utf8")) as {
      findings?: Array<{ message?: unknown }>;
    };

    expect(report.overallStatus).toBe(
      report.consentContractStatus === "pass" && report.legacyRecoveryStatus === "pass"
        ? "locked_with_formal_gates_remaining"
        : "blocked",
    );
    if (report.consentContractStatus === "fail") {
      expect(consentArtifact.validationFailures?.length ?? 0).toBeGreaterThan(0);
      expectNoFailuresOrOnlyNamedIsolation({
        failures: consentArtifact.validationFailures ?? [],
        expectedIsolationFailures: [/^chat\/nav\/payment protected files changed:/u],
      });
    }
    expect(report.cookieBannerStatus).toBe("pass");
    expect(report.guestIdentityStatus).toBe("pass");
    expect(report.signupHandoffStatus).toBe("pass");
    expect(report.loginHandoffStatus).toBe("pass");
    expect(report.perUserBehaviorStatus).toBe("pass");
    expect(report.minimalAnalyticsStatus).toBe("minimal_product_usage_only");
    expect(report.fullBehavioralStatus).toBe("full_behavioral_enabled");
    if (report.legacyRecoveryStatus === "fail") {
      expect(legacyArtifact.findings?.length ?? 0).toBeGreaterThan(0);
      expectNoFailuresOrOnlyNamedIsolation({
        failures: (legacyArtifact.findings ?? []).map((finding) => finding.message),
        expectedIsolationFailures: [/^protected chat\/nav\/payment files changed:/u],
      });
    }
    expect(report.futureFeatureTelemetryStatus).toBe("pass");
    expect(report.remainingExternalEvidenceItems).toEqual(expect.arrayContaining([
      "Runtime/provider smoke",
      "Admin truth/sample evidence",
    ]));
    expect(report.nextExactSteps.length).toBeGreaterThan(0);
    expectNoFailuresOrOnlyNamedIsolation({
      failures: validateFinalBehavioralPrivacyTelemetryLock(report),
      expectedIsolationFailures: [/^(?:consentContractStatus|legacyRecoveryStatus) is fail\.$/u],
      allowedIsolationFailures: [
        "consentContractStatus is fail.",
        "legacyRecoveryStatus is fail.",
      ],
    });
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
        protectedChanges: [],
      },
    });

    expect(validateFinalBehavioralPrivacyTelemetryLock(report)).toEqual(expect.arrayContaining([
      expect.stringContaining("minimal analytics equals no tracking"),
      expect.stringContaining("legacy unknown consent can become full behavior"),
    ]));
  });
});
