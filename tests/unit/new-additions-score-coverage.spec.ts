import { describe, expect, it } from "vitest";

import {
  EXPECTED_NEW_ADDITIONS,
  buildNewAdditionsScoreCoverageReport,
  validateNewAdditionsScoreCoverageReport,
} from "../../scripts/agent/validate-new-additions-score-coverage";

const baseArtifacts = {
  publicBetaScore: {
    healthScore: 74.76,
    launchBlockers: ["Runtime/provider smoke: Runtime unverified"],
    evidenceGates: [{ id: "runtimeProviderSmoke", gateRequiredForExit: true }],
    operatorFinalChecks: {
      uiVisualSurfaces: {
        status: "source_surface_checked",
        needsOperatorReview: false,
        passedInCodex: true,
        sourceChecksPassed: true,
        note: "browser checks are optional only for a source-reported UI issue.",
        surfaces: [{ surfaceId: "wallet_mobile" }],
      },
    },
  },
  featureRegistration: {
    status: "pass",
    features: [
      { featureId: "cookie_consent_privacy", scoreDimensionsAffected: ["evidenceCompleteness"], adminDebugVisibility: { debugVisible: true } },
      { featureId: "auth_identity", scoreDimensionsAffected: ["evidenceCompleteness"], adminDebugVisibility: { debugVisible: true } },
      { featureId: "behavior_tracking", scoreDimensionsAffected: ["runtimeHealth", "evidenceCompleteness"], adminDebugVisibility: { debugVisible: true } },
      { featureId: "analytics_telemetry", scoreDimensionsAffected: ["runtimeHealth"], adminDebugVisibility: { debugVisible: true } },
      { featureId: "runtime_smoke_substitutes", scoreDimensionsAffected: ["runtimeHealth"], adminDebugVisibility: { debugVisible: true } },
      { featureId: "admin_debug", scoreDimensionsAffected: ["evidenceCompleteness"], adminDebugVisibility: { debugVisible: true } },
    ],
    metricCoverage: { orphanMetrics: [] },
    telemetryCoverage: { unmappedEvents: [] },
  },
  activityVerification: {
    status: "pass",
    summary: { missingTracking: 0, orphaned: 0 },
    features: [
      { featureId: "cookie_consent_privacy", debugVisible: true, scoreEligible: true, verificationStatus: "verified_by_activity" },
      { featureId: "behavior_tracking", debugVisible: true, scoreEligible: true, verificationStatus: "verified_by_activity" },
      { featureId: "analytics_telemetry", debugVisible: true, scoreEligible: true, verificationStatus: "verified_by_activity" },
    ],
  },
  codexVisualGateRemoval: {
    status: "codex_visual_gate_removed",
    summary: {
      visualGateInEvidenceGates: false,
      visualGateInLaunchBlockers: false,
      operatorChecklistPresent: true,
      visualConfirmationHandledOutsideCodex: true,
    },
    visualArtifactStatus: "source_surface_checks_current",
  },
  uiVisualSmokeMinimal: { status: "source_surface_checks_current" },
  finalBehavioralPrivacyTelemetryLock: { overallStatus: "locked_with_formal_gates_remaining" },
  consentTrackingContract: { status: "pass" },
  cookieBannerSettingsSync: { status: "pass" },
  identityHandoffRefinement: { overallStatus: "pass" },
  behavioralExtensibilityLayer: { status: "pass" },
  privacyBehaviorLegacyRecovery: { status: "pass" },
  finalAlgorithmicDebugLock: { overallStatus: "locked_with_formal_gates_remaining" },
  debugOperatorCockpit: { status: "pass" },
  selfHealingRefreshQueue: { status: "pass" },
  score80ReconciliationLock: { currentScore: 74.76, remainingScoreDrag: ["Runtime/provider smoke"] },
  costOwnerReviewSourceClosure: { status: "pass" },
  runtimeSmokeSubstituteMatrix: { status: "pass" },
};

describe("new additions score coverage finalizer", () => {
  it("tracks every expected addition through existing artifacts, score, and debug coverage", () => {
    const report = buildNewAdditionsScoreCoverageReport({
      artifacts: baseArtifacts,
      currentHead: "HEAD",
      generatedAtUtc: "2026-05-21T00:00:00.000Z",
      changedFiles: [
        "agent/state/new-additions-score-coverage.generated.json",
        "docs/agent-truth/new-additions-score-coverage.md",
        "scripts/agent/validate-new-additions-score-coverage.ts",
        "tests/unit/new-additions-score-coverage.spec.ts",
        "package.json",
      ],
    });

    expect(report.additions).toHaveLength(EXPECTED_NEW_ADDITIONS.length);
    expect(report.allNewAdditionsTracked).toBe(true);
    expect(report.allNewAdditionsInScore).toBe(true);
    expect(report.orphanedNewAdditions).toEqual([]);
    expect(report.unscoredNewAdditions).toEqual([]);
    expect(report.manualGateRemovedFromCodexScore).toBe(true);
    expect(report.operatorFinalChecklistStatus).toBe("source_surface_checked_outside_codex_score");
    expect(validateNewAdditionsScoreCoverageReport(report)).toEqual([]);
  });

  it("fails when a new addition loses feature registration, score coverage, or debug visibility", () => {
    const artifacts = {
      ...baseArtifacts,
      featureRegistration: {
        ...baseArtifacts.featureRegistration,
        features: baseArtifacts.featureRegistration.features.filter((feature) => feature.featureId !== "cookie_consent_privacy"),
      },
    };
    const report = buildNewAdditionsScoreCoverageReport({ artifacts, changedFiles: [] });

    expect(report.allNewAdditionsTracked).toBe(false);
    expect(report.orphanedNewAdditions.some((item) => item.additionId === "consent_tracking")).toBe(true);
    expect(validateNewAdditionsScoreCoverageReport(report)).toEqual(expect.arrayContaining([
      "consent_tracking lacks required feature registration: cookie_consent_privacy.",
      "orphaned new additions require exact next action.",
    ]));
  });

  it("fails if UI screenshots still block Codex score or activity verification is omitted", () => {
    const retiredUiScoreGateId = ["visual", "Manual", "Smoke"].join("");
    const artifacts = {
      ...baseArtifacts,
      activityVerification: undefined,
      publicBetaScore: {
        ...baseArtifacts.publicBetaScore,
        evidenceGates: [{ id: retiredUiScoreGateId, gateRequiredForExit: true }],
        launchBlockers: ["UI source coverage gap"],
      },
      codexVisualGateRemoval: {
        ...baseArtifacts.codexVisualGateRemoval,
        summary: {
          ...baseArtifacts.codexVisualGateRemoval.summary,
          visualGateInEvidenceGates: true,
          visualGateInLaunchBlockers: true,
        },
      },
    };
    const report = buildNewAdditionsScoreCoverageReport({ artifacts, changedFiles: [] });
    const failures = validateNewAdditionsScoreCoverageReport(report);

    expect(report.manualGateRemovedFromCodexScore).toBe(false);
    expect(failures).toEqual(expect.arrayContaining([
      "UI screenshots still block Codex score.",
      "activity verification coverage is missing.",
    ]));
  });

  it("fails when dirty files are unclassified or protected surfaces changed", () => {
    const report = buildNewAdditionsScoreCoverageReport({
      artifacts: baseArtifacts,
      changedFiles: ["src/app/dashboard/chat/page.tsx", "tmp/unknown.txt"],
    });
    const failures = validateNewAdditionsScoreCoverageReport(report);

    expect(report.dirtyFiles.some((file) => file.classification === "unsafe_unknown")).toBe(true);
    expect(failures).toEqual(expect.arrayContaining([
      "dirty files include unsafe_unknown entries.",
      "protected chat/nav/payment/GumDrop files changed.",
    ]));
  });
});
