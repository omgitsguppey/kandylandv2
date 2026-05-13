import { describe, expect, it } from "vitest";

import {
  PRIVACY_OFF_BOUNDARY_RULE,
  PSEUDONYMOUS_IDENTIFIER_RULE,
  REQUIRED_ACTOR_LANES,
  buildIdentityPrivacyRawLedgerReport,
  validateIdentityPrivacyRawLedgerReport,
} from "../../scripts/agent/identity-privacy-raw-ledger-rewire";

const REPORT = buildIdentityPrivacyRawLedgerReport({ now: new Date("2026-05-13T12:00:00.000Z") });

describe("identity/privacy/raw-ledger rewire", () => {
  it("builds a report with required top-level fields", () => {
    expect(REPORT.reportKey).toBe("identity-privacy-raw-ledger-rewire");
    expect(REPORT.generatedAtUtc).toBe("2026-05-13T12:00:00.000Z");
    expect(REPORT.sourceInventoryReport?.path).toBe("agent/state/analytics-rewire-phase-one.generated.json");
    expect(REPORT.phasesCovered).toEqual(expect.arrayContaining([
      "3. Identity Graph Consolidation",
      "4. Privacy, Consent, Data Rights, And Privacy-Off Measurement Gate",
      "5. Raw Ledger Consolidation",
      "6. Legacy Recovery Mapper Eligibility Scaffolding",
    ]));
    expect(validateIdentityPrivacyRawLedgerReport(REPORT)).toEqual([]);
  });

  it("defines all three privacy modes", () => {
    expect(REPORT.privacyModes.map((mode) => mode.modeKey)).toEqual([
      "required_operational",
      "limited_consent_off_measurement",
      "optional_analytics_personalization",
    ]);
  });

  it("models privacy-off as neither collect nothing nor collect everything", () => {
    expect(PRIVACY_OFF_BOUNDARY_RULE.forbiddenClaims).toEqual([
      "privacy off means no data at all",
      "privacy off still allows all analytics",
    ]);

    const requiredOperational = REPORT.privacyModes.find((mode) => mode.modeKey === "required_operational");
    const limitedMeasurement = REPORT.privacyModes.find((mode) => mode.modeKey === "limited_consent_off_measurement");
    const optionalPersonalization = REPORT.privacyModes.find((mode) => mode.modeKey === "optional_analytics_personalization");

    expect(requiredOperational?.allowedWhenPrivacyOff).toBe(true);
    expect(limitedMeasurement?.allowedWhenPrivacyOff).toBe(true);
    expect(optionalPersonalization?.allowedWhenPrivacyOff).toBe(false);
    expect(optionalPersonalization?.forbiddenDestinations).toContain("privacy-off users");
  });

  it("keeps required operational telemetry as a separate mode", () => {
    const mode = REPORT.privacyModes.find((entry) => entry.modeKey === "required_operational");

    expect(mode?.examples).toEqual(expect.arrayContaining([
      "payment/refill integrity",
      "unlock/entitlement integrity",
      "abuse/security/rate limit",
      "support recovery",
    ]));
    expect(mode?.requiredLabels).toContain("minimized");
  });

  it("keeps limited consent-off measurement constrained", () => {
    const mode = REPORT.privacyModes.find((entry) => entry.modeKey === "limited_consent_off_measurement");

    expect(mode?.forbiddenDestinations).toEqual(expect.arrayContaining([
      "cross-site tracking",
      "ads or marketing personalization",
      "identity-tied session replay",
    ]));
    expect(mode?.requiredLabels).toContain("no_cross_site_tracking");
  });

  it("classifies app guest/session ids as pseudonymous identifiers", () => {
    expect(PSEUDONYMOUS_IDENTIFIER_RULE.identifiers).toEqual([
      "subject_*",
      "anon_*",
      "sessionId",
      "anonymousVisitorId",
      "kandy_session_id",
    ]);
    expect(PSEUDONYMOUS_IDENTIFIER_RULE.classification).toContain("pseudonymous");
  });

  it("covers every required actor lane", () => {
    expect(REQUIRED_ACTOR_LANES).toEqual([
      "guest",
      "anonymous_visitor",
      "session",
      "authenticated_user",
      "creator",
      "admin",
      "system",
      "unknown",
    ]);
    expect(REPORT.identityLanes.map((lane) => lane.actorType)).toEqual([...REQUIRED_ACTOR_LANES]);
  });

  it("lists raw ledger fields needed for later runtime consolidation", () => {
    const fields = new Set(REPORT.rawLedgerRules.flatMap((rule) => [...rule.requiredFields, ...rule.recommendedFields]));

    for (const expected of [
      "eventId",
      "eventName",
      "occurredAt",
      "receivedAt",
      "actorType",
      "anonymousVisitorId",
      "sessionId",
      "userId",
      "creatorId",
      "adminId",
      "consentState",
      "dedupeKey",
      "legacySource",
      "legacyConfidence",
      "mappingWarnings",
    ]) {
      expect(fields.has(expected)).toBe(true);
    }
  });

  it("adds consent-aware recovery eligibility metadata", () => {
    expect(REPORT.recoveryEligibility.length).toBeGreaterThan(0);
    expect(REPORT.recoveryEligibility[0]).toEqual(expect.objectContaining({
      consentRequirement: expect.any(String),
      canSurfaceInAdminAnalytics: expect.any(Boolean),
      canSurfaceInAdminDebug: expect.any(Boolean),
      canBackfillLater: expect.any(Boolean),
    }));
  });
});

