import { describe, expect, it } from "vitest";

import {
  AUTH_READINESS_SCORE_DIMENSIONS,
  buildAuthReadinessLockReport,
  validateAuthReadinessLockReport,
} from "../../scripts/agent/validate-auth-readiness-lock";

const score = {
  sourceHealthScore: 92.5,
  runtimeHealthScore: 84.2,
  evidenceCompletenessScore: 69.6,
  freshnessScore: 83.75,
  costRiskScore: 42,
  regressionRiskScore: 86,
  healthScore: 79.25,
};

const providerConflict = {
  googleCreatedEmailPasswordAttempt: "mapped",
  emailPasswordCreatedGoogleAttempt: "mapped",
  emailAlreadyInUseResolution: "mapped",
  wrongPasswordInvalidCredentialGuidance: "mapped",
  rawFirebaseErrorLeak: false,
  authConflictTelemetryStatus: "mapped",
  debugLaneStatus: { status: "live", rawEmailPasswordExposed: false },
};

const emailPassword = {
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
};

const persistence = {
  persistenceStatus: "established",
  navigationSessionDeletePolicy: "reasoned_only",
  profileSnapshotRetryStatus: "transient_retry_keeps_user",
  logoutReasonStatus: "mapped",
  securityLogoutStatus: "preserved",
  explicitLogoutStatus: "clears_session",
  debugLane: { status: "live", rawCredentialsExposed: false },
};

const runtime = {
  status: "pass",
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
};

const personMetrics = {
  lowConfidenceCount: 0,
  hydrationGaps: [],
  debugLane: {
    lowConfidenceMetrics: 0,
  },
  metricStatus: {
    auth_runtime_events: {
      mapped: true,
      hydrated: true,
      confidence: 84,
      confidenceStatus: "high",
    },
  },
};

describe("auth readiness lock", () => {
  it("passes when all auth phase reports are mapped and privacy-safe", () => {
    const report = buildAuthReadinessLockReport({
      currentHead: "head",
      generatedAtUtc: "2026-05-24T10:00:00.000Z",
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
    expect(report.emailPasswordAuthStatus.status).toBe("pass");
    expect(report.authTelemetryStatus.status).toBe("pass");
    expect(report.adminDebugStatus.status).toBe("pass");
    expect(report.personMetricsStatus.status).toBe("pass");
    expect(Object.keys(report.scoreDimensions)).toEqual([...AUTH_READINESS_SCORE_DIMENSIONS]);
    expect(validateAuthReadinessLockReport(report)).toEqual([]);
  });

  it("fails when provider conflicts, telemetry, or privacy checks are missing", () => {
    const report = buildAuthReadinessLockReport({
      currentHead: "head",
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
          debugLane: { ...runtime.debugLane, rawPiiExposed: true },
          privacy: { ...runtime.privacy, rawFirebaseTokenLogged: true },
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
    expect(failures).toContain("Raw PII or token exposure is not allowed in auth readiness lock.");
    expect(failures).toContain("Dirty files include unclassified or forbidden auth-lock scope.");
  });
});
