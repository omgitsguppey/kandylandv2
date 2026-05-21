import { describe, expect, it } from "vitest";

import {
  buildActivityVerificationReport,
  validateActivityVerificationReport,
} from "@/lib/analytics/activity-verification-engine";
import { FEATURE_REGISTRATION_REGISTRY } from "@/lib/features/feature-registration-registry";

const drops = FEATURE_REGISTRATION_REGISTRY.find((feature) => feature.featureId === "drops")!;

describe("activity verification engine", () => {
  it("verifies a source-backed guest-to-user activity path only when telemetry, materializer, identity, debug, and score paths exist", () => {
    const report = buildActivityVerificationReport({
      features: [drops],
      consentMode: "full_behavioral",
      sourceEvents: [
        {
          featureId: "drops",
          eventName: "drop_card_impression",
          sourceKind: "source_backed_fixture",
          guestId: "guest_1",
          userId: "user_1",
          sessionId: "session_1",
          identityLinkId: "identity_link_1",
          identityConfidence: 0.95,
          materialized: true,
          debugVisible: true,
          sourcePath: "tests/fixtures/source-backed-drop-activity.json",
        },
      ],
    });

    const [feature] = report.features;
    expect(feature).toMatchObject({
      featureId: "drops",
      guestActivitySeen: true,
      userActivitySeen: true,
      guestToUserLinked: true,
      identifiableMetricAvailable: true,
      consentModeAllowed: true,
      behaviorMaterialized: true,
      debugVisible: true,
      scoreEligible: true,
      verificationStatus: "verified_by_activity",
    });
    expect(feature.confidenceScore).toBeGreaterThanOrEqual(80);
    expect(report.productionReadsRequired).toBe(false);
    expect(report.fakeActivityUsed).toBe(false);
    expect(report.debugBacklogItems).toEqual([]);
    expect(validateActivityVerificationReport(report)).toEqual([]);
  });

  it("blocks behavioral activity under minimal consent and creates a privacy backlog item", () => {
    const report = buildActivityVerificationReport({
      features: [drops],
      consentMode: "minimal_analytics",
      sourceEvents: [
        {
          featureId: "drops",
          eventName: "drop_card_impression",
          sourceKind: "source_backed_fixture",
          guestId: "guest_1",
          sessionId: "session_1",
          materialized: true,
          debugVisible: true,
          sourcePath: "tests/fixtures/source-backed-drop-activity.json",
        },
      ],
    });

    expect(report.features[0]).toMatchObject({
      verificationStatus: "blocked_by_consent",
      consentModeAllowed: false,
      scoreEligible: false,
    });
    expect(report.debugBacklogItems.some((item) =>
      item.fixClass === "telemetry_closure"
      && item.evidenceReason.includes("Consent mode"),
    )).toBe(true);
    expect(validateActivityVerificationReport(report)).toEqual([]);
  });

  it("marks activity with no materializer as orphaned and backlog-visible", () => {
    const report = buildActivityVerificationReport({
      features: [drops],
      consentMode: "full_behavioral",
      sourceEvents: [
        {
          featureId: "drops",
          eventName: "drop_card_impression",
          sourceKind: "source_backed_fixture",
          guestId: "guest_1",
          userId: "user_1",
          identityLinkId: "identity_link_1",
          identityConfidence: 0.95,
          materialized: false,
          debugVisible: true,
          sourcePath: "tests/fixtures/source-backed-drop-activity.json",
        },
      ],
    });

    expect(report.features[0]).toMatchObject({
      verificationStatus: "orphaned",
      behaviorMaterialized: false,
      scoreEligible: false,
    });
    expect(report.debugBacklogItems.some((item) =>
      item.title.includes("activity materializer missing")
      && item.sourceFiles.includes("src/lib/analytics/activity-verification-engine.ts"),
    )).toBe(true);
    expect(validateActivityVerificationReport(report)).toEqual([]);
  });

  it("does not let a user-level metric become score eligible without identity confidence", () => {
    const report = buildActivityVerificationReport({
      features: [drops],
      consentMode: "full_behavioral",
      sourceEvents: [
        {
          featureId: "drops",
          eventName: "drop_card_impression",
          sourceKind: "source_backed_fixture",
          userId: "user_1",
          sessionId: "session_1",
          identityConfidence: 0,
          materialized: true,
          debugVisible: true,
          sourcePath: "tests/fixtures/source-backed-drop-activity.json",
        },
      ],
    });

    expect(report.features[0]).toMatchObject({
      userActivitySeen: true,
      identifiableMetricAvailable: false,
      scoreEligible: false,
      verificationStatus: "orphaned",
    });
    expect(validateActivityVerificationReport(report)).toEqual([]);
  });

  it("fails validation when activity is fake or missing tracking has no backlog item", () => {
    const report = buildActivityVerificationReport({
      features: [{
        ...drops,
        telemetryEvents: [],
        materializerLanes: [],
      }],
      consentMode: "full_behavioral",
      sourceEvents: [{
        featureId: "drops",
        eventName: "unregistered_drop_signal",
        sourceKind: "fake",
        sourcePath: "",
      }],
    });
    const failures = validateActivityVerificationReport({
      ...report,
      debugBacklogItems: [],
    });

    expect(report.features[0].verificationStatus).toBe("missing_tracking");
    expect(failures).toEqual(expect.arrayContaining([
      "activity verification report must not use fake activity.",
      "missing tracking feature drops did not create a debug backlog item.",
    ]));
  });
});
