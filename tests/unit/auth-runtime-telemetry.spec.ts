import { describe, expect, it } from "vitest";

import {
  AUTH_RUNTIME_PERSON_METRICS,
  AUTH_RUNTIME_TELEMETRY_EVENTS,
  buildAuthRuntimeDebugLane,
  buildAuthRuntimeEventEnvelope,
  buildAuthRuntimeTelemetry,
  buildAuthRuntimeTelemetryReport,
} from "@/lib/auth/auth-telemetry-contract";

describe("auth runtime telemetry contract", () => {
  it("defines the required auth runtime event families", () => {
    expect(AUTH_RUNTIME_TELEMETRY_EVENTS).toContain("auth_google_started");
    expect(AUTH_RUNTIME_TELEMETRY_EVENTS).toContain("auth_email_login_completed");
    expect(AUTH_RUNTIME_TELEMETRY_EVENTS).toContain("auth_email_signup_failed");
    expect(AUTH_RUNTIME_TELEMETRY_EVENTS).toContain("auth_provider_conflict_detected");
    expect(AUTH_RUNTIME_TELEMETRY_EVENTS).toContain("auth_session_restored");
    expect(AUTH_RUNTIME_TELEMETRY_EVENTS).toContain("auth_unexpected_session_drop");
    expect(AUTH_RUNTIME_TELEMETRY_EVENTS).toContain("auth_profile_bootstrap_failed");
    expect(AUTH_RUNTIME_PERSON_METRICS).toContain("navigation_session_failures");
  });

  it("builds redacted telemetry without raw credential flags", () => {
    const event = buildAuthRuntimeTelemetry({
      eventName: "auth_email_login_failed",
      method: "email_password",
      failureCode: "auth/invalid-credential",
      metadata: {
        emailHash: "email_redacted_hash",
      },
    });

    expect(event.eventName).toBe("auth_email_login_failed");
    expect(event.params.piiRedacted).toBe(true);
    expect(event.params.passwordIncluded).toBe(false);
    expect(event.params.rawEmailIncluded).toBe(false);
    expect(event.params.rawFirebaseTokenIncluded).toBe(false);
    expect(JSON.stringify(event.params)).not.toContain("password_value");
    expect(JSON.stringify(event.params)).not.toContain("firebase_token_value");
  });

  it("maps auth events through canonical envelopes", () => {
    const envelope = buildAuthRuntimeEventEnvelope({
      eventName: "auth_provider_conflict_detected",
      method: "email_password",
      conflictKind: "google_account_email_password_attempt",
    });

    expect(envelope.eventName).toBe("auth_provider_conflict_detected");
    expect(envelope.pipelineStatus).toBe("normal");
    expect(envelope.featureId).toBe("auth");
    expect(envelope.debugVisibility).toBe("debug_visible");
    expect(envelope.privacyClass).toBe("required_integrity");
    expect(envelope.metadata.emailHash).toBeUndefined();
  });

  it("exposes a compact auth runtime debug lane", () => {
    const lane = buildAuthRuntimeDebugLane({
      signupAttempts: 3,
      loginAttempts: 4,
      providerConflictCount: 1,
      navigationSessionFailureCount: 1,
    });

    expect(lane.laneId).toBe("auth_runtime");
    expect(lane.status).toBe("degraded");
    expect(lane.rawPiiExposed).toBe(false);
    expect(lane.rawTokensExposed).toBe(false);
    expect(lane.rawDetailsCollapsedByDefault).toBe(true);
  });

  it("builds a passing source-wired report", () => {
    const report = buildAuthRuntimeTelemetryReport({
      generatedAtUtc: "2026-05-24T00:00:00.000Z",
      currentHead: "test",
    });

    expect(report.status).toBe("pass");
    expect(report.featureRegistrationStatus).toBe("mapped");
    expect(report.eventEnvelopeStatus).toBe("mapped");
    expect(report.personMetricsStatus).toBe("mapped");
    expect(report.personMetrics.provider_conflicts.personMetricId).toBe("auth_runtime_events");
    expect(report.validationFailures).toEqual([]);
  });
});
