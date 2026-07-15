import { describe, expect, it } from "vitest";

import {
  AUTH_READINESS_SCORE_DIMENSIONS,
  buildAuthReadinessLockReport,
  classifyAuthReadinessLockDirtyFile,
  validateAuthReadinessLockReport,
} from "../../scripts/agent/validate-auth-readiness-lock";

const TEST_HEAD = "a".repeat(40);

function childEvidence(reportKey: string, payload: Record<string, unknown>) {
  return {
    reportKey,
    generatedAtUtc: new Date().toISOString(),
    currentHead: TEST_HEAD,
    sourceCommit: TEST_HEAD,
    status: "pass",
    passed: true,
    canClearSourceGate: true,
    validationFailures: [],
    ...payload,
  };
}

const score = {
  sourceHealthScore: 92.5,
  runtimeHealthScore: 84.2,
  evidenceCompletenessScore: 69.6,
  freshnessScore: 83.75,
  costRiskScore: 42,
  regressionRiskScore: 86,
  healthScore: 79.25,
};

const providerConflict = childEvidence("auth-provider-conflict-resolution", {
  googleCreatedEmailPasswordAttempt: "mapped",
  emailPasswordCreatedGoogleAttempt: "mapped",
  emailAlreadyInUseResolution: "mapped",
  wrongPasswordInvalidCredentialGuidance: "mapped",
  rawFirebaseErrorLeak: false,
  authConflictTelemetryStatus: "mapped",
  debugLaneStatus: { status: "live", rawEmailPasswordExposed: false },
});

const emailPassword = childEvidence("email-password-auth-refactor", {
  signupFlowStatus: "mapped",
  loginFlowStatus: "mapped",
  rollbackStatus: "safe",
  navigationSessionOrdering: "after_registration_truth",
  welcomeBonusSource: "reward_gd_only",
  commonEmailErrorsMapped: [
    { code: "auth/email-already-in-use" },
    { code: "auth/wrong-password" },
    { code: "auth/invalid-credential" },
  ],
  googleAuthPathStatus: "untouched_required_path_present",
  debugLaneStatus: { status: "live" },
});

const persistence = childEvidence("auth-persistence-stability", {
  persistenceStatus: "established",
  navigationSessionDeletePolicy: "reasoned_only",
  profileSnapshotRetryStatus: "transient_retry_keeps_user",
  logoutReasonStatus: "mapped",
  securityLogoutStatus: "preserved",
  explicitLogoutStatus: "clears_session",
  debugLane: { status: "live", rawCredentialsExposed: false },
});

const runtime = childEvidence("auth-runtime-telemetry", {
  eventFamilies: [
    "auth_google_started",
    "auth_google_completed",
    "auth_google_failed",
    "auth_email_login_started",
    "auth_email_login_completed",
    "auth_email_login_failed",
    "auth_email_signup_started",
    "auth_email_signup_completed",
    "auth_email_signup_failed",
    "auth_password_reset_requested",
    "auth_password_reset_failed",
    "auth_navigation_session_started",
    "auth_navigation_session_completed",
    "auth_navigation_session_failed",
    "auth_session_restored",
    "auth_unexpected_session_drop",
    "auth_profile_bootstrap_started",
    "auth_profile_bootstrap_completed",
    "auth_profile_bootstrap_failed",
  ],
  featureRegistrationStatus: "mapped",
  eventEnvelopeStatus: "mapped",
  personMetricsStatus: "mapped",
  debugLane: {
    status: "live",
    rawPiiExposed: false,
    rawTokensExposed: false,
  },
  privacy: {
    rawPasswordLogged: false,
    rawEmailLogged: false,
    rawFirebaseTokenLogged: false,
  },
});

const personMetrics = childEvidence("person-metrics-hydration", {
  debugLane: {
    lowConfidenceMetrics: 0,
  },
  metricStatus: {
    auth_runtime_events: {
      metricId: "auth_runtime_events",
      state: "hydrated",
      count: 1,
      confidence: "exact",
    },
  },
});

describe("auth readiness lock", () => {
  it("records unrelated generated evidence without weakening source-file classification", () => {
    expect(classifyAuthReadinessLockDirtyFile("agent/state/unrelated-score.generated.json")).toBe("unrelated_generated_evidence_recorded");
    expect(classifyAuthReadinessLockDirtyFile("docs/agent-truth/unrelated-score.md")).toBe("unrelated_generated_evidence_documentation_recorded");
    expect(classifyAuthReadinessLockDirtyFile("src/lib/chat/chat.ts")).toBe("unsafe_unknown");
    expect(classifyAuthReadinessLockDirtyFile("src/lib/unknown-auth-helper.ts")).toBe("unsafe_unknown");
  });

  it("passes when all auth phase reports are mapped and privacy-safe", () => {
    const report = buildAuthReadinessLockReport({
      currentHead: TEST_HEAD,
      generatedAtUtc: new Date().toISOString(),
      artifacts: {
        providerConflict,
        emailPassword,
        persistence,
        runtime,
        personMetrics,
        publicBetaScore: score,
      },
      dirtyFiles: [
        "agent/state/auth-readiness-lock.generated.json",
        "docs/agent-truth/auth-readiness-lock.md",
        "scripts/agent/validate-auth-readiness-lock.ts",
        "tests/unit/auth-readiness-lock.spec.ts",
        "package.json",
      ],
    });

    expect(report.providerConflictStatus.status).toBe("pass");
    expect(report.status).toBe("pass");
    expect(report.passed).toBe(true);
    expect(report.sourceCommit).toBe(TEST_HEAD);
    expect(report.emailPasswordAuthStatus.status).toBe("pass");
    expect(report.authTelemetryStatus.status).toBe("pass");
    expect(report.adminDebugStatus.status).toBe("pass");
    expect(report.personMetricsStatus.status).toBe("pass");
    expect(Object.keys(report.scoreDimensions)).toEqual([...AUTH_READINESS_SCORE_DIMENSIONS]);
    expect(validateAuthReadinessLockReport(report)).toEqual([]);
  });

  it("fails when provider conflicts, telemetry, or privacy checks are missing", () => {
    const report = buildAuthReadinessLockReport({
      currentHead: TEST_HEAD,
      generatedAtUtc: new Date().toISOString(),
      artifacts: {
        providerConflict: {
          ...providerConflict,
          googleCreatedEmailPasswordAttempt: "missing",
          emailPasswordCreatedGoogleAttempt: "missing",
        },
        emailPassword,
        persistence,
        runtime: {
          ...runtime,
          eventEnvelopeStatus: "missing",
          debugLane: { status: "live", rawPiiExposed: true, rawTokensExposed: false },
          privacy: { rawPasswordLogged: false, rawEmailLogged: false, rawFirebaseTokenLogged: true },
        },
        personMetrics: {
          ...personMetrics,
          metricStatus: {},
        },
        publicBetaScore: score,
      },
      dirtyFiles: ["src/lib/chat/chat.ts"],
    });

    const failures = validateAuthReadinessLockReport(report);
    expect(failures).toContain("Google-created account email/password attempt unresolved.");
    expect(failures).toContain("Email/password-created account Google attempt unresolved.");
    expect(failures).toContain("Auth telemetry is missing event envelope or person metrics mapping.");
    expect(failures).toContain("Auth person metrics missing.");
    expect(failures).toContain("Raw PII or token exposure is not allowed in auth readiness lock.");
    expect(failures).toContain("Dirty files include unclassified or forbidden auth-lock scope.");
  });

  it("fails closed when the person-metrics artifact lacks an explicit validation verdict", () => {
    const report = buildAuthReadinessLockReport({
      currentHead: TEST_HEAD,
      generatedAtUtc: new Date().toISOString(),
      artifacts: {
        providerConflict,
        emailPassword,
        persistence,
        runtime,
        personMetrics: {
          ...personMetrics,
          validationFailures: undefined,
        },
        publicBetaScore: score,
      },
      dirtyFiles: [],
    });

    expect(report.personMetricsStatus.status).toBe("fail");
    expect(validateAuthReadinessLockReport(report)).toContain("Auth person metrics missing.");
  });

  it("does not launder failing, stale, or wrong-head child evidence through valid payload fields", () => {
    const poison = (report: Record<string, unknown>) => ({
      ...report,
      status: "fail",
      passed: false,
      canClearSourceGate: false,
      currentHead: "d".repeat(40),
      sourceCommit: "e".repeat(40),
      generatedAtUtc: "2020-01-01T00:00:00.000Z",
      validationFailures: ["child failed"],
    });
    const report = buildAuthReadinessLockReport({
      currentHead: TEST_HEAD,
      generatedAtUtc: new Date().toISOString(),
      artifacts: {
        providerConflict: poison(providerConflict),
        emailPassword: poison(emailPassword),
        persistence: poison(persistence),
        runtime: poison(runtime),
        personMetrics: poison(personMetrics),
        publicBetaScore: score,
      },
      dirtyFiles: [],
    });

    expect(report.status).toBe("fail");
    expect(report.passed).toBe(false);
    expect(report.canClearSourceGate).toBe(false);
    expect(report.validationFailures).toEqual(expect.arrayContaining([
      "auth-provider-conflict-resolution child currentHead must match the current full Git SHA.",
      "auth-provider-conflict-resolution child sourceCommit must match currentHead.",
      "auth-provider-conflict-resolution child status must be pass.",
      "auth-provider-conflict-resolution child validationFailures must be an explicit empty array.",
      "auth-provider-conflict-resolution child canClearSourceGate must be true.",
      "person-metrics-hydration child generatedAtUtc must be non-future and fresh within 86400000ms.",
    ]));
    expect(report.nextExactSteps.join("\n")).toContain("auth-provider-conflict-resolution child currentHead");
  });

  it("fails closed on placeholder or stale provenance", () => {
    const report = buildAuthReadinessLockReport({
      currentHead: "head",
      generatedAtUtc: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      artifacts: {
        providerConflict,
        emailPassword,
        persistence,
        runtime,
        personMetrics,
        publicBetaScore: score,
      },
      dirtyFiles: [],
    });

    expect(report.status).toBe("fail");
    expect(report.passed).toBe(false);
    expect(report.validationFailures).toContain("currentHead and sourceCommit must be the same full 40-character Git SHA.");
    expect(report.validationFailures).toContain("generatedAtUtc must be a current, non-future timestamp inside the 24-hour evidence window.");

    const futureDated = {
      ...report,
      currentHead: TEST_HEAD,
      sourceCommit: TEST_HEAD,
      generatedAtUtc: new Date(Date.now() + 60_000).toISOString(),
      status: "pass" as const,
      passed: true,
      validationFailures: [],
    };
    expect(validateAuthReadinessLockReport(futureDated)).toContain("generatedAtUtc must be a current, non-future timestamp inside the 24-hour evidence window.");
  });

  it("rejects contradictory top-level verdicts and validation failures", () => {
    const report = buildAuthReadinessLockReport({
      currentHead: TEST_HEAD,
      generatedAtUtc: new Date().toISOString(),
      artifacts: {
        providerConflict,
        emailPassword,
        persistence,
        runtime,
        personMetrics,
        publicBetaScore: score,
      },
      dirtyFiles: [],
    });
    const contradictory = {
      ...report,
      status: "pass" as const,
      passed: true,
      validationFailures: ["injected failure"],
    };

    expect(validateAuthReadinessLockReport(contradictory)).toContain("validator status cannot pass while validation failures are present.");
    expect(validateAuthReadinessLockReport({ ...report, sourceCommit: "c".repeat(40) })).toContain("currentHead and sourceCommit must be the same full 40-character Git SHA.");
  });
});
