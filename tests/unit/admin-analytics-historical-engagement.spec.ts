import { describe, expect, it } from "vitest";

import { buildHistoricalEngagementAnalytics } from "@/lib/server/admin-analytics-historical-engagement";
import type { TelemetryLogRecord } from "@/lib/server/admin-analytics-shared";

function record(
  eventName: string,
  params: Record<string, unknown>,
  timestamp: number,
): TelemetryLogRecord {
  return {
    eventName,
    params,
    userId: "user_auth",
    timestamp,
  };
}

function buildInput(records: TelemetryLogRecord[]) {
  const telemetryLogsByEvent = records.reduce<Record<string, TelemetryLogRecord[]>>((accumulator, item) => {
    accumulator[item.eventName] = [...(accumulator[item.eventName] ?? []), item];
    return accumulator;
  }, {});

  return {
    telemetryLogs: records,
    telemetryLogsByEvent,
    eventsData: {},
    onboardingDurationMsSamples: [],
    emailRegistrationCount: 0,
    canonicalRegistrationCount: 0,
    generatedAtUtc: "2026-05-14T12:00:00.000Z",
    range: "7d",
  };
}

describe("buildHistoricalEngagementAnalytics auth outcomes", () => {
  it("groups canonical auth attempts by provider and reads safe failure-code variants", () => {
    const records = [
      record("auth_attempt_started", {
        authAttemptId: "email_1",
        provider: "password",
        startedAtUtc: "2026-05-14T11:00:00.000Z",
      }, 1_000),
      record("auth_attempt_failed", {
        authAttemptId: "email_1",
        provider: "password",
        error_code: "auth/wrong-password",
        finishedAtUtc: "2026-05-14T11:00:04.000Z",
        durationMs: 4_000,
      }, 5_000),
      record("auth_attempt_started", {
        authAttemptId: "google_1",
        authProvider: "google",
        startedAtUtc: "2026-05-14T11:05:00.000Z",
      }, 6_000),
      record("auth_attempt_succeeded", {
        authAttemptId: "google_1",
        authProvider: "google",
        finishedAtUtc: "2026-05-14T11:05:02.000Z",
        durationMs: 2_000,
      }, 8_000),
    ];

    const result = buildHistoricalEngagementAnalytics(buildInput(records));

    expect(result.authOutcomeSummary.sourceMode).toBe("canonical_attempt_chain");
    const emailMethod = result.authOutcomeSummary.methods.find((method) => method.method === "email_sign_in");
    const googleMethod = result.authOutcomeSummary.methods.find((method) => method.method === "google_sign_in");

    expect(emailMethod).toEqual(expect.objectContaining({
      attempts: 1,
      successes: 0,
      failures: 1,
    }));
    expect(emailMethod?.failureBreakdown[0]?.failureCode).toBe("auth/wrong-password");
    expect(googleMethod).toEqual(expect.objectContaining({
      attempts: 1,
      successes: 1,
      failures: 0,
    }));
  });

  it("marks missing canonical failure code as unavailable instead of fabricating a reason", () => {
    const records = [
      record("auth_attempt_failed", {
        authAttemptId: "email_2",
        method: "email_sign_in",
      }, 10_000),
    ];

    const result = buildHistoricalEngagementAnalytics(buildInput(records));
    const emailMethod = result.authOutcomeSummary.methods.find((method) => method.method === "email_sign_in");

    expect(result.authOutcomeSummary.sourceMode).toBe("canonical_attempt_chain");
    expect(emailMethod?.failureBreakdown[0]?.failureCode).toBe("failure_code_unavailable");
  });
});
